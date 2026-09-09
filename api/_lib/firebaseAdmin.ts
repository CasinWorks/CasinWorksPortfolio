import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "./env";

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

export function adminApp(): App | null {
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

export async function verifyIdToken(authorization: string | undefined): Promise<string | null> {
  const app = adminApp();
  if (!app) return null;
  const bearer = authorization ?? "";
  const idToken = bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : "";
  if (!idToken) return null;
  try {
    return (await getAuth(app).verifyIdToken(idToken)).uid;
  } catch {
    return null;
  }
}

export function adminDb() {
  const app = adminApp();
  if (!app) return null;
  return getFirestore(app);
}
