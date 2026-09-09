import { env } from "../../server/lib/env";
import { getClientIp, noStore, sameOrigin, type VercelResponse, type VercelRequest } from "../../server/lib/http";
import {
  createCheckoutSession,
  paymongoSecretKey,
  phpToCentavos,
} from "../../server/lib/paymongo";

type GuestPayload = {
  email?: unknown;
  name?: unknown;
  startsAt?: unknown;
  hours?: unknown;
  notes?: unknown;
  website?: unknown; // honeypot
};

const ALLOWED_HOURS = new Set([1, 2, 3]);

/**
 * POST /api/book/checkout
 *
 * Guest exploratory consultation: email + slot + concerns → PayMongo.
 * No Firebase sign-in. Consultation is created with Admin SDK (guest: true).
 * After payment, the success page invites them to register.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);

  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    if (req.headers.origin && !sameOrigin(req)) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    const ip = getClientIp(req);
    if (!rateLimit(ip, { limit: 8, windowMs: 60_000 })) {
      return res.status(429).json({ ok: false, error: "Too many requests" });
    }

    const secretKey = paymongoSecretKey();
    const { adminDb, adminInitError } = await import("../../server/lib/firebaseAdmin");
    const db = adminDb();
    if (!secretKey || !db) {
      console.error("[book/checkout] missing PayMongo or Firebase admin", {
        paymongo: Boolean(secretKey),
        admin: adminInitError() ?? (db ? "ok" : "missing-credentials"),
      });
      return res.status(503).json({ ok: false, error: "Booking is not configured" });
    }

    const body = (typeof req.body === "string" ? safeParse(req.body) : req.body) as GuestPayload | null;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ ok: false, error: "Invalid request" });
    }

    // Honeypot
    if (typeof body.website === "string" && body.website.trim()) {
      return res.status(200).json({ ok: true, checkoutUrl: "https://www.casinworks.com/book" });
    }

    const email = clamp(body.email, 200).toLowerCase();
    const name = clamp(body.name, 120);
    const notes = clamp(body.notes, 4000);
    const startsAt = clamp(body.startsAt, 64);
    const hours = Number(body.hours);

    if (!email || !isEmail(email)) {
      return res.status(400).json({ ok: false, error: "A valid email is required" });
    }
    if (!notes) {
      return res.status(400).json({ ok: false, error: "Tell us what you want to talk about" });
    }
    if (!ALLOWED_HOURS.has(hours)) {
      return res.status(400).json({ ok: false, error: "Hours must be 1, 2, or 3" });
    }
    const startMs = Date.parse(startsAt);
    if (!Number.isFinite(startMs) || startMs <= Date.now()) {
      return res.status(400).json({ ok: false, error: "Pick a future weekday slot" });
    }

    // Collision check
    const snap = await db.collection("consultations").get();
    const taken = snap.docs.some((d) => {
      const row = d.data();
      const status = String(row.status ?? "");
      if (status !== "requested" && status !== "confirmed") return false;
      return slotsOverlap(startsAt, hours, String(row.startsAt ?? ""), Number(row.hours ?? 1));
    });
    if (taken) {
      return res.status(409).json({ ok: false, error: "That slot was just taken. Pick another time." });
    }

    const ratePhp = Number(env("EXPLORATORY_CONSULTATION_RATE_PHP") || "1000");
    const totalPhp = hours * ratePhp;
    const amount = phpToCentavos(totalPhp);
    const siteUrl = (env("APP_URL") || env("SITE_URL") || "https://www.casinworks.com").replace(/\/$/, "");

    const consultRef = db.collection("consultations").doc();
    const referenceNumber = `guest-${consultRef.id.slice(0, 10)}-${Date.now()}`;

    await consultRef.set({
      clientUid: "",
      clientEmail: email,
      clientName: name || email,
      startsAt,
      hours,
      notes,
      status: "requested",
      paymentStatus: "pending",
      amountPhp: totalPhp,
      guest: true,
      createdAt: new Date().toISOString(),
    });

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
      successUrl: `${siteUrl}/book/complete?paid=1&c=${encodeURIComponent(consultRef.id)}&email=${encodeURIComponent(email)}`,
      cancelUrl: `${siteUrl}/book?paid=0&c=${encodeURIComponent(consultRef.id)}`,
      referenceNumber,
      description: "CasinWorks exploratory consultation",
      metadata: {
        kind: "exploratory_consultation",
        uid: "",
        hours: String(hours),
        ratePhp: String(ratePhp),
        totalPhp: String(totalPhp),
        consultationId: consultRef.id,
        email,
        guest: "1",
      },
    });

    if (created.ok === false) {
      await consultRef.delete().catch(() => undefined);
      return res.status(502).json({ ok: false, error: "Could not start checkout" });
    }

    await consultRef.update({
      paymongoSessionId: created.session.id,
      paymongoReference: referenceNumber,
    });

    console.info("[book/checkout] guest session", {
      consultationId: consultRef.id,
      hours,
      sessionId: created.session.id,
      ip,
    });

    return res.status(200).json({
      ok: true,
      checkoutUrl: created.session.checkoutUrl,
      sessionId: created.session.id,
      consultationId: consultRef.id,
      amountPhp: totalPhp,
    });
  } catch (err) {
    console.error("[book/checkout]", err instanceof Error ? err.message : String(err));
    return res.status(500).json({ ok: false, error: "Could not start checkout" });
  }
}

function slotsOverlap(aStart: string, aHours: number, bStart: string, bHours: number) {
  const a0 = Date.parse(aStart);
  const b0 = Date.parse(bStart);
  if (!Number.isFinite(a0) || !Number.isFinite(b0)) return false;
  const a1 = a0 + aHours * 60 * 60 * 1000;
  const b1 = b0 + bHours * 60 * 60 * 1000;
  return a0 < b1 && b0 < a1;
}

function clamp(v: unknown, max: number) {
  if (typeof v !== "string") return "";
  return v.replace(/\u0000/g, "").trim().slice(0, max);
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

const _rl: Map<string, { count: number; resetAt: number }> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((globalThis as any).__bookCheckoutRateLimit ??= new Map());

function rateLimit(key: string, opts: { limit: number; windowMs: number }) {
  const now = Date.now();
  const cur = _rl.get(key);
  if (!cur || cur.resetAt <= now) {
    _rl.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }
  if (cur.count >= opts.limit) return false;
  cur.count += 1;
  return true;
}
