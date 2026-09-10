import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import { PageFade } from "../motion";

/** Public landing after a portal account was deleted. Matches site 404 composition. */
export function AccountDeletedScreen() {
  usePageMeta({
    title: `Account deleted — ${SITE.name}`,
    path: "/portal/account-deleted",
    noIndex: true,
  });

  return (
    <PageFade className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a] px-6 sm:px-8 lg:px-16 py-32 sm:py-40">
      <div className="max-w-[1800px] mx-auto">
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 mb-10">Account</p>
        <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-bold italic tracking-tighter leading-[0.9] mb-8">
          Account deleted.
        </h1>
        <p className="max-w-xl text-xl sm:text-2xl text-slate-500 leading-snug tracking-tight mb-6">
          Sign-in for this portal account has been removed. Studio records for active work may remain, but they are no
          longer tied to a login.
        </p>
        <p className="max-w-xl text-lg text-slate-500 leading-snug tracking-tight mb-16">
          You can create a new account with the same email anytime — past bookings may reattach when you register again.
        </p>
        <div className="flex flex-wrap items-center gap-8">
          <Link
            to="/"
            className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Home
          </Link>
          <Link
            to="/portal/register"
            className="inline-flex items-center gap-3 bg-black text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.4em] hover:bg-slate-800 transition-colors"
          >
            Create a new account
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </PageFade>
  );
}
