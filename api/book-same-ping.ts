import type { IncomingMessage, ServerResponse } from "node:http";
import { SAME_DIR_PING, noStoreHeader } from "./book-shared";

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

/** GET /api/book-same-ping */
export default function handler(_req: IncomingMessage, res: VercelResponse) {
  noStoreHeader(res);
  return res.status(200).json({ ok: true, ping: SAME_DIR_PING });
}
