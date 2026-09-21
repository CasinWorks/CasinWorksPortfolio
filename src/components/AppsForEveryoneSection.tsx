import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { APPS_DATA } from "../apps-for-everyone/data";

export function AppsForEveryoneSection() {
  return (
    <div>
      <div className="max-w-3xl mb-10 sm:mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 mb-4">
          Independent practice
        </p>
        <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold italic leading-[1.05] tracking-tight">
          Applied R&D.
        </h3>
        <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
          Smaller products built and shipped independently — to test ideas, sharpen tooling, and stay hands-on with
          real-world software problems outside of client engagements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {APPS_DATA.map((app, index) => (
          <motion.article
            key={app.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: index * 0.05 }}
            className="flex flex-col justify-between border border-slate-700 bg-[#141414] p-6 sm:p-7 hover:border-slate-500 transition-colors duration-500 group"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  {app.category}
                </span>
                {app.status === "COMING SOON" && (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 border border-slate-600 px-2 py-1 shrink-0">
                    Coming soon
                  </span>
                )}
              </div>
              {app.image && (
                <img
                  src={app.image}
                  alt={`${app.name} logo`}
                  className="mt-4 h-14 w-14 object-cover border border-slate-700"
                />
              )}
              <h4 className="mt-3 text-xl sm:text-2xl font-serif font-semibold leading-snug tracking-tight group-hover:text-slate-200 transition-colors">
                {app.name}
              </h4>
              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                {app.description}
              </p>
              {app.platforms && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {app.platforms}
                </p>
              )}
            </div>
            <div className="mt-8 pt-5 border-t border-slate-700 flex flex-wrap items-center gap-4">
              {app.status === "COMING SOON" ? (
                app.url ? (
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Preview
                    <ArrowUpRight className="size-4" aria-hidden />
                  </a>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Coming soon
                  </span>
                )
              ) : (
                <>
                  {app.url && (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:text-slate-300 transition-colors"
                    >
                      {app.demoLabel ?? "Live demo"}
                      <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  )}
                  {app.appStoreUrl && (
                    <a
                      href={app.appStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:text-slate-300 transition-colors"
                    >
                      App Store
                      <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  )}
                </>
              )}
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
