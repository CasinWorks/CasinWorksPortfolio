import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

let config: FirebaseWebConfig | null = null;
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let loadPromise: Promise<boolean> | null = null;

export function isFirebaseConfigured() {
  return Boolean(config?.apiKey && config?.projectId && config?.appId);
}

export async function loadFirebase(): Promise<boolean> {
  if (isFirebaseConfigured()) return true;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch("/api/firebase-config", { headers: { Accept: "application/json" } });
      if (!res.ok) return false;
      const data = (await res.json()) as Partial<FirebaseWebConfig>;
      if (!data.apiKey || !data.projectId || !data.appId) return false;
      config = {
        apiKey: data.apiKey,
        authDomain: data.authDomain || "",
        projectId: data.projectId,
        storageBucket: data.storageBucket || "",
        messagingSenderId: data.messagingSenderId || "",
        appId: data.appId,
      };
      return true;
    } catch {
      return false;
    }
  })();
  return loadPromise;
}

function getApp() {
  if (!isFirebaseConfigured() || !config) {
    throw new Error("Firebase is not configured on the server.");
  }
  if (!app) app = initializeApp(config);
  return app;
}

export function getFirebaseAuth() {
  if (!auth) auth = getAuth(getApp());
  return auth;
}

export function getFirebaseDb() {
  if (!db) db = getFirestore(getApp());
  return db;
}

export function getFirebaseStorage() {
  if (!storage) storage = getStorage(getApp());
  return storage;
}
