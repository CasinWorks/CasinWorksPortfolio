import type { IncomingMessage, ServerResponse } from "node:http";
import { SERVER_PING } from "../server/ping";

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

/** GET /api/book-mod-ping */
export default function handler(_req: IncomingMessage, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true, ping: SERVER_PING });
}
