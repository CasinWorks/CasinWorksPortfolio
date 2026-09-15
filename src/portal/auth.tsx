import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getRedirectResult,
  OAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { getFirebaseAuth, isFirebaseConfigured, loadFirebase } from "./firebase";
import {
  claimProjectsForClient,
  claimConsultationsForClient,
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
  /** Signed into Firebase Auth but no Firestore `users/{uid}` yet (Apple first run). */
  needsProfileCompletion: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    role: Exclude<PortalRole, "admin">;
    company?: string;
  }) => Promise<void>;
  completeProfile: (input: {
    role: Exclude<PortalRole, "admin">;
    company?: string;
    displayName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  /** Password required for email/password accounts; ignored for Apple. */
  deleteAccount: (password?: string) => Promise<void>;
  authUsesApple: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function userUsesApple(user: User | null) {
  return Boolean(user?.providerData.some((p) => p.providerId === "apple.com"));
}

async function afterProfileReady(profile: PortalUser) {
  await claimProjectsForClient(profile.uid, profile.email, profile.displayName);
  await claimConsultationsForClient(profile.uid, profile.email, profile.displayName);
  await linkCrmClientOnLogin(profile.uid, profile.email);
}

async function sendWelcome(profile: PortalUser, idToken?: string) {
  if (!idToken) return;
  void fetch("/api/welcome-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ displayName: profile.displayName, role: profile.role }),
  }).catch(() => undefined);
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
        void getRedirectResult(auth).catch(() => undefined);
        unsub = onAuthStateChanged(auth, async (user) => {
          setFirebaseUser(user);
          if (!user || !user.email) {
            setProfile(null);
            setLoading(false);
            return;
          }
          try {
            const existing = await fetchUserProfile(user.uid);
            if (!existing) {
              // Do not auto-create — first-time Apple (or orphan) accounts complete a role picker.
              setProfile(null);
              return;
            }
            await afterProfileReady(existing);
            setProfile(existing);
          } catch {
            setProfile(null);
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

  const needsProfileCompletion = Boolean(firebaseUser?.email && !profile && !loading);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      firebaseUser,
      profile,
      needsProfileCompletion,
      authUsesApple: userUsesApple(firebaseUser),
      async signIn(email, password) {
        if (!isFirebaseConfigured()) throw new Error("Firebase is not configured on the server.");
        const auth = getFirebaseAuth();
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      async signInWithApple() {
        if (!isFirebaseConfigured()) throw new Error("Firebase is not configured on the server.");
        const auth = getFirebaseAuth();
        await setPersistence(auth, browserLocalPersistence);
        const provider = new OAuthProvider("apple.com");
        provider.addScope("email");
        provider.addScope("name");
        try {
          await signInWithPopup(auth, provider);
        } catch (err) {
          if (
            err instanceof FirebaseError &&
            (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user")
          ) {
            if (err.code === "auth/popup-blocked") {
              await signInWithRedirect(auth, provider);
              return;
            }
            throw err;
          }
          throw err;
        }
      },
      async register({ email, password, displayName, role, company }) {
        if (!isFirebaseConfigured()) throw new Error("Firebase is not configured on the server.");
        const auth = getFirebaseAuth();
        await setPersistence(auth, browserLocalPersistence);
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName) await updateProfile(cred.user, { displayName });
        const next = await createUserProfileIfMissing({
          uid: cred.user.uid,
          email: email.trim().toLowerCase(),
          displayName: displayName.trim() || email,
          role,
          company: company?.trim() || undefined,
        });
        await afterProfileReady(next);
        setProfile(next);
        const idToken = await cred.user.getIdToken().catch(() => undefined);
        await sendWelcome(next, idToken);
      },
      async completeProfile({ role, company, displayName }) {
        if (!isFirebaseConfigured()) throw new Error("Firebase is not configured on the server.");
        const user = getFirebaseAuth().currentUser;
        if (!user?.email) throw new Error("Sign in again before finishing your profile.");
        const name =
          displayName?.trim() ||
          user.displayName?.trim() ||
          user.email.split("@")[0] ||
          "CasinWorks user";
        if (!user.displayName?.trim() && name) {
          await updateProfile(user, { displayName: name });
        }
        if (role === "client" && !company?.trim()) {
          throw new Error("Enter your company.");
        }
        const next = await createUserProfileIfMissing({
          uid: user.uid,
          email: user.email.trim().toLowerCase(),
          displayName: name,
          role,
          company: role === "client" ? company?.trim() : undefined,
          privacyAcceptedAt: new Date().toISOString(),
        });
        await afterProfileReady(next);
        setProfile(next);
        const idToken = await user.getIdToken().catch(() => undefined);
        await sendWelcome(next, idToken);
      },
      async logout() {
        if (!isFirebaseConfigured()) return;
        await signOut(getFirebaseAuth());
        setProfile(null);
      },
      async deleteAccount(password?: string) {
        if (!isFirebaseConfigured()) throw new Error("Firebase is not configured on the server.");
        const user = getFirebaseAuth().currentUser;
        if (!user?.email) throw new Error("This account has no email address to confirm against.");
        try {
          if (userUsesApple(user)) {
            const provider = new OAuthProvider("apple.com");
            await reauthenticateWithPopup(user, provider);
          } else {
            if (!password) throw new Error("Enter your password to confirm.");
            await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
          }
        } catch (err) {
          if (
            err instanceof FirebaseError &&
            (err.code === "auth/invalid-credential" ||
              err.code === "auth/wrong-password" ||
              err.code === "auth/invalid-login-credentials")
          ) {
            throw new Error("That password did not match. Your account was not deleted.");
          }
          if (err instanceof FirebaseError && err.code === "auth/popup-closed-by-user") {
            throw new Error("Apple confirmation was cancelled. Your account was not deleted.");
          }
          throw err;
        }
        await deleteAccountData(user);
      },
    }),
    [configured, loading, firebaseUser, profile, needsProfileCompletion],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function usePortalAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("usePortalAuth must be used within PortalAuthProvider");
  return ctx;
}
