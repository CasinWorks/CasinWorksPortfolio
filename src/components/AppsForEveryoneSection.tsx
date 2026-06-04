import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { APPS_DATA } from "../apps-for-everyone/data";
import { APPS_FOR_EVERYONE_PATH } from "../site";

export function AppsForEveryoneSection() {
  return (
    <div id="apps-for-everyone" className="scroll-mt-36 mt-32 pt-32 border-t border-slate-800">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-16 lg:gap-24 mb-20">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500 mb-8">
            Shipped Products
          </p>
          <h3 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold italic leading-[0.9] tracking-tighter">
            Apps For Everyone.
          </h3>
          <p className="mt-8 text-xl sm:text-2xl text-slate-400 leading-snug tracking-tight max-w-2xl">
            Independent software built for everyday Filipinos — free, local-first, and designed for real workflows.
            No subscriptions, no server-side data harvesting.
          </p>
        </div>
        <Link
          to={APPS_FOR_EVERYONE_PATH}
          className="group inline-flex items-center gap-4 rounded-full bg-white text-black px-8 py-4 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-slate-200 transition-colors shrink-0"
        >
          Explore full directory
          <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {APPS_DATA.map((app, index) => (
          <motion.article
            key={app.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, delay: index * 0.06 }}
            className="flex flex-col justify-between border border-slate-800 bg-[#141414] p-8 sm:p-10 hover:border-slate-600 transition-colors duration-500 group"
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
                {app.category}
              </span>
              <h4 className="mt-6 text-2xl sm:text-3xl font-serif font-bold leading-tight tracking-tighter group-hover:text-slate-300 transition-colors">
                {app.name}
              </h4>
              <p className="mt-6 text-base sm:text-lg text-slate-400 leading-snug tracking-tight">
                {app.description}
              </p>
            </div>
            <div className="mt-10 pt-8 border-t border-slate-800 flex flex-wrap items-center gap-4">
              <a
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-white hover:text-slate-300 transition-colors"
              >
                Live demo
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
              <Link
                to={APPS_FOR_EVERYONE_PATH}
                className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500 hover:text-slate-300 transition-colors"
              >
                In directory
              </Link>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
