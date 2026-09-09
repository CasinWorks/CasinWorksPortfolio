/** Shared env helper for Vercel serverless functions. Never log return values that may be secrets. */
export function env(name: string): string {
  return (process.env[name] ?? "").trim();
}
