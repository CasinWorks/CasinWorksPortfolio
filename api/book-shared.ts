export const SAME_DIR_PING = "same-dir-ok";

export function noStoreHeader(res: { setHeader: (k: string, v: string) => void }) {
  res.setHeader("Cache-Control", "no-store");
}
