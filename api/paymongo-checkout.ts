import { createSign } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
  headers: IncomingMessage["headers"] & {
    authorization?: string;
    origin?: string;
    host?: string;
    "x-forwarded-for"?: string;
  };
};
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

const ALLOWED_HOURS = new Set([1, 2, 3]);
const PAYMONGO_API = "https://api.paymongo.com";

/**
 * POST /api/paymongo-checkout
 * Portal (signed-in) exploratory consultation checkout.
 * Self-contained — no firebase-admin / server/lib imports.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
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

    const secretKey = paymongoSecretKey();
    if (!secretKey) {
      return res.status(503).json({ ok: false, error: "Payments are not configured" });
    }

    const uid = await verifyIdToken(req.headers.authorization);
    if (!uid) return res.status(401).json({ ok: false, error: "Sign in required" });

    const body = (typeof req.body === "string" ? safeParse(req.body) : req.body) as {
      hours?: unknown;
      consultationId?: unknown;
      successPath?: unknown;
      cancelPath?: unknown;
    } | null;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ ok: false, error: "Invalid request" });
    }

    const consultationId = typeof body.consultationId === "string" ? body.consultationId.trim() : "";
    if (!consultationId || consultationId.length > 128) {
      return res.status(400).json({ ok: false, error: "Missing consultation" });
    }

    const sa = loadServiceAccount();
    if (!sa) return res.status(503).json({ ok: false, error: "Payments are not configured" });

    const token = await getAccessToken(sa);
    const consult = await getConsultation(sa.project_id, token, consultationId);
    if (!consult) return res.status(404).json({ ok: false, error: "Consultation not found" });
    if (String(consult.clientUid ?? "") !== uid) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }
    if (String(consult.status ?? "") === "cancelled") {
      return res.status(400).json({ ok: false, error: "Consultation was cancelled" });
    }
    if (String(consult.paymentStatus ?? "") === "paid") {
      return res.status(400).json({ ok: false, error: "Already paid" });
    }

    const hours = Number(consult.hours ?? body.hours);
    if (!ALLOWED_HOURS.has(hours)) {
      return res.status(400).json({ ok: false, error: "Hours must be 1, 2, or 3" });
    }

    const ratePhp = Number(env("EXPLORATORY_CONSULTATION_RATE_PHP") || "1000");
    const totalPhp = hours * ratePhp;
    const amount = Math.round(totalPhp * 100);
    const siteUrl = (env("APP_URL") || env("SITE_URL") || "https://www.casinworks.com").replace(/\/$/, "");

    const successPath =
      typeof body.successPath === "string" && body.successPath.startsWith("/portal/")
        ? body.successPath
        : `/portal/book?paid=1&c=${encodeURIComponent(consultationId)}`;
    const cancelPath =
      typeof body.cancelPath === "string" && body.cancelPath.startsWith("/portal/")
        ? body.cancelPath
        : `/portal/book?paid=0&c=${encodeURIComponent(consultationId)}`;

    const referenceNumber = `consult-${consultationId.slice(0, 12)}-${Date.now()}`;

    const created = await createCheckoutSession(secretKey, {
      lineItems: [
        {
          name: "Exploratory consultation",
          description: `${hours} hour${hours === 1 ? "" : "s"} × ₱${ratePhp.toLocaleString("en-US")}/hr`,
          amount,
          currency: "PHP",
          quantity: 1,
        },
      ],
      successUrl: `${siteUrl}${successPath}`,
      cancelUrl: `${siteUrl}${cancelPath}`,
      referenceNumber,
      description: "CasinWorks exploratory consultation",
      metadata: {
        kind: "exploratory_consultation",
        uid,
        hours: String(hours),
        ratePhp: String(ratePhp),
        totalPhp: String(totalPhp),
        consultationId,
      },
    });

    if (!created.ok) {
      return res.status(502).json({ ok: false, error: "Could not start checkout" });
    }

    await patchDocument(sa.project_id, token, "consultations", consultationId, {
      amountPhp: totalPhp,
      paymentStatus: "pending",
      paymongoSessionId: created.session.id,
      paymongoReference: referenceNumber,
    });

    return res.status(200).json({
      ok: true,
      checkoutUrl: created.session.checkoutUrl,
      sessionId: created.session.id,
      referenceNumber,
      amountPhp: totalPhp,
    });
  } catch (err) {
    console.error("[paymongo-checkout]", err instanceof Error ? err.message : String(err));
    return res.status(500).json({ ok: false, error: "Could not start checkout" });
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

/** Verify Firebase ID token via Identity Toolkit (no firebase-admin). */
async function verifyIdToken(authorization: string | undefined): Promise<string | null> {
  const bearer = authorization ?? "";
  const idToken = bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : "";
  if (!idToken) return null;
  const apiKey = env("FIREBASE_API_KEY");
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    const json = (await res.json()) as { users?: { localId?: string }[] };
    const uid = json.users?.[0]?.localId;
    return uid || null;
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

async function createCheckoutSession(
  secretKey: string,
  input: {
    lineItems: {
      name: string;
      amount: number;
      currency: "PHP";
      quantity: number;
      description?: string;
    }[];
    successUrl: string;
    cancelUrl: string;
    referenceNumber: string;
    description?: string;
    metadata?: Record<string, string>;
  },
) {
  const res = await fetch(`${PAYMONGO_API}/v2/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`, "utf8").toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: input.lineItems,
          payment_method_types: ["card", "gcash", "paymaya", "grab_pay", "qrph"],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          reference_number: input.referenceNumber,
          description: input.description,
          send_email_receipt: true,
          metadata: input.metadata ?? {},
        },
      },
    }),
  });
  const json = (await res.json().catch(() => null)) as {
    data?: { id?: string; attributes?: { checkout_url?: string } };
  } | null;
  if (!res.ok) return { ok: false as const };
  const id = json?.data?.id ?? "";
  const checkoutUrl = json?.data?.attributes?.checkout_url ?? "";
  if (!id || !checkoutUrl) return { ok: false as const };
  return { ok: true as const, session: { id, checkoutUrl } };
}
