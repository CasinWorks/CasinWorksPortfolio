import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import { ACCOUNT_PRIVACY_URL, ACCOUNT_STORED_DATA_NOTICE } from "../api";
import { usePortalAuth } from "../auth";
import type { PortalRole } from "../types";
import { PageFade } from "../motion";

export function CompleteProfileScreen() {
  usePageMeta({
    title: `Welcome — Portal | ${SITE.name}`,
    path: "/portal/complete-profile",
    noIndex: true,
  });

  const { configured, loading, profile, firebaseUser, needsProfileCompletion, completeProfile, logout } =
    usePortalAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Exclude<PortalRole, "admin"> | null>(null);
  const [company, setCompany] = useState("");
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--page-cream)] text-slate-500 px-[var(--page-gutter)] py-16">
        Loading…
      </div>
    );
  }

  if (!firebaseUser) return <Navigate to="/portal/sign-in" replace />;
  if (profile || !needsProfileCompletion) return <Navigate to="/portal" replace />;

  const canContinue =
    Boolean(role) && acceptedPrivacy && (role !== "client" || company.trim().length > 0) && !sending && configured;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError("");
    setSending(true);
    try {
      await completeProfile({
        role,
        company: role === "client" ? company : undefined,
      });
      navigate(role === "subcontractor" ? "/portal/gigs" : "/portal/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish your profile.");
    } finally {
      setSending(false);
    }
  }

  return (
    <PageFade className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a] px-[var(--page-gutter)] py-12 sm:py-24">
      <div className="max-w-md mx-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Welcome</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight leading-[1.1]">
          How will you use <span className="italic text-slate-500">the portal.</span>
        </h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Pick once. Client accounts follow engagements; subcontractors see open postings.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <button
            type="button"
            onClick={() => setRole("client")}
            className={`w-full text-left border px-5 py-4 transition-colors ${
              role === "client" ? "bg-black text-white border-black" : "bg-white border-black/15 hover:border-black/40"
            }`}
          >
            <span className="block text-base font-semibold">Client</span>
            <span className={`mt-1 block text-sm ${role === "client" ? "text-white/75" : "text-slate-500"}`}>
              Project progress, documents, invoices.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRole("subcontractor")}
            className={`w-full text-left border px-5 py-4 transition-colors ${
              role === "subcontractor"
                ? "bg-black text-white border-black"
                : "bg-white border-black/15 hover:border-black/40"
            }`}
          >
            <span className="block text-base font-semibold">Looking for work</span>
            <span
              className={`mt-1 block text-sm ${role === "subcontractor" ? "text-white/75" : "text-slate-500"}`}
            >
              Subcontractor board and applications.
            </span>
          </button>

          {role === "client" && (
            <input
              required
              placeholder="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm focus:outline-none focus:border-black"
            />
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              className="mt-1 size-4 accent-black"
            />
            <span className="text-sm text-slate-600 leading-relaxed">
              I agree that CasinWorks stores my name, email address, and company to run this portal account.{" "}
              <a href={ACCOUNT_PRIVACY_URL} className="text-black font-medium underline underline-offset-4">
                Read the privacy policy
              </a>
              . You can delete the account from Account at any time.
            </span>
          </label>
          <p className="text-xs text-slate-500 leading-relaxed">{ACCOUNT_STORED_DATA_NOTICE}</p>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={!canContinue}
            className="w-full py-3.5 bg-black text-white rounded-full text-sm font-semibold disabled:opacity-50"
          >
            {sending ? "Please wait…" : "Continue"}
          </button>
        </form>

        <button
          type="button"
          disabled={sending}
          onClick={() => void logout().then(() => navigate("/portal/sign-in", { replace: true }))}
          className="mt-6 w-full text-sm font-medium text-slate-500 hover:text-black"
        >
          Sign out
        </button>
      </div>
    </PageFade>
  );
}
