import type { IncomingMessage, ServerResponse } from "node:http";
import { GoogleGenAI } from "@google/genai";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

type VercelRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
  headers: IncomingMessage["headers"] & { authorization?: string };
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

type HelpMeWritePayload = {
  prompt?: string;
  draft?: string;
  role?: string;
  projectName?: string;
  clientName?: string;
  recentMessages?: Array<{ role?: string; body?: string }>;
};

const MESSAGE_MAX_LENGTH = 4000;
const PROMPT_MAX_LENGTH = 800;
const DRAFT_MAX_LENGTH = 4000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 12;

/** Per-uid timestamps in this serverless isolate (best-effort). */
const rateHits = new Map<string, number[]>();

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

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
  try {
    if (getApps().length > 0) {
      cached = getApp();
      return cached;
    }
    const creds = credentials();
    if (!creds) return null;
    cached = initializeApp({ credential: cert(creds), projectId: creds.projectId });
    return cached;
  } catch (err) {
    console.error("[help-me-write] initializeApp failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function allowRate(uid: string): boolean {
  const now = Date.now();
  const prev = (rateHits.get(uid) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (prev.length >= RATE_MAX) {
    rateHits.set(uid, prev);
    return false;
  }
  prev.push(now);
  rateHits.set(uid, prev);
  return true;
}

function clip(s: string, max: number) {
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

/**
 * POST /api/help-me-write
 * Drafts a portal comment/message with Gemini. Does not send email — caller posts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const geminiKey = env("GEMINI_API_KEY");
  if (!geminiKey) {
    return res.status(503).json({ ok: false, error: "Help me write is not configured yet." });
  }

  const app = adminApp();
  if (!app) {
    console.error("[help-me-write] missing service account credentials");
    return res.status(503).json({ ok: false, error: "Auth is not configured." });
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

  if (!allowRate(callerUid)) {
    return res.status(429).json({ ok: false, error: "Too many drafts — wait a minute and try again." });
  }

  const raw = (typeof req.body === "string" ? safeJsonParse(req.body) : req.body) as HelpMeWritePayload | null;
  const prompt = clip(String(raw?.prompt ?? ""), PROMPT_MAX_LENGTH);
  const draft = clip(String(raw?.draft ?? ""), DRAFT_MAX_LENGTH);
  const role = String(raw?.role ?? "admin") === "client" ? "client" : "admin";
  const projectName = clip(String(raw?.projectName ?? ""), 200);
  const clientName = clip(String(raw?.clientName ?? ""), 120);

  if (!prompt && !draft) {
    return res.status(400).json({ ok: false, error: "Describe what to write, or start a draft first." });
  }

  const recent = Array.isArray(raw?.recentMessages)
    ? raw.recentMessages
        .slice(-8)
        .map((m) => ({
          role: String(m?.role ?? "") === "client" ? "client" : "admin",
          body: clip(String(m?.body ?? ""), 280),
        }))
        .filter((m) => m.body)
    : [];

  const roleLine =
    role === "admin"
      ? "You write as CasinWorks (the studio) to the client. Clear, calm, professional. No hype."
      : "You write as the client to CasinWorks. Polite, direct, practical.";

  const system = [
    "You draft short portal messages for a software engagement workspace.",
    roleLine,
    "Output plain text only — no markdown headings, bullets unless natural, or subject lines.",
    `Keep under ${MESSAGE_MAX_LENGTH} characters.`,
    "Do not invent invoices, amounts, dates, deadlines, or project status the user did not provide.",
    "If the user gave a draft, improve or complete it per their instruction; do not discard their facts.",
    "Prefer 2–5 short sentences unless they ask for longer.",
  ].join(" ");

  const contextBits: string[] = [];
  if (projectName) contextBits.push(`Project: ${projectName}`);
  if (clientName && role === "admin") contextBits.push(`Client: ${clientName}`);
  if (recent.length > 0) {
    contextBits.push(
      "Recent thread:\n" +
        recent.map((m) => `${m.role === "admin" ? "Studio" : "Client"}: ${m.body}`).join("\n"),
    );
  }
  if (draft) contextBits.push(`Current draft:\n${draft}`);
  contextBits.push(`Instruction:\n${prompt || "Polish this into a clear portal update."}`);

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contextBits.join("\n\n"),
      config: {
        systemInstruction: system,
        temperature: 0.6,
        maxOutputTokens: 1024,
      },
    });

    const text = clip(String(response.text ?? "").replace(/\r\n/g, "\n"), MESSAGE_MAX_LENGTH);
    if (!text) {
      return res.status(502).json({ ok: false, error: "Gemini returned an empty draft." });
    }
    return res.status(200).json({ ok: true, text });
  } catch (err) {
    console.error("[help-me-write] gemini", err instanceof Error ? err.message : String(err));
    return res.status(502).json({ ok: false, error: "Could not generate a draft. Try again." });
  }
}
