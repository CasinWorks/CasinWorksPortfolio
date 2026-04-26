import type { VercelRequest, VercelResponse } from "@vercel/node";

type InquiryPayload = {
  name?: string;
  organization?: string;
  email?: string;
  brief?: string;
  page?: string;
  submittedAt?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const endpoint = process.env.INQUIRY_ENDPOINT;
  if (!endpoint) {
    return res.status(500).json({ ok: false, error: "INQUIRY_ENDPOINT is not configured" });
  }

  const body = (typeof req.body === "string" ? safeJsonParse(req.body) : req.body) as InquiryPayload | null;
  if (!body) return res.status(400).json({ ok: false, error: "Invalid JSON" });

  const email = String(body.email ?? "").trim();
  if (!email) return res.status(400).json({ ok: false, error: "Missing email" });

  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(502).json({
        ok: false,
        error: `Google endpoint error (${r.status})`,
        details: text.slice(0, 500),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "Failed to forward inquiry" });
  }
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

