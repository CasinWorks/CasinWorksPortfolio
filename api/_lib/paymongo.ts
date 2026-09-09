import { createHmac } from "node:crypto";
import { env } from "./env";
import { safeEqualHex } from "./http";

const PAYMONGO_API = "https://api.paymongo.com";

/**
 * Secret API key — sk_test_… / sk_live_…
 *
 * Must live only in Vercel / .env.local. Never VITE_*, never returned to the browser,
 * never committed. Public keys (pk_*) are not required for Hosted Checkout.
 */
export function paymongoSecretKey(): string | null {
  const key = env("PAYMONGO_SECRET_KEY");
  if (!key) return null;
  if (key.startsWith("pk_")) {
    // Public key used as secret would expose the wrong credential pattern.
    console.error("[paymongo] PAYMONGO_SECRET_KEY must be sk_test_… or sk_live_…, not a public key");
    return null;
  }
  if (!key.startsWith("sk_test_") && !key.startsWith("sk_live_")) {
    console.error("[paymongo] PAYMONGO_SECRET_KEY has unexpected prefix");
    return null;
  }
  return key;
}

/** Per-endpoint signing secret from Developers → Webhooks (not the API secret). */
export function paymongoWebhookSecret(): string | null {
  const secret = env("PAYMONGO_WEBHOOK_SECRET");
  return secret || null;
}

export function isLiveSecret(secretKey: string) {
  return secretKey.startsWith("sk_live_");
}

function basicAuth(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`, "utf8").toString("base64")}`;
}

export type CheckoutLineItem = {
  name: string;
  amount: number; // centavos
  currency: "PHP";
  quantity: number;
  description?: string;
};

export type CreateCheckoutInput = {
  lineItems: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
  referenceNumber: string;
  description?: string;
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
};

export type CheckoutSessionResult = {
  id: string;
  checkoutUrl: string;
};

/**
 * Creates a Hosted Checkout session (v2). Secret key never leaves this process.
 * Amounts must already be trusted — callers compute them server-side.
 */
export async function createCheckoutSession(
  secretKey: string,
  input: CreateCheckoutInput,
): Promise<{ ok: true; session: CheckoutSessionResult } | { ok: false; status: number; error: string }> {
  const res = await fetch(`${PAYMONGO_API}/v2/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(secretKey),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: input.lineItems,
          payment_method_types: input.paymentMethodTypes ?? ["card", "gcash", "paymaya", "grab_pay", "qrph"],
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
    errors?: { detail?: string; code?: string }[];
  } | null;

  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail || json?.errors?.[0]?.code || "PayMongo request failed";
    // Never echo request auth or full payloads.
    console.error("[paymongo] checkout create failed", { status: res.status, detail });
    return { ok: false, status: res.status >= 400 && res.status < 600 ? res.status : 502, error: detail };
  }

  const id = json?.data?.id ?? "";
  const checkoutUrl = json?.data?.attributes?.checkout_url ?? "";
  if (!id || !checkoutUrl) {
    return { ok: false, status: 502, error: "Malformed PayMongo response" };
  }

  return { ok: true, session: { id, checkoutUrl } };
}

/**
 * Verify Paymongo-Signature: `t=…,te=…,li=…`
 * Signed payload is `${timestamp}.${rawBody}` HMAC-SHA256 with the webhook secret.
 * @see https://docs.paymongo.com/docs/developer-tools-webhook-setup-management
 */
export function verifyPaymongoSignature(opts: {
  rawBody: string;
  signatureHeader: string | undefined;
  webhookSecret: string;
  /** Reject if older than this many seconds (replay protection). */
  maxAgeSec?: number;
  liveMode?: boolean;
}): boolean {
  const header = opts.signatureHeader?.trim();
  if (!header || !opts.rawBody || !opts.webhookSecret) return false;

  const parts: Record<string, string> = {};
  for (const piece of header.split(",")) {
    const [k, ...rest] = piece.split("=");
    if (!k || rest.length === 0) continue;
    parts[k.trim()] = rest.join("=").trim();
  }

  const t = parts.t;
  if (!t || !/^\d+$/.test(t)) return false;

  const maxAge = opts.maxAgeSec ?? 300;
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
  if (ageSec > maxAge) return false;

  const expected = createHmac("sha256", opts.webhookSecret)
    .update(`${t}.${opts.rawBody}`, "utf8")
    .digest("hex");

  const live = opts.liveMode === true;
  const candidate = live ? parts.li : parts.te;
  // Some dashboards only populate one side; accept either matching signature.
  const matchesTe = parts.te ? safeEqualHex(expected, parts.te) : false;
  const matchesLi = parts.li ? safeEqualHex(expected, parts.li) : false;
  if (candidate) return safeEqualHex(expected, candidate);
  return matchesTe || matchesLi;
}

/** PHP → PayMongo centavos (amount is integer centavos). */
export function phpToCentavos(php: number): number {
  return Math.round(php * 100);
}
