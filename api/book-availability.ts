import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & {
  method?: string;
  headers: IncomingMessage["headers"] & {
    origin?: string;
    host?: string;
  };
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

/**
 * GET /api/book-availability
 * Static firebase-admin imports so Vercel bundles the dependency.
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

    const db = getAdminDb();
    if (!db.ok) {
      console.error("[book-availability]", db.reason);
      return res.status(503).json({
        ok: false,
        error: "Booking is not configured",
        reason: db.reason,
      });
    }

    const snap = await db.db.collection("consultations").get();
    const busy = snap.docs
      .map((d) => d.data())
      .filter((row) => {
        const status = String(row.status ?? "");
        return status === "requested" || status === "confirmed";
      })
      .map((row) => ({
        startsAt: String(row.startsAt ?? ""),
        hours: Number(row.hours ?? 1),
      }))
      .filter((row) => row.startsAt && row.hours >= 1);

    return res.status(200).json({ ok: true, busy });
  } catch (err) {
    console.error("[book-availability]", err instanceof Error ? err.message : String(err));
    return res.status(500).json({ ok: false, error: "Could not load availability" });
  }
}

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

function getAdminDb():
  | { ok: true; db: ReturnType<typeof getFirestore> }
  | { ok: false; reason: string } {
  const blob = env("FIREBASE_SERVICE_ACCOUNT");
  if (!blob) return { ok: false, reason: "missing_service_account" };

  let parsed: Record<string, unknown>;
  try {
    let raw: unknown = JSON.parse(blob);
    if (typeof raw === "string") raw = JSON.parse(raw);
    parsed = raw as Record<string, unknown>;
  } catch {
    return { ok: false, reason: "bad_service_account_json" };
  }

  const projectId = String(parsed.project_id ?? "");
  const clientEmail = String(parsed.client_email ?? "");
  const privateKey = normalizePrivateKey(String(parsed.private_key ?? ""));
  if (!projectId || !clientEmail || !privateKey.includes("BEGIN")) {
    return { ok: false, reason: "bad_service_account_fields" };
  }

  try {
    const app =
      getApps().length > 0
        ? getApp()
        : initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
            projectId,
          });
    return { ok: true, db: getFirestore(app) };
  } catch (err) {
    console.error(
      "[book-availability] admin init failed:",
      err instanceof Error ? err.message : String(err),
    );
    return { ok: false, reason: "admin_init_failed" };
  }
}
