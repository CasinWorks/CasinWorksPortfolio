import { createHmac, createSign, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
  rawBody?: string | Buffer;
  headers: IncomingMessage["headers"] & {
    "paymongo-signature"?: string;
  };
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

/**
 * POST /api/paymongo-webhook
 *
 * PayMongo → CasinWorks. Marks consultations paid via Firestore REST.
 * Register in PayMongo (test + live): https://www.casinworks.com/api/paymongo-webhook
 * Events: checkout_session.payment.paid, payment.paid
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const webhookSecret = env("PAYMONGO_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("[paymongo-webhook] missing PAYMONGO_WEBHOOK_SECRET");
      return res.status(503).json({ ok: false, error: "Webhook not configured" });
    }

    const rawBody = await readRawBody(req);
    const signatureHeader = req.headers["paymongo-signature"];
    const liveMode = env("PAYMONGO_SECRET_KEY").startsWith("sk_live_");

    if (
      !verifyPaymongoSignature({
        rawBody,
        signatureHeader: typeof signatureHeader === "string" ? signatureHeader : undefined,
        webhookSecret,
        liveMode,
      })
    ) {
      console.warn("[paymongo-webhook] signature verification failed");
      return res.status(401).json({ ok: false, error: "Invalid signature" });
    }

    const payload = safeParse(rawBody) as {
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

    if (!payload) return res.status(400).json({ ok: false, error: "Invalid payload" });

    const eventType = payload.data?.attributes?.type ?? "";
    const resource = payload.data?.attributes?.data;
    const resourceId = resource?.id ?? "";
    const attrs = (resource?.attributes ?? {}) as Record<string, unknown>;

    await recordEvent({
      eventId: payload.data?.id ?? "",
      eventType,
      resourceId,
      attrs,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[paymongo-webhook]", err instanceof Error ? err.message : String(err));
    return res.status(500).json({ ok: false, error: "Processing failed" });
  }
}

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

async function readRawBody(req: VercelRequest): Promise<string> {
  if (typeof req.rawBody === "string") return req.rawBody;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString("utf8");
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length > 0) return Buffer.concat(chunks).toString("utf8");
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);
  return "";
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function safeEqualHex(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

function verifyPaymongoSignature(opts: {
  rawBody: string;
  signatureHeader: string | undefined;
  webhookSecret: string;
  liveMode?: boolean;
  maxAgeSec?: number;
}) {
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
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(t)) > maxAge) return false;

  const expected = createHmac("sha256", opts.webhookSecret)
    .update(`${t}.${opts.rawBody}`, "utf8")
    .digest("hex");

  const live = opts.liveMode === true;
  const candidate = live ? parts.li : parts.te;
  const matchesTe = parts.te ? safeEqualHex(expected, parts.te) : false;
  const matchesLi = parts.li ? safeEqualHex(expected, parts.li) : false;
  if (candidate) return safeEqualHex(expected, candidate);
  return matchesTe || matchesLi;
}

function loadServiceAccount(): ServiceAccount | null {
  const blob = env("FIREBASE_SERVICE_ACCOUNT");
  if (!blob) return null;
  try {
    let raw: unknown = JSON.parse(blob);
    if (typeof raw === "string") raw = JSON.parse(raw);
    const row = raw as Record<string, unknown>;
    const project_id = String(row.project_id ?? "");
    const client_email = String(row.client_email ?? "");
    let private_key = String(row.private_key ?? "").trim().replace(/\\n/g, "\n");
    if (!project_id || !client_email || !private_key.includes("BEGIN")) return null;
    return { project_id, client_email, private_key };
  } catch {
    return null;
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
  if (!res.ok || !json.access_token) throw new Error(`token_failed:${json.error || res.status}`);
  return json.access_token;
}

function encodeValue(v: unknown): Record<string, unknown> {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === "object") {
    const fields: Record<string, Record<string, unknown>> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) fields[k] = encodeValue(val);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
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
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}?${mask}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encodeValue(v)])) }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(json?.error?.message || `firestore_patch_${res.status}`);
  }
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
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encodeValue(v)])),
    }),
  });
  // Already exists is fine for idempotent event writes.
  if (!res.ok && res.status !== 409) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(json?.error?.message || `firestore_create_${res.status}`);
  }
}

async function getDocument(projectId: string, token: string, collection: string, id: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json()) as { name?: string };
}

async function queryByPaymongoReference(projectId: string, token: string, reference: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "consultations" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "paymongoReference" },
            op: "EQUAL",
            value: { stringValue: reference },
          },
        },
        limit: 1,
      },
    }),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as { document?: { name?: string } }[];
  const name = rows?.[0]?.document?.name ?? "";
  const id = name.split("/").pop() || "";
  return id || null;
}

async function recordEvent(input: {
  eventId: string;
  eventType: string;
  resourceId: string;
  attrs: Record<string, unknown>;
}) {
  const sa = loadServiceAccount();
  if (!sa) {
    console.error("[paymongo-webhook] missing FIREBASE_SERVICE_ACCOUNT");
    return;
  }
  const token = await getAccessToken(sa);

  if (input.eventId) {
    const existing = await getDocument(sa.project_id, token, "paymongo_events", input.eventId);
    if (existing) return;
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
    const paymentDocId = input.resourceId || input.eventId || reference || `pay-${Date.now()}`;

    await createDocument(sa.project_id, token, "paymongo_payments", paymentDocId, {
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
    }).catch(async () => {
      await patchDocument(sa.project_id, token, "paymongo_payments", paymentDocId, {
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
      });
    });

    if (consultationId) {
      await patchDocument(sa.project_id, token, "consultations", consultationId, {
        paymentStatus: "paid",
        paidAt,
        ...(reference ? { paymongoReference: reference } : {}),
        ...(metadata.totalPhp ? { amountPhp: Number(metadata.totalPhp) } : {}),
      });
    } else if (reference.startsWith("consult-") || reference.startsWith("guest-")) {
      const foundId = await queryByPaymongoReference(sa.project_id, token, reference);
      if (foundId) {
        await patchDocument(sa.project_id, token, "consultations", foundId, {
          paymentStatus: "paid",
          paidAt,
        });
      }
    }
  }

  if (input.eventId) {
    await createDocument(sa.project_id, token, "paymongo_events", input.eventId, {
      eventType: input.eventType,
      resourceId: input.resourceId,
      receivedAt: new Date().toISOString(),
    }).catch(() => undefined);
  }

  console.info("[paymongo-webhook] processed", {
    eventType: input.eventType,
    resourceId: input.resourceId,
    consultationId: String((input.attrs.metadata as Record<string, string> | undefined)?.consultationId ?? ""),
  });
}
