import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";

type VercelRequest = IncomingMessage & {
  method?: string;
  headers: IncomingMessage["headers"] & {
    origin?: string;
    host?: string;
    "x-forwarded-for"?: string;
  };
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

/**
 * GET /api/book-availability
 * Self-contained (no local relative imports) so Vercel NFT always bundles it.
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
    if (!db) {
      return res.status(503).json({ ok: false, error: "Booking is not configured" });
    }

    const snap = await db.collection("consultations").get();
    const busy = snap.docs
      .map((d: { data: () => Record<string, unknown> }) => d.data())
      .filter((row: Record<string, unknown>) => {
        const status = String(row.status ?? "");
        return status === "requested" || status === "confirmed";
      })
      .map((row: Record<string, unknown>) => ({
        startsAt: String(row.startsAt ?? ""),
        hours: Number(row.hours ?? 1),
      }))
      .filter((row: { startsAt: string; hours: number }) => row.startsAt && row.hours >= 1);

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
  key = key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  return key;
}

function getAdminDb() {
  try {
    const require = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = require("firebase-admin") as typeof import("firebase-admin");
    if (!admin.apps.length) {
      const blob = env("FIREBASE_SERVICE_ACCOUNT");
      if (!blob) {
        console.error("[book-availability] missing FIREBASE_SERVICE_ACCOUNT");
        return null;
      }
      let parsed: Record<string, unknown> = JSON.parse(blob);
      if (typeof (parsed as unknown) === "string") {
        parsed = JSON.parse(parsed as unknown as string);
      }
      const projectId = String(parsed.project_id ?? "");
      const clientEmail = String(parsed.client_email ?? "");
      const privateKey = normalizePrivateKey(String(parsed.private_key ?? ""));
      if (!projectId || !clientEmail || !privateKey.includes("BEGIN")) {
        console.error("[book-availability] invalid FIREBASE_SERVICE_ACCOUNT");
        return null;
      }
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
    }
    return admin.firestore();
  } catch (err) {
    console.error(
      "[book-availability] admin init failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

// Keep timingSafeEqual referenced so crypto stays available if we extend this file.
void timingSafeEqual;
