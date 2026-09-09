import type { IncomingMessage, ServerResponse } from "node:http";

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

/** GET /api/book-http-ping — no local relative imports */
export default function handler(_req: IncomingMessage, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true, ping: "http-inline" });
}
