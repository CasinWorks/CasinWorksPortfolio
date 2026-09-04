import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { getFirebaseAuth, isFirebaseConfigured, loadFirebase } from "./firebase";
import {
  claimProjectsForClient,
  createUserProfileIfMissing,
  deleteAccountData,
  fetchUserProfile,
  linkCrmClientOnLogin,
} from "./api";
import type { PortalRole, PortalUser } from "./types";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  firebaseUser: User | null;
  profile: PortalUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    role: Exclude<PortalRole, "admin">;
    company?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
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
      async register({ email, password, displayName, role, company }) {
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
          company: company?.trim() || undefined,
        });
        await claimProjectsForClient(profile.uid, profile.email, profile.displayName);
        await linkCrmClientOnLogin(profile.uid, profile.email);
      },
      async logout() {
        if (!isFirebaseConfigured()) return;
        await signOut(getFirebaseAuth());
      },
      async deleteAccount(password: string) {
        if (!isFirebaseConfigured()) throw new Error("Firebase is not configured on the server.");
        const user = getFirebaseAuth().currentUser;
        if (!user?.email) throw new Error("This account has no email address to confirm against.");
        try {
          await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
        } catch (err) {
          if (err instanceof FirebaseError && (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/invalid-login-credentials")) {
            throw new Error("That password did not match. Your account was not deleted.");
          }
          throw err;
        }
        await deleteAccountData(user);
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
