import { Link } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import { PageFade } from "../motion";

/** Public landing after a portal account was deleted. No auth required. */
export function AccountDeletedScreen() {
  usePageMeta({
    title: `Account deleted — ${SITE.name}`,
    path: "/portal/account-deleted",
    noIndex: true,
  });

  return (
    <PageFade className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a]">
      <header className="border-b border-black/10">
        <div className="max-w-[var(--page-max)] mx-auto px-[var(--page-gutter)] py-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex flex-col leading-tight">
            <span className="text-lg font-semibold tracking-tight">{SITE.brand}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Client portal</span>
          </Link>
          <Link to="/" className="text-sm text-slate-500 hover:text-black">
            Site
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-[var(--page-gutter)] py-16 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Account</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
          Your account is <span className="italic font-normal text-slate-400">gone.</span>
        </h1>
        <p className="mt-4 text-slate-600 leading-relaxed">
          Sign-in for this portal account has been removed. Engagement records CasinWorks keeps for active work may
          still exist on the studio side — they are no longer tied to a login.
        </p>
        <p className="mt-3 text-slate-600 leading-relaxed">
          If you change your mind later, you can create a new account with the same email. Past bookings may reattach
          when you register again.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/" className="rounded-full bg-black text-white px-6 py-3 text-sm font-semibold">
            Back to CasinWorks
          </Link>
          <Link
            to="/portal/register"
            className="rounded-full border border-black/15 px-6 py-3 text-sm font-semibold"
          >
            Create a new account
          </Link>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          Questions?{" "}
          <a href={`mailto:${SITE.email}`} className="underline underline-offset-4 hover:text-black">
            {SITE.email}
          </a>
        </p>
      </main>
    </PageFade>
  );
}
