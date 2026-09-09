import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & { method?: string };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

/**
 * GET /api/book-config-check
 * Safe diagnostics — never returns secret values.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false });
  }

  const sa = (process.env.FIREBASE_SERVICE_ACCOUNT ?? "").trim();
  const paymongo = (process.env.PAYMONGO_SECRET_KEY ?? "").trim();
  const webhook = (process.env.PAYMONGO_WEBHOOK_SECRET ?? "").trim();
  const appUrl = (process.env.APP_URL ?? "").trim();

  const out: Record<string, unknown> = {
    ok: true,
    env: {
      FIREBASE_SERVICE_ACCOUNT: sa ? `present:${sa.length}` : "missing",
      FIREBASE_SERVICE_ACCOUNT_startsWithBrace: sa.startsWith("{"),
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
    admin: "not_tried",
  };

  if (!sa) {
    out.admin = "missing_service_account";
    return res.status(200).json(out);
  }

  let parsed: Record<string, unknown>;
  try {
    let raw: unknown = JSON.parse(sa);
    if (typeof raw === "string") raw = JSON.parse(raw);
    parsed = raw as Record<string, unknown>;
  } catch {
    out.admin = "bad_json";
    return res.status(200).json(out);
  }

  const projectId = String(parsed.project_id ?? "");
  const clientEmail = String(parsed.client_email ?? "");
  let privateKey = String(parsed.private_key ?? "").trim().replace(/\\n/g, "\n");
  out.env = {
    ...(out.env as object),
    serviceAccountFields: {
      project_id: Boolean(projectId),
      client_email: Boolean(clientEmail),
      private_key_pem: privateKey.includes("BEGIN PRIVATE KEY"),
    },
  };

  if (!projectId || !clientEmail || !privateKey.includes("BEGIN")) {
    out.admin = "bad_fields";
    return res.status(200).json(out);
  }

  try {
    const app =
      getApps().length > 0
        ? getApp()
        : initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
            projectId,
          });
    const db = getFirestore(app);
    const snap = await db.collection("consultations").limit(1).get();
    out.admin = "ok";
    out.firestore = { readable: true, sampleSize: snap.size };
  } catch (err) {
    out.admin = "init_failed";
    out.adminError = err instanceof Error ? err.message.slice(0, 180) : String(err).slice(0, 180);
  }

  return res.status(200).json(out);
}
