import { noStore, readRawBody, safeJsonParse, type VercelRequest, type VercelResponse } from "../../server/lib/http";
import {
  isLiveSecret,
  paymongoSecretKey,
  paymongoWebhookSecret,
  verifyPaymongoSignature,
} from "../../server/lib/paymongo";

/**
 * POST /api/paymongo/webhook
 *
 * PayMongo → CasinWorks. Signature is verified before any Firestore write.
 * Register: https://www.casinworks.com/api/paymongo/webhook
 * Events: checkout_session.payment.paid, payment.paid
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const webhookSecret = paymongoWebhookSecret();
  if (!webhookSecret) {
    console.error("[paymongo/webhook] missing PAYMONGO_WEBHOOK_SECRET");
    return res.status(503).json({ ok: false, error: "Webhook not configured" });
  }

  const rawBody = await readRawBody(req);
  const signatureHeader = req.headers["paymongo-signature"];

  const secretKey = paymongoSecretKey();
  const liveMode = secretKey ? isLiveSecret(secretKey) : envLiveHint();

  if (
    !verifyPaymongoSignature({
      rawBody,
      signatureHeader: typeof signatureHeader === "string" ? signatureHeader : undefined,
      webhookSecret,
      liveMode,
      maxAgeSec: 300,
    })
  ) {
    console.warn("[paymongo/webhook] signature verification failed");
    return res.status(401).json({ ok: false, error: "Invalid signature" });
  }

  const payload = safeJsonParse(rawBody) as {
    data?: {
      id?: string;
      attributes?: {
        type?: string;
        data?: {
          id?: string;
          attributes?: Record<string, unknown>;
        };
      };
    };
  } | null;

  if (!payload) {
    return res.status(400).json({ ok: false, error: "Invalid payload" });
  }

  const eventType = payload.data?.attributes?.type ?? "";
  const resource = payload.data?.attributes?.data;
  const resourceId = resource?.id ?? "";
  const attrs = (resource?.attributes ?? {}) as Record<string, unknown>;

  try {
    await recordEvent({
      eventId: payload.data?.id ?? "",
      eventType,
      resourceId,
      attrs,
    });
  } catch (err) {
    console.error("[paymongo/webhook] handler error", {
      eventType,
      resourceId,
      err: err instanceof Error ? err.message : String(err),
    });
    return res.status(500).json({ ok: false, error: "Processing failed" });
  }

  return res.status(200).json({ ok: true });
}

function envLiveHint() {
  const key = (process.env.PAYMONGO_SECRET_KEY ?? "").trim();
  return key.startsWith("sk_live_");
}

async function recordEvent(input: {
  eventId: string;
  eventType: string;
  resourceId: string;
  attrs: Record<string, unknown>;
}) {
  const { adminDb } = await import("../../server/lib/firebaseAdmin");
  const db = adminDb();
  if (!db) {
    console.error("[paymongo/webhook] firebase admin not configured — event accepted but not stored");
    return;
  }

  if (input.eventId) {
    const ref = db.collection("paymongo_events").doc(input.eventId);
    const existing = await ref.get();
    if (existing.exists) return;
  }

  const paidEvents = new Set([
    "checkout_session.payment.paid",
    "payment.paid",
    "link.payment.paid",
  ]);

  const metadata = (input.attrs.metadata as Record<string, string> | undefined) ?? {};
  const reference =
    (typeof input.attrs.reference_number === "string" && input.attrs.reference_number) ||
    (typeof input.attrs.external_reference_number === "string" && input.attrs.external_reference_number) ||
    "";

  if (paidEvents.has(input.eventType)) {
    const consultationId = String(metadata.consultationId ?? "").trim();
    const paidAt = new Date().toISOString();

    await db.collection("paymongo_payments").doc(input.resourceId || input.eventId || reference).set(
      {
        eventType: input.eventType,
        referenceNumber: reference,
        status: "paid",
        kind: metadata.kind ?? "",
        uid: metadata.uid ?? "",
        hours: metadata.hours ?? "",
        totalPhp: metadata.totalPhp ?? "",
        consultationId,
        paidAt,
        resourceId: input.resourceId,
      },
      { merge: true },
    );

    if (consultationId) {
      await db.collection("consultations").doc(consultationId).set(
        {
          paymentStatus: "paid",
          paidAt,
          paymongoReference: reference || undefined,
          amountPhp: metadata.totalPhp ? Number(metadata.totalPhp) : undefined,
        },
        { merge: true },
      );
    } else if (reference.startsWith("consult-")) {
      // Fallback: find by paymongoReference if metadata was stripped.
      const snap = await db.collection("consultations").where("paymongoReference", "==", reference).limit(1).get();
      if (!snap.empty) {
        await snap.docs[0].ref.set({ paymentStatus: "paid", paidAt }, { merge: true });
      }
    }
  }

  if (input.eventId) {
    await db.collection("paymongo_events").doc(input.eventId).set({
      eventType: input.eventType,
      resourceId: input.resourceId,
      receivedAt: new Date().toISOString(),
      attrs: sanitizeAttrs(input.attrs),
    });
  }
}

function sanitizeAttrs(attrs: Record<string, unknown>) {
  const keep: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "payments" || k === "payment_intent" || k === "metadata" || k === "reference_number" || k === "status") {
      keep[k] = v;
    }
  }
  return keep;
}
