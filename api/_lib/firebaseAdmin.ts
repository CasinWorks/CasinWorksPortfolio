import { createRequire } from "node:module";
import { env } from "./env";

type App = import("firebase-admin/app").App;
type Firestore = import("firebase-admin/firestore").Firestore;

type ServiceCreds = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

/** Vercel often mangles PEM newlines in env values — normalize aggressively. */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  if (!key.includes("\n") && key.includes("BEGIN") && key.includes("END")) {
    key = key
      .replace(/-----BEGIN ([A-Z ]+)----- /, "-----BEGIN $1-----\n")
      .replace(/ -----END ([A-Z ]+)-----/, "\n-----END $1-----")
      .replace(/ -----END/, "\n-----END");
  }
  return key;
}

function parseServiceAccountBlob(blob: string): ServiceCreds | null {
  try {
    let parsed: unknown = JSON.parse(blob);
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    if (!parsed || typeof parsed !== "object") return null;
    const row = parsed as Record<string, unknown>;
    const projectId = typeof row.project_id === "string" ? row.project_id.trim() : "";
    const clientEmail = typeof row.client_email === "string" ? row.client_email.trim() : "";
    const privateKey =
      typeof row.private_key === "string" ? normalizePrivateKey(row.private_key) : "";
    if (!projectId || !clientEmail || !privateKey.includes("BEGIN")) return null;
    return { projectId, clientEmail, privateKey };
  } catch {
    return null;
  }
}

function credentials(): ServiceCreds | null {
  const blob = env("FIREBASE_SERVICE_ACCOUNT");
  if (blob) {
    const fromBlob = parseServiceAccountBlob(blob);
    if (fromBlob) return fromBlob;
    console.error("[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT present but invalid JSON/key");
    return null;
  }

  const projectId = env("FIREBASE_PROJECT_ID");
  const clientEmail = env("FIREBASE_CLIENT_EMAIL");
  const privateKey = normalizePrivateKey(env("FIREBASE_PRIVATE_KEY"));
  if (!projectId || !clientEmail || !privateKey.includes("BEGIN")) return null;
  return { projectId, clientEmail, privateKey };
}

let cached: App | null = null;
let initFailed = false;
let loadError: string | null = null;

/**
 * Load firebase-admin via createRequire (CJS) to avoid ESM interop crashes
 * that surface as FUNCTION_INVOCATION_FAILED on Vercel.
 */
function loadAdmin() {
  const require = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const admin = require("firebase-admin") as typeof import("firebase-admin");
  return admin;
}

export function adminInitError(): string | null {
  return loadError;
}

export function adminApp(): App | null {
  if (cached) return cached;
  if (initFailed) return null;
  try {
    const admin = loadAdmin();
    if (admin.apps.length > 0) {
      cached = admin.app();
      return cached;
    }
    const creds = credentials();
    if (!creds) {
      loadError = "missing-credentials";
      return null;
    }
    cached = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: creds.projectId,
        clientEmail: creds.clientEmail,
        privateKey: creds.privateKey,
      }),
      projectId: creds.projectId,
    });
    return cached;
  } catch (err) {
    initFailed = true;
    loadError = err instanceof Error ? err.message : String(err);
    console.error("[firebaseAdmin] initializeApp failed:", loadError);
    return null;
  }
}

export async function verifyIdToken(authorization: string | undefined): Promise<string | null> {
  const app = adminApp();
  if (!app) return null;
  const bearer = authorization ?? "";
  const idToken = bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : "";
  if (!idToken) return null;
  try {
    const admin = loadAdmin();
    return (await admin.auth(app).verifyIdToken(idToken)).uid;
  } catch {
    return null;
  }
}

export function adminDb(): Firestore | null {
  const app = adminApp();
  if (!app) return null;
  try {
    const admin = loadAdmin();
    return admin.firestore(app);
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
    console.error("[firebaseAdmin] getFirestore failed:", loadError);
    return null;
  }
}
