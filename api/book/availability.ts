import { getClientIp, noStore, sameOrigin, type VercelRequest, type VercelResponse } from "../_lib/http";

/**
 * GET /api/book/availability
 * Public busy slots only — no names or emails.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);

  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    if (req.headers.origin && !sameOrigin(req)) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    const { adminDb, adminInitError } = await import("../_lib/firebaseAdmin");
    const db = adminDb();
    if (!db) {
      console.error("[book/availability] admin unavailable:", adminInitError() ?? "missing-credentials");
      return res.status(503).json({ ok: false, error: "Booking is not configured" });
    }

    const snap = await db.collection("consultations").get();
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

    console.info("[book/availability]", { ip: getClientIp(req), count: busy.length });
    return res.status(200).json({ ok: true, busy });
  } catch (err) {
    console.error("[book/availability]", err instanceof Error ? err.message : String(err));
    return res.status(500).json({ ok: false, error: "Could not load availability" });
  }
}
