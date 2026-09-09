import type { IncomingMessage, ServerResponse } from "node:http";
import { createSign } from "node:crypto";

type VercelRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
  headers: IncomingMessage["headers"] & { origin?: string; host?: string };
};
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

/**
 * POST /api/book-confirm
 * Backup when PayMongo redirects to /book/confirmed before the webhook lands.
 * Verifies the checkout session is paid via PayMongo API, then marks Firestore.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        endpoint: "/api/book-confirm",
        hint: "POST JSON { consultationId } from the booking success page. Browser GET is not a payment.",
      });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }
    if (req.headers.origin && req.headers.host) {
      try {
        if (new URL(req.headers.origin).host !== req.headers.host) {
          return res.status(403).json({ ok: false, error: "Forbidden" });
        }
      } catch {
        return res.status(403).json({ ok: false, error: "Forbidden" });
      }
    }

    const body = (typeof req.body === "string" ? safeParse(req.body) : req.body) as {
      consultationId?: unknown;
    } | null;
    const consultationId =
      typeof body?.consultationId === "string" ? body.consultationId.trim() : "";
    if (!consultationId || consultationId.length > 128) {
      return res.status(400).json({ ok: false, error: "Missing consultation" });
    }

    const secretKey = paymongoSecretKey();
    const sa = loadServiceAccount();
    if (!secretKey || !sa) {
      return res.status(503).json({ ok: false, error: "Booking is not configured" });
    }

    const token = await getAccessToken(sa);
    const consult = await getConsultation(sa.project_id, token, consultationId);
    if (!consult) return res.status(404).json({ ok: false, error: "Consultation not found" });

    const detail = {
      startsAt: consult.startsAt ? String(consult.startsAt) : undefined,
      hours: consult.hours != null ? Number(consult.hours) : undefined,
      amountPhp: consult.amountPhp != null ? Number(consult.amountPhp) : undefined,
      email: consult.clientEmail ? String(consult.clientEmail) : undefined,
    };

    if (String(consult.paymentStatus ?? "") === "paid") {
      return res.status(200).json({ ok: true, paymentStatus: "paid", already: true, ...detail });
    }

    const sessionId = String(consult.paymongoSessionId ?? "");
    if (!sessionId) {
      return res.status(409).json({ ok: false, error: "No checkout session on this booking" });
    }

    const session = await fetchPaymongoSession(secretKey, sessionId);
    if (!session.paid) {
      return res.status(200).json({ ok: true, paymentStatus: "pending", paid: false, ...detail });
    }

    const paidAt = new Date().toISOString();
    await patchDocument(sa.project_id, token, "consultations", consultationId, {
      paymentStatus: "paid",
      paidAt,
      ...(session.reference ? { paymongoReference: session.reference } : {}),
    });

    if (!consult.paidEmailSentAt) {
      const emailed = await sendPaidBookingEmail({
        to: String(consult.clientEmail ?? ""),
        clientName: String(consult.clientName ?? "there"),
        startsAt: String(consult.startsAt ?? ""),
        hours: Number(consult.hours ?? 1),
        amountPhp: consult.amountPhp != null ? Number(consult.amountPhp) : undefined,
      });
      if (emailed) {
        await patchDocument(sa.project_id, token, "consultations", consultationId, {
          paidEmailSentAt: new Date().toISOString(),
        }).catch(() => undefined);
      }
    }

    return res.status(200).json({ ok: true, paymentStatus: "paid", paid: true, ...detail });
  } catch (err) {
    console.error("[book-confirm]", err instanceof Error ? err.message : String(err));
    return res.status(500).json({ ok: false, error: "Could not confirm payment" });
  }
}

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

function paymongoSecretKey(): string | null {
  const key = env("PAYMONGO_SECRET_KEY");
  if (!key || key.startsWith("pk_")) return null;
  if (!key.startsWith("sk_test_") && !key.startsWith("sk_live_")) return null;
  return key;
}

function loadServiceAccount(): ServiceAccount | null {
  const blob = env("FIREBASE_SERVICE_ACCOUNT");
  if (!blob) return null;
  try {
    let raw: unknown = JSON.parse(blob);
    if (typeof raw === "string") raw = JSON.parse(raw);
    const row = raw as Record<string, unknown>;
    const project_id = String(row.project_id ?? "");
    const client_email = String(row.client_email ?? "");
    const private_key = String(row.private_key ?? "").trim().replace(/\\n/g, "\n");
    if (!project_id || !client_email || !private_key.includes("BEGIN")) return null;
    return { project_id, client_email, private_key };
  } catch {
    return null;
  }
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(sa.private_key, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${unsigned}.${signature}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = (await res.json()) as { access_token?: string };
  if (!res.ok || !json.access_token) throw new Error("token_failed");
  return json.access_token;
}

function decodeFields(fields: Record<string, Record<string, unknown>> | undefined) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields ?? {})) {
    if ("stringValue" in v) out[k] = v.stringValue;
    else if ("integerValue" in v) out[k] = Number(v.integerValue);
    else if ("doubleValue" in v) out[k] = Number(v.doubleValue);
    else if ("booleanValue" in v) out[k] = Boolean(v.booleanValue);
  }
  return out;
}

async function getConsultation(projectId: string, token: string, id: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/consultations/${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore_get_${res.status}`);
  const json = (await res.json()) as { fields?: Record<string, Record<string, unknown>> };
  return decodeFields(json.fields);
}

function encodeValue(v: unknown): Record<string, unknown> {
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === "boolean") return { booleanValue: v };
  return { stringValue: String(v) };
}

async function patchDocument(
  projectId: string,
  token: string,
  collection: string,
  id: string,
  data: Record<string, unknown>,
) {
  const mask = Object.keys(data)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}?${mask}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encodeValue(v)])),
    }),
  });
  if (!res.ok) throw new Error(`firestore_patch_${res.status}`);
}

async function fetchPaymongoSession(secretKey: string, sessionId: string) {
  const res = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`, "utf8").toString("base64")}`,
      Accept: "application/json",
    },
  });
  const json = (await res.json().catch(() => null)) as {
    data?: {
      attributes?: {
        status?: string;
        payments?: { attributes?: { status?: string } }[];
        payment_intent?: { attributes?: { status?: string } } | string;
        reference_number?: string;
        metadata?: Record<string, string>;
      };
    };
  } | null;
  if (!res.ok) return { paid: false, reference: "" };
  const attrs = json?.data?.attributes;
  const status = String(attrs?.status ?? "");
  const payments = attrs?.payments ?? [];
  const paymentPaid = payments.some((p) => String(p.attributes?.status ?? "") === "paid");
  const pi = attrs?.payment_intent;
  const piStatus =
    typeof pi === "object" && pi && "attributes" in pi
      ? String(pi.attributes?.status ?? "")
      : "";
  // PayMongo often leaves checkout session status as "active" after a successful test pay;
  // the payments[] / payment_intent status is the reliable signal.
  const paid =
    status === "paid" ||
    status === "completed" ||
    paymentPaid ||
    piStatus === "succeeded";
  return { paid, reference: String(attrs?.reference_number ?? "") };
}

function formatWhen(iso: string) {
  if (!iso) return "your booked slot";
  try {
    return new Date(iso).toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function siteUrl() {
  return (env("APP_URL") || env("SITE_URL") || "https://www.casinworks.com").replace(/\/$/, "");
}

/** Best-effort Resend send. Returns true when Resend accepted the message. */
async function sendPaidBookingEmail(input: {
  to: string;
  clientName: string;
  startsAt: string;
  hours: number;
  amountPhp?: number;
}): Promise<boolean> {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM") || "CasinWorks <bookings@casinworks.com>";
  const notify = (env("BOOKING_NOTIFY_EMAIL") || "christianjoshuacasin@gmail.com").toLowerCase();
  const to = input.to.trim().toLowerCase();
  if (!apiKey || !to || !to.includes("@")) return false;

  const when = formatWhen(input.startsAt);
  const hoursLabel = `${input.hours} hour${input.hours === 1 ? "" : "s"}`;
  const amount =
    input.amountPhp != null && Number.isFinite(input.amountPhp)
      ? `₱${input.amountPhp.toLocaleString("en-US")}`
      : null;
  const subject = `Payment received — CasinWorks consultation`;
  const html = `
    <div style="font-family:Georgia,serif;color:#1a1a1a;line-height:1.5;max-width:520px">
      <p style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b">CasinWorks</p>
      <h1 style="font-size:28px;font-weight:600;margin:8px 0 12px">Payment received.</h1>
      <p>Hi ${escapeHtml(input.clientName || "there")},</p>
      <p>We received your payment for an exploratory consultation.</p>
      <p style="background:#f7f5f0;padding:14px 16px;border:1px solid rgba(0,0,0,0.08)">
        <strong>${escapeHtml(when)}</strong><br/>
        ${escapeHtml(hoursLabel)}${amount ? ` · ${escapeHtml(amount)}` : ""}
      </p>
      <p>CasinWorks will confirm the slot by hand. After confirmation you’ll get a Google Meet link by email and calendar invite.</p>
      <p><a href="${siteUrl()}/book/confirmed">View booking status</a> · <a href="${siteUrl()}/portal/register">Create a portal account</a> with this email to follow the engagement.</p>
      <p style="color:#64748b;font-size:13px">— Christian Joshua Casin</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        ...(notify && notify !== to ? { bcc: [notify] } : {}),
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[book-confirm] resend", res.status, errText.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[book-confirm] resend", err instanceof Error ? err.message : String(err));
    return false;
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
