import type { IncomingMessage, ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";

export type VercelRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
  headers: IncomingMessage["headers"] & {
    authorization?: string;
    origin?: string;
    referer?: string;
    host?: string;
    "x-forwarded-for"?: string;
    "paymongo-signature"?: string;
  };
};

export type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

export function noStore(res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
}

export function getClientIp(req: VercelRequest): string {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  return "unknown";
}

/** Reject cross-site browser calls to payment endpoints. */
export function sameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) {
    // Server-to-server (webhooks, curl) may omit Origin — caller decides whether to allow.
    return false;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Prefer the untouched payload PayMongo signed. Parsed JSON re-stringified will
 * fail verification — keep bodyParser off for the webhook route when possible.
 */
export async function readRawBody(req: VercelRequest): Promise<string> {
  const withRaw = req as VercelRequest & { rawBody?: string | Buffer };
  if (typeof withRaw.rawBody === "string") return withRaw.rawBody;
  if (Buffer.isBuffer(withRaw.rawBody)) return withRaw.rawBody.toString("utf8");

  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length > 0) return Buffer.concat(chunks).toString("utf8");

  if (req.body && typeof req.body === "object") {
    return JSON.stringify(req.body);
  }
  return "";
}

export function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Constant-time hex compare; lengths must match or it returns false. */
export function safeEqualHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}
