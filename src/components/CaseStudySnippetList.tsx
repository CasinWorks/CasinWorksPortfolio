import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { CASE_STUDY_LIST, caseStudyPath } from "../site";

export function CaseStudySnippetList() {
  return (
    <div className="divide-y divide-slate-800">
      {CASE_STUDY_LIST.map((item, index) => (
        <motion.div
          key={item.slug}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: index * 0.05 }}
          className="py-20 sm:py-28 lg:py-32 grid lg:grid-cols-12 gap-10 lg:gap-16 items-start group"
        >
          <div className="lg:col-span-3">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
              {item.sector}
            </span>
            {item.confidential && (
              <span className="mt-4 block text-[10px] font-black uppercase tracking-[0.35em] text-slate-600">
                NDA
              </span>
            )}
          </div>
          <div className="lg:col-span-4">
            <h4 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold group-hover:text-slate-300 transition-colors leading-[0.95] tracking-tighter">
              {item.title}
            </h4>
          </div>
          <div className="lg:col-span-5 flex flex-col gap-8">
            <p className="text-slate-400 leading-snug text-xl sm:text-2xl lg:text-3xl tracking-tight">
              {item.snippet}
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <Link
                to={caseStudyPath(item.slug)}
                className="group inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-white hover:text-slate-300 transition-colors"
              >
                Read more
                <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" aria-hidden />
              </Link>
              {item.liveUrl && (
                <a
                  href={item.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 hover:text-slate-300 transition-colors"
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
