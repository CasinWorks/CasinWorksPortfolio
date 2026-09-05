import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { JsonLd } from "./JsonLd";
import { FAQS, SITE } from "../site";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  const faqSchema = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    }),
    [],
  );

  return (
    <section id="faq" className="border-t border-slate-700/80 bg-[#1a1a1a] text-white section-y px-[var(--page-gutter)]">
      <JsonLd id="faq" data={faqSchema} />
      <div className="max-w-[var(--page-max)] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        <div className="lg:col-span-4 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-4">FAQ</p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold italic leading-snug tracking-tight mb-4">
            Straight answers.
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-sm">
            {SITE.responseTimePromise} Or{" "}
            <Link to="/portal/register" className="text-white font-medium underline underline-offset-4 hover:text-slate-300">
              sign up to the portal
            </Link>{" "}
            and book a consultation slot yourself. Prefer email?{" "}
            <a href={`mailto:${SITE.email}`} className="text-white font-medium underline underline-offset-4 hover:text-slate-300">
              Write directly
            </a>
            .
          </p>
        </div>

        <div className="lg:col-span-7 lg:col-start-6 min-w-0 divide-y divide-slate-700 border-y border-slate-700">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `${baseId}-panel-${index}`;
            const buttonId = `${baseId}-button-${index}`;

            return (
              <div key={item.question} className="py-2">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full items-start justify-between gap-4 py-4 text-left group"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <span className="text-base sm:text-lg font-semibold tracking-tight leading-snug group-hover:text-slate-300 transition-colors">
                      {item.question}
                    </span>
                    <Plus
                      className={`mt-1 size-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-45 text-white" : ""}`}
                      aria-hidden
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 pr-8 text-sm sm:text-base text-slate-300 leading-relaxed">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
