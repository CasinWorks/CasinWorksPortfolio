import { noStore, type VercelRequest, type VercelResponse } from "./_lib/http";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  noStore(res);
  return res.status(200).json({ ok: true, ping: "http-lib" });
}
