import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & { method?: string };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = env("FIREBASE_API_KEY");
  const authDomain = env("FIREBASE_AUTH_DOMAIN");
  const projectId = env("FIREBASE_PROJECT_ID");
  const storageBucket = env("FIREBASE_STORAGE_BUCKET");
  const messagingSenderId = env("FIREBASE_MESSAGING_SENDER_ID");
  const appId = env("FIREBASE_APP_ID");

  if (!apiKey || !projectId || !appId) {
    return res.status(503).json({ error: "Firebase is not configured on the server." });
  }

  return res.status(200).json({
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  });
}
