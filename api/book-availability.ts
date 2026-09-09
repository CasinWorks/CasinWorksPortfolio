import { createSign } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & {
  method?: string;
  headers: IncomingMessage["headers"] & { origin?: string; host?: string };
};
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

/**
 * GET /api/book-availability
 * Uses Firestore REST (no firebase-admin — that package crashes on this Vercel runtime).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
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

    const sa = loadServiceAccount();
    if (!sa.ok) {
      return res.status(503).json({ ok: false, error: "Booking is not configured", reason: sa.reason });
    }

    const token = await getAccessToken(sa.value);
    const docs = await listCollection(sa.value.project_id, token, "consultations");
    const busy = docs
      .map((row) => ({
        status: String(row.status ?? ""),
        startsAt: String(row.startsAt ?? ""),
        hours: Number(row.hours ?? 1),
      }))
      .filter((row) => row.status === "requested" || row.status === "confirmed")
      .filter((row) => row.startsAt && row.hours >= 1)
      .map((row) => ({ startsAt: row.startsAt, hours: row.hours }));

    return res.status(200).json({ ok: true, busy });
  } catch (err) {
    console.error("[book-availability]", err instanceof Error ? err.message : String(err));
    return res.status(500).json({ ok: false, error: "Could not load availability" });
  }
}

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

function loadServiceAccount(): { ok: true; value: ServiceAccount } | { ok: false; reason: string } {
  const blob = env("FIREBASE_SERVICE_ACCOUNT");
  if (!blob) return { ok: false, reason: "missing_service_account" };
  try {
    let raw: unknown = JSON.parse(blob);
    if (typeof raw === "string") raw = JSON.parse(raw);
    const row = raw as Record<string, unknown>;
    const project_id = String(row.project_id ?? "");
    const client_email = String(row.client_email ?? "");
    let private_key = String(row.private_key ?? "").trim();
    if ((private_key.startsWith('"') && private_key.endsWith('"')) || (private_key.startsWith("'") && private_key.endsWith("'"))) {
      private_key = private_key.slice(1, -1);
    }
    private_key = private_key.replace(/\\n/g, "\n");
    if (!project_id || !client_email || !private_key.includes("BEGIN")) {
      return { ok: false, reason: "bad_service_account_fields" };
    }
    return { ok: true, value: { project_id, client_email, private_key } };
  } catch {
    return { ok: false, reason: "bad_service_account_json" };
  }
}

function b64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
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
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`token_exchange_failed:${json.error || res.status}`);
  }
  return json.access_token;
}

function decodeValue(v: Record<string, unknown>): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return Boolean(v.booleanValue);
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return String(v.timestampValue);
  if ("mapValue" in v) {
    const fields = (v.mapValue as { fields?: Record<string, Record<string, unknown>> }).fields ?? {};
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(fields)) out[k] = decodeValue(val);
    return out;
  }
  return null;
}

async function listCollection(projectId: string, token: string, collection: string) {
  const rows: Record<string, unknown>[] = [];
  let pageToken = "";
  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`,
    );
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json()) as {
      documents?: { fields?: Record<string, Record<string, unknown>> }[];
      nextPageToken?: string;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json.error?.message || `firestore_list_${res.status}`);
    for (const doc of json.documents ?? []) {
      const row: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(doc.fields ?? {})) row[k] = decodeValue(v);
      rows.push(row);
    }
    pageToken = json.nextPageToken ?? "";
  } while (pageToken);
  return rows;
}
