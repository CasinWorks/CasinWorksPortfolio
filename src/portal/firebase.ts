import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

function getApp() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Add VITE_FIREBASE_* keys to the environment.");
  }
  if (!app) app = initializeApp(firebaseConfig);
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

export function adminEmails(): string[] {
  return (import.meta.env.VITE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
