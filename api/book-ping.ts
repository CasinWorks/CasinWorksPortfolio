import type { IncomingMessage, ServerResponse } from "node:http";

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

/** GET /api/book-ping — deploy health check with no Firebase deps. */
export default function handler(_req: IncomingMessage, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true, ping: "book", t: Date.now() });
}
