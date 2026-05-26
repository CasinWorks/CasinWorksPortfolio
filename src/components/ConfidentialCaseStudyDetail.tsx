import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ConfidentialCaseStudy } from "../site";

export function ConfidentialCaseStudyDetail({ study }: { study: ConfidentialCaseStudy }) {
  return (
    <article className="space-y-16">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="inline-flex items-center rounded-full border border-slate-700 bg-black/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
          {study.sector}
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-slate-300">
          {study.label}
        </span>
      </div>

      <h1 className="max-w-5xl text-4xl sm:text-5xl lg:text-6xl font-serif font-bold leading-[0.95] tracking-tighter text-white">
        {study.title}
      </h1>

      <p className="text-lg sm:text-xl text-slate-300 leading-snug tracking-tight max-w-3xl">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 block mb-3">
          Role
        </span>
        {study.role}
      </p>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500 mb-4">
          Core infrastructure
        </p>
        <div className="flex flex-wrap gap-3">
          {study.coreStack.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full border border-slate-700 bg-black/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-14">
        {study.sections.map((section, index) => (
          <div key={section.title} className="border-t border-slate-800 pt-14 first:border-t-0 first:pt-0">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 mb-4">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-slate-100">
              {section.title}
            </h2>
            {section.intro && (
              <p className="mt-6 text-lg sm:text-xl text-slate-400 leading-snug tracking-tight max-w-4xl">
                {section.intro}
              </p>
            )}
            {section.bullets && (
              <ul className="mt-8 space-y-6 max-w-4xl">
                {section.bullets.map((b) => (
                  <li key={b.heading} className="flex gap-4">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500 shrink-0" aria-hidden />
                    <div>
                      <span className="font-semibold text-slate-200">{b.heading}: </span>
                      <span className="text-lg sm:text-xl text-slate-400 leading-snug">{b.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {section.items && (
              <ul className="mt-8 space-y-4 max-w-4xl">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-4">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500 shrink-0" aria-hidden />
                    <span className="text-lg sm:text-xl text-slate-400 leading-snug tracking-tight">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-black/25 p-8 sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">The outcome</p>
        <ul className="mt-8 space-y-6">
          {study.results.map((r) => (
            <li key={r} className="text-xl sm:text-2xl text-slate-200 leading-snug tracking-tight">
              {r}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-slate-500 leading-relaxed max-w-3xl">
        Client identity, facility details, and internal metrics are withheld per NDA. Additional automotive and
        semiconductor engagements are available for qualified inquiries.
      </p>

      <div className="flex flex-wrap items-center gap-6 pt-4">
        <Link
          to="/#contact"
          className="group inline-flex items-center gap-4 rounded-full border border-white/15 bg-white/10 px-8 py-4 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white/15 transition-colors"
        >
          Build something similar
          <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" aria-hidden />
        </Link>
        <Link
          to="/#work"
          className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-white transition-colors"
        >
          All case studies <ArrowUpRight className="size-5" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
