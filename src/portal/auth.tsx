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
import { adminEmails, getFirebaseAuth, isFirebaseConfigured } from "./firebase";
import { claimProjectsForClient, fetchUserProfile, linkCrmClientOnLogin, upsertUserProfile } from "./api";
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

function resolveRole(email: string, stored?: PortalRole): PortalRole {
  if (adminEmails().includes(email.toLowerCase())) return "admin";
  return stored ?? "client";
}

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PortalUser | null>(null);

  useEffect(() => {
    if (!configured) return;
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user || !user.email) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const existing = await fetchUserProfile(user.uid);
        const role = resolveRole(user.email, existing?.role);
        const next: PortalUser = {
          uid: user.uid,
          email: user.email,
          displayName: existing?.displayName || user.displayName || user.email,
          role,
        };
        if (!existing || existing.role !== role) {
          await upsertUserProfile(next);
        }
        await claimProjectsForClient(next.uid, next.email, next.displayName);
        await linkCrmClientOnLogin(next.uid, next.email);
        setProfile(next);
      } catch {
        setProfile({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email,
          role: resolveRole(user.email),
        });
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      firebaseUser,
      profile,
      async signIn(email, password) {
        const auth = getFirebaseAuth();
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      async register({ email, password, displayName, role }) {
        const auth = getFirebaseAuth();
        await setPersistence(auth, browserLocalPersistence);
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName) await updateProfile(cred.user, { displayName });
        const resolved = resolveRole(email, role);
        const profile = {
          uid: cred.user.uid,
          email: email.trim().toLowerCase(),
          displayName: displayName.trim() || email,
          role: resolved,
        };
        await upsertUserProfile(profile);
        await claimProjectsForClient(profile.uid, profile.email, profile.displayName);
        await linkCrmClientOnLogin(profile.uid, profile.email);
      },
      async logout() {
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
