import { createSign } from "node:crypto";
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

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

const ALLOWED_HOURS = new Set([1, 2, 3]);
const PAYMONGO_API = "https://api.paymongo.com";

/**
 * POST /api/book-checkout
 * Firestore REST + PayMongo — no firebase-admin.
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
    const sa = loadServiceAccount();
    if (!secretKey || !sa.ok) {
      return res.status(503).json({
        ok: false,
        error: "Booking is not configured",
        reason: !secretKey ? "missing_paymongo" : sa.ok ? "unknown" : sa.reason,
      });
    }

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
    if (!notes) return res.status(400).json({ ok: false, error: "Tell us what you want to talk about" });
    if (!ALLOWED_HOURS.has(hours)) return res.status(400).json({ ok: false, error: "Hours must be 1, 2, or 3" });
    const startMs = Date.parse(startsAt);
    if (!Number.isFinite(startMs) || startMs <= Date.now()) {
      return res.status(400).json({ ok: false, error: "Pick a future weekday slot" });
    }

    const token = await getAccessToken(sa.value);
    const existing = await listCollection(sa.value.project_id, token, "consultations");
    const taken = existing.some((row) => {
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
    const consultationId = randomId();
    const referenceNumber = `guest-${consultationId.slice(0, 10)}-${Date.now()}`;

    await createDocument(sa.value.project_id, token, "consultations", consultationId, {
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
      successUrl: `${siteUrl}/book/confirmed?paid=1&c=${encodeURIComponent(consultationId)}&email=${encodeURIComponent(email)}`,
      cancelUrl: `${siteUrl}/book?paid=0&c=${encodeURIComponent(consultationId)}`,
      referenceNumber,
      description: "CasinWorks exploratory consultation",
      metadata: {
        kind: "exploratory_consultation",
        uid: "",
        hours: String(hours),
        ratePhp: String(ratePhp),
        totalPhp: String(totalPhp),
        consultationId,
        email,
        guest: "1",
      },
    });

    if (!created.ok) {
      await deleteDocument(sa.value.project_id, token, "consultations", consultationId).catch(() => undefined);
      return res.status(502).json({ ok: false, error: "Could not start checkout" });
    }

    await patchDocument(sa.value.project_id, token, "consultations", consultationId, {
      paymongoSessionId: created.session.id,
      paymongoReference: referenceNumber,
    });

    return res.status(200).json({
      ok: true,
      checkoutUrl: created.session.checkoutUrl,
      sessionId: created.session.id,
      consultationId,
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

function loadServiceAccount(): { ok: true; value: ServiceAccount } | { ok: false; reason: string } {
  const blob = env("FIREBASE_SERVICE_ACCOUNT");
  if (!blob) return { ok: false, reason: "missing_service_account" };
  try {
    let raw: unknown = JSON.parse(blob);
    if (typeof raw === "string") raw = JSON.parse(raw);
    const row = raw as Record<string, unknown>;
    const project_id = String(row.project_id ?? "");
    const client_email = String(row.client_email ?? "");
    let private_key = String(row.private_key ?? "").trim();
    if ((private_key.startsWith('"') && private_key.endsWith('"')) || (private_key.startsWith("'") && private_key.endsWith("'"))) {
      private_key = private_key.slice(1, -1);
    }
    private_key = private_key.replace(/\\n/g, "\n");
    if (!project_id || !client_email || !private_key.includes("BEGIN")) {
      return { ok: false, reason: "bad_service_account_fields" };
    }
    return { ok: true, value: { project_id, client_email, private_key } };
  } catch {
    return { ok: false, reason: "bad_service_account_json" };
  }
}

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(sa.private_key, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${unsigned}.${signature}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) throw new Error(`token_exchange_failed:${json.error || res.status}`);
  return json.access_token;
}

function encodeValue(v: unknown): Record<string, unknown> {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  return { stringValue: String(v) };
}

function encodeFields(data: Record<string, unknown>) {
  const fields: Record<string, Record<string, unknown>> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = encodeValue(v);
  return fields;
}

function decodeValue(v: Record<string, unknown>): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return Boolean(v.booleanValue);
  if ("nullValue" in v) return null;
  return null;
}

async function listCollection(projectId: string, token: string, collection: string) {
  const rows: Record<string, unknown>[] = [];
  let pageToken = "";
  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`,
    );
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json()) as {
      documents?: { fields?: Record<string, Record<string, unknown>> }[];
      nextPageToken?: string;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json.error?.message || `firestore_list_${res.status}`);
    for (const doc of json.documents ?? []) {
      const row: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(doc.fields ?? {})) row[k] = decodeValue(val);
      rows.push(row);
    }
    pageToken = json.nextPageToken ?? "";
  } while (pageToken);
  return rows;
}

async function createDocument(
  projectId: string,
  token: string,
  collection: string,
  id: string,
  data: Record<string, unknown>,
) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?documentId=${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(json?.error?.message || `firestore_create_${res.status}`);
  }
}

async function patchDocument(
  projectId: string,
  token: string,
  collection: string,
  id: string,
  data: Record<string, unknown>,
) {
  const mask = Object.keys(data)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${id}?${mask}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(json?.error?.message || `firestore_patch_${res.status}`);
  }
}

async function deleteDocument(projectId: string, token: string, collection: string, id: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${id}`;
  await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
}

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
  } | null;
  if (!res.ok) return { ok: false as const };
  const id = json?.data?.id ?? "";
  const checkoutUrl = json?.data?.attributes?.checkout_url ?? "";
  if (!id || !checkoutUrl) return { ok: false as const };
  return { ok: true as const, session: { id, checkoutUrl } };
}

function slotsOverlap(aStart: string, aHours: number, bStart: string, bHours: number) {
  const a0 = Date.parse(aStart);
  const b0 = Date.parse(bStart);
  if (!Number.isFinite(a0) || !Number.isFinite(b0)) return false;
  return a0 < b0 + bHours * 3600000 && b0 < a0 + aHours * 3600000;
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

function randomId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
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
