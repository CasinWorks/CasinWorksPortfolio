import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured, loadFirebase } from "./firebase";
import { claimProjectsForClient, createUserProfileIfMissing, fetchUserProfile, linkCrmClientOnLogin } from "./api";
import type { PortalRole, PortalUser } from "./types";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  firebaseUser: User | null;
  profile: PortalUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; displayName: string; role: Exclude<PortalRole, "admin"> }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function waitForUserProfile(user: { uid: string; email: string; displayName: string }) {
  for (let i = 0; i < 8; i++) {
    const existing = await fetchUserProfile(user.uid);
    if (existing) return existing;
    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
  return createUserProfileIfMissing({ ...user, role: "client" });
}

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PortalUser | null>(null);

  useEffect(() => {
    let unsub = () => undefined;
    loadFirebase()
      .then((ok) => {
        setConfigured(ok);
        if (!ok) {
          setLoading(false);
          return;
        }
        const auth = getFirebaseAuth();
        unsub = onAuthStateChanged(auth, async (user) => {
          setFirebaseUser(user);
          if (!user || !user.email) {
            setProfile(null);
            setLoading(false);
            return;
          }
          try {
            const profile = await waitForUserProfile({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email,
            });
            await claimProjectsForClient(profile.uid, profile.email, profile.displayName);
            await linkCrmClientOnLogin(profile.uid, profile.email);
            setProfile(profile);
          } catch {
            setProfile({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email,
              role: "client",
            });
          } finally {
            setLoading(false);
          }
        });
      })
      .catch(() => {
        setConfigured(false);
        setLoading(false);
      });
    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      firebaseUser,
      profile,
      async signIn(email, password) {
        if (!isFirebaseConfigured()) throw new Error("Firebase is not configured on the server.");
        const auth = getFirebaseAuth();
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      async register({ email, password, displayName, role }) {
        if (!isFirebaseConfigured()) throw new Error("Firebase is not configured on the server.");
        const auth = getFirebaseAuth();
        await setPersistence(auth, browserLocalPersistence);
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName) await updateProfile(cred.user, { displayName });
        const profile = await createUserProfileIfMissing({
          uid: cred.user.uid,
          email: email.trim().toLowerCase(),
          displayName: displayName.trim() || email,
          role,
        });
        await claimProjectsForClient(profile.uid, profile.email, profile.displayName);
        await linkCrmClientOnLogin(profile.uid, profile.email);
      },
      async logout() {
        if (!isFirebaseConfigured()) return;
        await signOut(getFirebaseAuth());
      },
    }),
    [configured, loading, firebaseUser, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function usePortalAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("usePortalAuth must be used within PortalAuthProvider");
  return ctx;
}
