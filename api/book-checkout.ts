import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & {
  body?: unknown;
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

type GuestPayload = {
  email?: unknown;
  name?: unknown;
  startsAt?: unknown;
  hours?: unknown;
  notes?: unknown;
  website?: unknown;
};

const ALLOWED_HOURS = new Set([1, 2, 3]);
const PAYMONGO_API = "https://api.paymongo.com";

/**
 * POST /api/book-checkout
 * Self-contained guest checkout (no local relative imports).
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

    const ip = clientIp(req);
    if (!rateLimit(ip, { limit: 8, windowMs: 60_000 })) {
      return res.status(429).json({ ok: false, error: "Too many requests" });
    }

    const secretKey = paymongoSecretKey();
    const admin = await getAdminDb();
    if (!secretKey || !admin.ok) {
      console.error("[book-checkout] missing PayMongo or Firebase admin", {
        paymongo: Boolean(secretKey),
        admin: admin.ok ? "ok" : admin.reason,
      });
      return res.status(503).json({
        ok: false,
        error: "Booking is not configured",
        reason: !secretKey ? "missing_paymongo" : admin.ok ? "unknown" : admin.reason,
      });
    }
    const db = admin.db;

    const body = (typeof req.body === "string" ? safeParse(req.body) : req.body) as GuestPayload | null;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ ok: false, error: "Invalid request" });
    }

    if (typeof body.website === "string" && body.website.trim()) {
      return res.status(200).json({ ok: true, checkoutUrl: "https://www.casinworks.com/book" });
    }

    const email = clamp(body.email, 200).toLowerCase();
    const name = clamp(body.name, 120);
    const notes = clamp(body.notes, 4000);
    const startsAt = clamp(body.startsAt, 64);
    const hours = Number(body.hours);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

    const snap = await db.collection("consultations").get();
    const taken = snap.docs.some((d: { data: () => Record<string, unknown> }) => {
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
    const amount = Math.round(totalPhp * 100);
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

    if (!created.ok) {
      await consultRef.delete().catch(() => undefined);
      return res.status(502).json({ ok: false, error: "Could not start checkout" });
    }

    await consultRef.update({
      paymongoSessionId: created.session.id,
      paymongoReference: referenceNumber,
    });

    return res.status(200).json({
      ok: true,
      checkoutUrl: created.session.checkoutUrl,
      sessionId: created.session.id,
      consultationId: consultRef.id,
      amountPhp: totalPhp,
    });
  } catch (err) {
    console.error("[book-checkout]", err instanceof Error ? err.message : String(err));
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

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

function getAdminDb(): Promise<
  | { ok: true; db: AdminDb }
  | { ok: false; reason: string }
> {
  return (async () => {
    const blob = env("FIREBASE_SERVICE_ACCOUNT");
    if (!blob) return { ok: false as const, reason: "missing_service_account" };

    let parsed: Record<string, unknown>;
    try {
      let raw: unknown = JSON.parse(blob);
      if (typeof raw === "string") raw = JSON.parse(raw);
      parsed = raw as Record<string, unknown>;
    } catch {
      return { ok: false as const, reason: "bad_service_account_json" };
    }

    const projectId = String(parsed.project_id ?? "");
    const clientEmail = String(parsed.client_email ?? "");
    const privateKey = normalizePrivateKey(String(parsed.private_key ?? ""));
    if (!projectId || !clientEmail || !privateKey.includes("BEGIN")) {
      return { ok: false as const, reason: "bad_service_account_fields" };
    }

    try {
      const appMod = await import("firebase-admin/app");
      const fsMod = await import("firebase-admin/firestore");
      const app =
        appMod.getApps().length > 0
          ? appMod.getApp()
          : appMod.initializeApp({
              credential: appMod.cert({ projectId, clientEmail, privateKey }),
              projectId,
            });
      return { ok: true as const, db: fsMod.getFirestore(app) as unknown as AdminDb };
    } catch (err) {
      console.error(
        "[book-checkout] admin init failed:",
        err instanceof Error ? err.message : String(err),
      );
      return { ok: false as const, reason: "admin_init_failed" };
    }
  })();
}

type AdminDb = {
  collection: (name: string) => {
    get: () => Promise<{ docs: { data: () => Record<string, unknown> }[] }>;
    doc: () => {
      id: string;
      set: (data: Record<string, unknown>) => Promise<unknown>;
      update: (data: Record<string, unknown>) => Promise<unknown>;
      delete: () => Promise<unknown>;
    };
  };
};

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
    errors?: { detail?: string }[];
  } | null;

  if (!res.ok) {
    console.error("[book-checkout] paymongo failed", {
      status: res.status,
      detail: json?.errors?.[0]?.detail,
    });
    return { ok: false as const };
  }

  const id = json?.data?.id ?? "";
  const checkoutUrl = json?.data?.attributes?.checkout_url ?? "";
  if (!id || !checkoutUrl) return { ok: false as const };
  return { ok: true as const, session: { id, checkoutUrl } };
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

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function clientIp(req: VercelRequest) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  return "unknown";
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

// Silence unused import warnings while keeping crypto available for future webhook reuse.
void createHmac;
void timingSafeEqual;
