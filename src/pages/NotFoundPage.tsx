import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePageMeta } from "../hooks/usePageMeta";
import { SITE } from "../site";

export default function NotFoundPage() {
  usePageMeta({
    title: `Page not found — ${SITE.name}`,
    description: "This page does not exist. Return to C. J. Casin’s independent engineering portfolio.",
    path: "/404",
    noIndex: true,
  });

  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a] px-6 sm:px-8 lg:px-16 py-32 sm:py-40">
      <div className="max-w-[1800px] mx-auto">
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 mb-10">404</p>
        <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-bold italic tracking-tighter leading-[0.9] mb-8">
          Page not found.
        </h1>
        <p className="max-w-xl text-xl sm:text-2xl text-slate-500 leading-snug tracking-tight mb-16">
          The URL may be outdated or mistyped. Head back to the portfolio or start a consultation.
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
            to="/#contact"
            className="inline-flex items-center gap-3 bg-black text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.4em] hover:bg-slate-800 transition-colors"
          >
            Consultation
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
