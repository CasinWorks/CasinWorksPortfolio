import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
  headers: IncomingMessage["headers"] & {
    origin?: string;
    referer?: string;
    host?: string;
    "x-forwarded-for"?: string;
  };
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

type InquiryPayload = {
  name?: string;
  organization?: string;
  email?: string;
  brief?: string;
  page?: string;
  submittedAt?: string;
  // Honeypot field: should remain empty.
  website?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Best-effort abuse protection (per-region / per-instance).
  const ip = getClientIp(req);
  if (!rateLimit(ip, { limit: 8, windowMs: 60_000 })) {
    return res.status(429).json({ ok: false, error: "Too many requests" });
  }

  if (!sameOrigin(req)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const endpoint = process.env.INQUIRY_ENDPOINT;
  if (!endpoint) {
    console.error("[inquiry] missing INQUIRY_ENDPOINT");
    return res.status(500).json({ ok: false, error: "Server misconfigured" });
  }

  const body = (typeof req.body === "string" ? safeJsonParse(req.body) : req.body) as InquiryPayload | null;
  if (!body) return res.status(400).json({ ok: false, error: "Invalid request" });
  if (typeof body.website === "string" && body.website.trim()) {
    // bot submission
    return res.status(200).json({ ok: true });
  }

  const payload = normalizePayload(body);
  if (payload.ok === false) return res.status(400).json({ ok: false, error: payload.error });

  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload.data),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("[inquiry] upstream error", { status: r.status, body: text.slice(0, 2000) });
      return res.status(502).json({ ok: false, error: "Upstream request failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[inquiry] exception", err);
    return res.status(500).json({ ok: false, error: "Request failed" });
  }
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function getClientIp(req: VercelRequest): string {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  return "unknown";
}

function sameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return true; // allow non-browser clients
  try {
    const o = new URL(origin);
    return o.host === host;
  } catch {
    return false;
  }
}

function normalizePayload(input: InquiryPayload): { ok: true; data: Required<Pick<InquiryPayload, "name" | "organization" | "email" | "brief" | "page" | "submittedAt">> } | { ok: false; error: string } {
  const name = clampText(input.name, 120);
  const organization = clampText(input.organization, 160);
  const email = clampText(input.email, 200);
  const brief = clampText(input.brief, 5000);
  const page = clampText(input.page, 500);
  const submittedAt = clampText(input.submittedAt, 64) || new Date().toISOString();

  if (!email) return { ok: false, error: "Missing email" };
  if (!isEmail(email)) return { ok: false, error: "Invalid email" };

  return {
    ok: true,
    data: {
      name: neutralizeSpreadsheetFormula(name),
      organization: neutralizeSpreadsheetFormula(organization),
      email: neutralizeSpreadsheetFormula(email),
      brief: neutralizeSpreadsheetFormula(brief),
      page: neutralizeSpreadsheetFormula(page),
      submittedAt,
    },
  };
}

function clampText(v: unknown, maxLen: number): string {
  if (typeof v !== "string") return "";
  const s = v.replace(/\u0000/g, "").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function isEmail(s: string): boolean {
  // practical validation, not RFC-complete
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function neutralizeSpreadsheetFormula(s: string): string {
  if (!s) return s;
  const first = s[0];
  if (first === "=" || first === "+" || first === "-" || first === "@") return `'${s}`;
  return s;
}

const _rl: Map<string, { count: number; resetAt: number }> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((globalThis as any).__inquiryRateLimit ??= new Map());

function rateLimit(key: string, opts: { limit: number; windowMs: number }): boolean {
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

