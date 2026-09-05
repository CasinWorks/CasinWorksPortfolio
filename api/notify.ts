import type { IncomingMessage, ServerResponse } from "node:http";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

type VercelRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
  headers: IncomingMessage["headers"] & { authorization?: string };
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

type NotifyPayload = { threadId?: string; messageId?: string };

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

/**
 * Service account credentials, accepted either as one JSON blob or as the three
 * discrete fields. Vercel mangles newlines in env values, hence the unescape.
 */
function credentials() {
  const blob = env("FIREBASE_SERVICE_ACCOUNT");
  if (blob) {
    try {
      const parsed = JSON.parse(blob) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  const projectId = env("FIREBASE_PROJECT_ID");
  const clientEmail = env("FIREBASE_CLIENT_EMAIL");
  const privateKey = env("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

let cached: App | null = null;

function adminApp(): App | null {
  if (cached) return cached;
  if (getApps().length > 0) {
    cached = getApp();
    return cached;
  }
  const creds = credentials();
  if (!creds) return null;
  cached = initializeApp({ credential: cert(creds), projectId: creds.projectId });
  return cached;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const app = adminApp();
  if (!app) {
    // Not configured yet: report success so a missing key never surfaces as a
    // send failure in the portal. The message itself is already saved.
    console.error("[notify] missing service account credentials");
    return res.status(200).json({ ok: true, delivered: 0, reason: "not-configured" });
  }

  const bearer = req.headers.authorization ?? "";
  const idToken = bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : "";
  if (!idToken) return res.status(401).json({ ok: false, error: "Missing credentials" });

  let callerUid: string;
  try {
    callerUid = (await getAuth(app).verifyIdToken(idToken)).uid;
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  const body = (typeof req.body === "string" ? safeJsonParse(req.body) : req.body) as NotifyPayload | null;
  const threadId = typeof body?.threadId === "string" ? body.threadId : "";
  const messageId = typeof body?.messageId === "string" ? body.messageId : "";
  if (!threadId || !messageId) return res.status(400).json({ ok: false, error: "Invalid request" });

  const db = getFirestore(app);

  const threadSnap = await db.collection("threads").doc(threadId).get();
  if (!threadSnap.exists) return res.status(404).json({ ok: false, error: "Thread not found" });
  const thread = threadSnap.data() as Record<string, unknown>;

  const messageSnap = await db.collection("threads").doc(threadId).collection("messages").doc(messageId).get();
  if (!messageSnap.exists) return res.status(404).json({ ok: false, error: "Message not found" });
  const message = messageSnap.data() as Record<string, unknown>;

  // Only the message's own author may trigger its notification, so a token
  // holder cannot spray pushes for other people's messages.
  if (String(message.senderUid ?? "") !== callerUid) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const senderRole = String(message.senderRole ?? "client");
  const senderName = String(message.senderName ?? "");
  const preview = String(message.body ?? "").slice(0, 160);

  const recipientUids =
    senderRole === "admin"
      ? [String(thread.clientUid ?? "")].filter(Boolean)
      : await adminUids(db);

  // Never notify the author, even if they are also an admin.
  const targets = recipientUids.filter((uid) => uid !== callerUid);
  if (targets.length === 0) return res.status(200).json({ ok: true, delivered: 0 });

  const tokensByUid = new Map<string, string[]>();
  for (const uid of targets) {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) continue;
    const tokens = (snap.data()?.fcmTokens as string[] | undefined) ?? [];
    if (tokens.length > 0) tokensByUid.set(uid, tokens);
  }

  const allTokens = [...new Set([...tokensByUid.values()].flat())];
  if (allTokens.length === 0) return res.status(200).json({ ok: true, delivered: 0 });

  const title =
    senderRole === "admin"
      ? "CasinWorks"
      : `${senderName || String(thread.clientName ?? "A client")} sent a message`;

  const result = await getMessaging(app).sendEachForMulticast({
    tokens: allTokens,
    notification: { title, body: preview },
    data: { kind: "message", threadId, messageId },
    // No content-available: these are plain alerts, so the app does not need
    // the remote-notification background mode Apple asks questions about.
    apns: {
      payload: { aps: { sound: "default", badge: 1 } },
    },
    android: { priority: "high", notification: { sound: "default" } },
  });

  await pruneDeadTokens(db, tokensByUid, allTokens, result.responses);

  return res.status(200).json({ ok: true, delivered: result.successCount });
}

async function adminUids(db: ReturnType<typeof getFirestore>): Promise<string[]> {
  const snap = await db.collection("users").where("role", "==", "admin").get();
  return snap.docs.map((d) => d.id);
}

/**
 * Drops tokens FCM reports as unregistered so a reinstalled or wiped device
 * does not keep failing on every future send.
 */
async function pruneDeadTokens(
  db: ReturnType<typeof getFirestore>,
  tokensByUid: Map<string, string[]>,
  allTokens: string[],
  responses: { success: boolean; error?: { code?: string } }[],
) {
  const dead = new Set<string>();
  responses.forEach((r, i) => {
    const code = r.error?.code ?? "";
    if (
      !r.success &&
      (code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token" ||
        code === "messaging/invalid-argument")
    ) {
      dead.add(allTokens[i]);
    }
  });
  if (dead.size === 0) return;

  await Promise.all(
    [...tokensByUid.entries()].map(async ([uid, tokens]) => {
      const keep = tokens.filter((t) => !dead.has(t));
      if (keep.length === tokens.length) return;
      await db.collection("users").doc(uid).update({ fcmTokens: keep });
    }),
  );
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
