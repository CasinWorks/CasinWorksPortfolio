import { createSign } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & {
  method?: string;
  headers: IncomingMessage["headers"] & {
    authorization?: string;
    origin?: string;
    host?: string;
  };
};
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

/**
 * GET /api/google-calendar-status
 * Admin-only: whether Google Calendar env creds can refresh a token.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const uid = await verifyIdToken(req.headers.authorization);
    if (!uid) return res.status(401).json({ ok: false, error: "Sign in required" });

    const sa = loadServiceAccount();
    if (!sa) return res.status(503).json({ ok: false, connected: false, error: "Server is not configured" });

    const fsToken = await getFirestoreAccessToken(sa);
    const role = await getUserRole(sa.project_id, fsToken, uid);
    if (role !== "admin") return res.status(403).json({ ok: false, error: "Admin only" });

    const gcal = googleCalendarCreds();
    if (!gcal) {
      return res.status(200).json({
        ok: true,
        connected: false,
        hint: "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN. Run: npm run google-calendar-oauth",
      });
    }

    try {
      await refreshGoogleAccessToken(gcal);
      return res.status(200).json({
        ok: true,
        connected: true,
        calendarId: gcal.calendarId,
      });
    } catch (err) {
      return res.status(200).json({
        ok: true,
        connected: false,
        error: err instanceof Error ? err.message : "Token refresh failed",
        hint: "Re-run npm run google-calendar-oauth and update GOOGLE_REFRESH_TOKEN on Vercel.",
      });
    }
  } catch (err) {
    console.error("[google-calendar-status]", err instanceof Error ? err.message : String(err));
    return res.status(500).json({ ok: false, connected: false, error: "Status check failed" });
  }
}

function env(name: string) {
  return (process.env[name] ?? "").trim();
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

function googleCalendarCreds(): { clientId: string; clientSecret: string; refreshToken: string; calendarId: string } | null {
  const clientId = env("GOOGLE_CLIENT_ID");
  const clientSecret = env("GOOGLE_CLIENT_SECRET");
  const refreshToken = env("GOOGLE_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) return null;
  return {
    clientId,
    clientSecret,
    refreshToken,
    calendarId: env("GOOGLE_CALENDAR_ID") || "primary",
  };
}

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
    return json.users?.[0]?.localId || null;
  } catch {
    return null;
  }
}

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getFirestoreAccessToken(sa: ServiceAccount): Promise<string> {
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
  if (!res.ok || !json.access_token) throw new Error("firestore_token_failed");
  return json.access_token;
}

async function refreshGoogleAccessToken(creds: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error || "google_token_failed");
  }
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

async function getUserRole(projectId: string, token: string, uid: string): Promise<string | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore_user_${res.status}`);
  const json = (await res.json()) as { fields?: Record<string, Record<string, unknown>> };
  const data = decodeFields(json.fields);
  return data.role ? String(data.role) : null;
}
