import { env } from "../_lib/env";
import { adminDb, verifyIdToken } from "../_lib/firebaseAdmin";
import { getClientIp, noStore, sameOrigin, type VercelRequest, type VercelResponse } from "../_lib/http";
import {
  createCheckoutSession,
  paymongoSecretKey,
  phpToCentavos,
} from "../_lib/paymongo";

type CheckoutPayload = {
  hours?: unknown;
  consultationId?: unknown;
  successPath?: unknown;
  cancelPath?: unknown;
};

const ALLOWED_HOURS = new Set([1, 2, 3]);

/**
 * POST /api/paymongo/checkout
 *
 * Creates a PayMongo Hosted Checkout session for exploratory consultation.
 * - Secret key stays on the server (PAYMONGO_SECRET_KEY).
 * - Caller must present a Firebase ID token.
 * - Amount is computed here — the client cannot set the peso total.
 * - consultationId must belong to the signed-in user.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (req.headers.origin && !sameOrigin(req)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const secretKey = paymongoSecretKey();
  if (!secretKey) {
    console.error("[paymongo/checkout] missing or invalid PAYMONGO_SECRET_KEY");
    return res.status(503).json({ ok: false, error: "Payments are not configured" });
  }

  const uid = await verifyIdToken(req.headers.authorization);
  if (!uid) {
    return res.status(401).json({ ok: false, error: "Sign in required" });
  }

  const body = (typeof req.body === "string" ? safeParse(req.body) : req.body) as CheckoutPayload | null;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ ok: false, error: "Invalid request" });
  }

  const consultationId = typeof body.consultationId === "string" ? body.consultationId.trim() : "";
  if (!consultationId || consultationId.length > 128) {
    return res.status(400).json({ ok: false, error: "Missing consultation" });
  }

  const db = adminDb();
  if (!db) {
    console.error("[paymongo/checkout] firebase admin not configured");
    return res.status(503).json({ ok: false, error: "Payments are not configured" });
  }

  const consultSnap = await db.collection("consultations").doc(consultationId).get();
  if (!consultSnap.exists) {
    return res.status(404).json({ ok: false, error: "Consultation not found" });
  }
  const consult = consultSnap.data() as Record<string, unknown>;
  if (String(consult.clientUid ?? "") !== uid) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  if (String(consult.status ?? "") === "cancelled") {
    return res.status(400).json({ ok: false, error: "Consultation was cancelled" });
  }
  if (String(consult.paymentStatus ?? "") === "paid") {
    return res.status(400).json({ ok: false, error: "Already paid" });
  }

  const hours = Number(consult.hours ?? body.hours);
  if (!ALLOWED_HOURS.has(hours)) {
    return res.status(400).json({ ok: false, error: "Hours must be 1, 2, or 3" });
  }

  const ratePhp = Number(env("EXPLORATORY_CONSULTATION_RATE_PHP") || "1000");
  if (!Number.isFinite(ratePhp) || ratePhp <= 0) {
    return res.status(503).json({ ok: false, error: "Payments are not configured" });
  }

  const totalPhp = hours * ratePhp;
  const amount = phpToCentavos(totalPhp);
  const siteUrl = (env("APP_URL") || env("SITE_URL") || "https://www.casinworks.com").replace(/\/$/, "");

  const successPath =
    typeof body.successPath === "string" && body.successPath.startsWith("/portal/")
      ? body.successPath
      : `/portal/book?paid=1&c=${encodeURIComponent(consultationId)}`;
  const cancelPath =
    typeof body.cancelPath === "string" && body.cancelPath.startsWith("/portal/")
      ? body.cancelPath
      : `/portal/book?paid=0&c=${encodeURIComponent(consultationId)}`;

  const referenceNumber = `consult-${consultationId.slice(0, 12)}-${Date.now()}`;

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
    successUrl: `${siteUrl}${successPath}`,
    cancelUrl: `${siteUrl}${cancelPath}`,
    referenceNumber,
    description: "CasinWorks exploratory consultation",
    metadata: {
      kind: "exploratory_consultation",
      uid,
      hours: String(hours),
      ratePhp: String(ratePhp),
      totalPhp: String(totalPhp),
      consultationId,
    },
  });

  if (created.ok === false) {
    const status = created.status === 401 || created.status === 403 ? 502 : created.status;
    return res.status(status).json({
      ok: false,
      error: "Could not start checkout",
    });
  }

  await consultSnap.ref.update({
    amountPhp: totalPhp,
    paymentStatus: "pending",
    paymongoSessionId: created.session.id,
    paymongoReference: referenceNumber,
  });

  console.info("[paymongo/checkout] session created", {
    uid,
    hours,
    consultationId,
    referenceNumber,
    sessionId: created.session.id,
    ip: getClientIp(req),
  });

  return res.status(200).json({
    ok: true,
    checkoutUrl: created.session.checkoutUrl,
    sessionId: created.session.id,
    referenceNumber,
    amountPhp: totalPhp,
  });
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
