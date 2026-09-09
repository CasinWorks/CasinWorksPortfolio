import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

/** GET /api/book-crypto-ping */
export default function handler(_req: IncomingMessage, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  const a = Buffer.from("abcd");
  const b = Buffer.from("abcd");
  return res.status(200).json({ ok: true, ping: "crypto", eq: timingSafeEqual(a, b) });
}
