import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { usePageMeta } from "../hooks/usePageMeta";
import { SITE } from "../site";

export default function ThankYouPage() {
  usePageMeta({
    title: `Thank you — ${SITE.name}`,
    description: "Your consultation inquiry was received. I’ll reply within 1 business day.",
    path: "/thank-you",
    noIndex: true,
  });

  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a] px-6 sm:px-8 lg:px-16 py-32 sm:py-40">
      <div className="mx-auto max-w-3xl">
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 mb-10">Inquiry received</p>
        <h1 className="font-serif text-5xl sm:text-7xl font-bold italic tracking-tighter leading-[0.9] mb-8">
          Thank you.
        </h1>
        <p className="text-xl sm:text-2xl text-slate-500 leading-snug tracking-tight mb-6">
          Your message is in. {SITE.responseTimePromise}
        </p>
        <p className="text-lg text-slate-500 leading-relaxed mb-16 max-w-xl">
          If your brief is urgent, you can also reach me directly at{" "}
          <a href={`mailto:${SITE.email}`} className="font-medium text-[#1a1a1a] underline underline-offset-4 hover:opacity-70">
            {SITE.email}
          </a>
          .
        </p>
        <Link
          to="/"
          className="group inline-flex items-center gap-4 text-2xl sm:text-3xl font-bold border-b-4 border-black pb-3 hover:border-slate-300 transition-colors"
        >
          Back to portfolio
          <ArrowRight className="size-8 group-hover:translate-x-2 transition-transform" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
