import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { CASE_STUDY_LIST, caseStudyPath } from "../site";

export function CaseStudySnippetList() {
  return (
    <div className="divide-y divide-slate-700/80 border-y border-slate-700/80">
      {CASE_STUDY_LIST.map((item, index) => (
        <motion.div
          key={item.slug}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: index * 0.05 }}
          className="py-10 sm:py-12 lg:py-14 grid lg:grid-cols-12 gap-5 lg:gap-12 items-start group"
        >
          <div className="lg:col-span-5 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
              {item.sector}
              {item.confidential ? " · NDA" : item.label ? ` · ${item.label}` : ""}
            </p>
            <h4 className="mt-3 text-xl sm:text-2xl font-serif font-semibold leading-snug tracking-tight text-white group-hover:text-slate-200 transition-colors">
              {item.title}
            </h4>
          </div>
          <div className="lg:col-span-7 flex flex-col gap-5 min-w-0">
            <p className="text-slate-300 leading-relaxed text-base sm:text-lg">
              {item.snippet}
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Link
                to={caseStudyPath(item.slug)}
                className="group/link inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:text-slate-300 transition-colors"
              >
                Read more
                <ArrowRight className="size-4 group-hover/link:translate-x-1 transition-transform" aria-hidden />
              </Link>
              {item.liveUrl && (
                <a
                  href={item.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Live demo
                </a>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
