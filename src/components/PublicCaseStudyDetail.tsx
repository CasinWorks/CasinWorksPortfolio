import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { CaseStudy } from "../site";

export function PublicCaseStudyDetail({ study }: { study: CaseStudy }) {
  return (
    <article className="space-y-16">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="inline-flex items-center rounded-full border border-slate-700 bg-black/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
          {study.sector}
        </span>
        <a
          href={study.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-3 rounded-full bg-white text-black px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.35em] hover:bg-slate-200 transition-colors"
        >
          Live demo
          <ArrowUpRight className="size-4 opacity-70 group-hover:opacity-100" aria-hidden />
        </a>
      </div>

      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold leading-[0.95] tracking-tighter text-white">
        {study.title}
      </h1>
      <p className="text-xl sm:text-2xl text-slate-400 leading-snug tracking-tight max-w-3xl">{study.subtitle}</p>

      <div className="rounded-3xl border border-slate-800 bg-black/25 p-8 sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">Primary outcome</p>
        <p className="mt-6 text-2xl sm:text-3xl text-slate-200 leading-tight tracking-tight">{study.primaryOutcome}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-12">
        <div className="space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">The problem</p>
          <ul className="space-y-4 text-lg sm:text-xl text-slate-400 leading-snug tracking-tight">
            {study.problem.map((p) => (
              <li key={p} className="flex gap-4">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500 shrink-0" aria-hidden />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">The solution</p>
          <ul className="space-y-4 text-lg sm:text-xl text-slate-400 leading-snug tracking-tight">
            {study.solution.map((s) => (
              <li key={s} className="flex gap-4">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500 shrink-0" aria-hidden />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">Key features</p>
          <ul className="space-y-3 text-base sm:text-lg text-slate-400 leading-snug">
            {study.keyFeatures.map((f) => (
              <li key={f} className="flex gap-3">
                <span className="mt-2 h-1 w-1 rounded-full bg-slate-600 shrink-0" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">Feasibility</p>
          <ul className="space-y-3 text-base sm:text-lg text-slate-400 leading-snug">
            {study.feasibility.map((f) => (
              <li key={f} className="flex gap-3">
                <span className="mt-2 h-1 w-1 rounded-full bg-slate-600 shrink-0" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">Next steps</p>
          <ul className="space-y-3 text-base sm:text-lg text-slate-400 leading-snug">
            {study.roadmap.map((r) => (
              <li key={r} className="flex gap-3">
                <span className="mt-2 h-1 w-1 rounded-full bg-slate-600 shrink-0" aria-hidden />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 pt-4">
        <Link
          to="/#contact"
          className="group inline-flex items-center gap-4 rounded-full border border-white/15 bg-white/10 px-8 py-4 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white/15 transition-colors"
        >
          Build something similar
          <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" aria-hidden />
        </Link>
        <a
          href={study.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-white transition-colors"
        >
          View live demo <ArrowUpRight className="size-5" aria-hidden />
        </a>
        <Link
          to="/#work"
          className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 hover:text-slate-300 transition-colors"
        >
          All case studies
        </Link>
      </div>
    </article>
  );
}
