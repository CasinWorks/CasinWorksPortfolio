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
 * Backup when PayMongo redirects to /book/complete before the webhook lands.
 * Verifies the checkout session is paid via PayMongo API, then marks Firestore.
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

    if (String(consult.paymentStatus ?? "") === "paid") {
      return res.status(200).json({ ok: true, paymentStatus: "paid", already: true });
    }

    const sessionId = String(consult.paymongoSessionId ?? "");
    if (!sessionId) {
      return res.status(409).json({ ok: false, error: "No checkout session on this booking" });
    }

    const session = await fetchPaymongoSession(secretKey, sessionId);
    if (!session.paid) {
      return res.status(200).json({ ok: true, paymentStatus: "pending", paid: false });
    }

    const paidAt = new Date().toISOString();
    await patchDocument(sa.project_id, token, "consultations", consultationId, {
      paymentStatus: "paid",
      paidAt,
      ...(session.reference ? { paymongoReference: session.reference } : {}),
    });

    return res.status(200).json({ ok: true, paymentStatus: "paid", paid: true });
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
  const paid = status === "paid" || paymentPaid;
  return { paid, reference: String(attrs?.reference_number ?? "") };
}
