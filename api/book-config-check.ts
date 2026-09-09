import { createSign } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & { method?: string };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

/** GET /api/book-config-check — safe diagnostics, no secrets. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false });
  }

  const saBlob = (process.env.FIREBASE_SERVICE_ACCOUNT ?? "").trim();
  const paymongo = (process.env.PAYMONGO_SECRET_KEY ?? "").trim();
  const webhook = (process.env.PAYMONGO_WEBHOOK_SECRET ?? "").trim();
  const appUrl = (process.env.APP_URL ?? "").trim();

  const out: Record<string, unknown> = {
    ok: true,
    env: {
      FIREBASE_SERVICE_ACCOUNT: saBlob ? `present:${saBlob.length}` : "missing",
      PAYMONGO_SECRET_KEY: paymongo
        ? paymongo.startsWith("sk_test_")
          ? "present:test"
          : paymongo.startsWith("sk_live_")
            ? "present:live"
            : "present:unexpected_prefix"
        : "missing",
      PAYMONGO_WEBHOOK_SECRET: webhook ? `present:${webhook.length}` : "missing",
      APP_URL: appUrl || "missing",
    },
    firestore: "not_tried",
  };

  if (!saBlob) {
    out.firestore = "missing_service_account";
    return res.status(200).json(out);
  }

  try {
    let raw: unknown = JSON.parse(saBlob);
    if (typeof raw === "string") raw = JSON.parse(raw);
    const row = raw as Record<string, unknown>;
    const project_id = String(row.project_id ?? "");
    const client_email = String(row.client_email ?? "");
    let private_key = String(row.private_key ?? "").trim().replace(/\\n/g, "\n");
    if (!project_id || !client_email || !private_key.includes("BEGIN")) {
      out.firestore = "bad_fields";
      return res.status(200).json(out);
    }

    const now = Math.floor(Date.now() / 1000);
    const b64url = (s: string) =>
      Buffer.from(s).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claim = b64url(
      JSON.stringify({
        iss: client_email,
        sub: client_email,
        scope: "https://www.googleapis.com/auth/datastore",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    );
    const unsigned = `${header}.${claim}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsigned);
    const sig = signer.sign(private_key, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const jwt = `${unsigned}.${sig}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      out.firestore = "token_failed";
      out.firestoreError = tokenJson.error || `status_${tokenRes.status}`;
      return res.status(200).json(out);
    }

    const listRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${project_id}/databases/(default)/documents/consultations?pageSize=1`,
      { headers: { Authorization: `Bearer ${tokenJson.access_token}` } },
    );
    if (!listRes.ok) {
      const err = (await listRes.json().catch(() => null)) as { error?: { message?: string } } | null;
      out.firestore = "list_failed";
      out.firestoreError = err?.error?.message || `status_${listRes.status}`;
      return res.status(200).json(out);
    }

    out.firestore = "ok";
  } catch (err) {
    out.firestore = "failed";
    out.firestoreError = err instanceof Error ? err.message.slice(0, 180) : String(err).slice(0, 180);
  }

  return res.status(200).json(out);
}
