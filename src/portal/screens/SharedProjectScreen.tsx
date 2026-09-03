import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import { listenProjectShare } from "../api";
import { usePortalAuth } from "../auth";
import { PageFade } from "../motion";
import type { ProjectShare } from "../types";

export function SharedProjectScreen() {
  const { token } = useParams<{ token: string }>();
  const { profile, loading } = usePortalAuth();
  const [share, setShare] = useState<ProjectShare | null>(null);
  const [error, setError] = useState("");

  const nextPath = `/portal/view/${token ?? ""}`;
  const signInHref = `/portal/sign-in?next=${encodeURIComponent(nextPath)}`;
  const registerHref = `/portal/register?next=${encodeURIComponent(nextPath)}`;

  usePageMeta({
    title: `Project invite — ${SITE.name}`,
    path: nextPath,
    noIndex: true,
  });

  useEffect(() => {
    if (!token || !profile) return;
    return listenProjectShare(
      token,
      (row) => {
        setShare(row);
        if (!row) setError("This invite is invalid or has been removed.");
      },
      () => setError("This invite is not available on this account. Sign in with the email CasinWorks invited."),
    );
  }, [token, profile]);

  if (loading) {
    return <p className="min-h-screen bg-[var(--page-cream)] text-slate-500 px-[var(--page-gutter)] py-24">Loading…</p>;
  }

  if (!profile) {
    return (
      <PageFade className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a]">
        <header className="border-b border-black/10">
          <div className="max-w-[var(--page-max)] mx-auto px-[var(--page-gutter)] py-4 flex flex-wrap items-center justify-between gap-3">
            <Link to="/" className="flex flex-col leading-tight">
              <span className="text-lg font-semibold tracking-tight">{SITE.brand}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Client portal</span>
            </Link>
          </div>
        </header>
        <main className="max-w-xl mx-auto px-[var(--page-gutter)] py-16 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Private project</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight">
            Sign in to <span className="italic font-normal text-slate-400">view this work.</span>
          </h1>
          <p className="mt-4 text-sm text-slate-600">
            Project details stay hidden until you log in with the email CasinWorks invited. Guest access is not available.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link to={signInHref} className="rounded-full bg-black text-white px-6 py-3 text-sm font-semibold">
              Sign in
            </Link>
            <Link to={registerHref} className="rounded-full border border-black/15 px-6 py-3 text-sm font-semibold">
              Create an account
            </Link>
          </div>
        </main>
      </PageFade>
    );
  }

  if (share && (profile.role === "admin" || profile.email.toLowerCase() === share.clientEmail.toLowerCase())) {
    return <Navigate to={`/portal/projects/${share.projectId}`} replace />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a] px-[var(--page-gutter)] py-24">
        <p className="max-w-xl text-sm text-slate-700">{error}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/portal/sign-in" className="text-sm font-semibold underline underline-offset-4">
            Sign in with a different account
          </Link>
          <Link to="/portal/dashboard" className="text-sm font-semibold underline underline-offset-4">
            Go to projects
          </Link>
        </div>
      </div>
    );
  }

  return <p className="min-h-screen bg-[var(--page-cream)] text-slate-500 px-[var(--page-gutter)] py-24">Opening project…</p>;
}
