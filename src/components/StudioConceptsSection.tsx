import { CaseStudySnippetList } from "./CaseStudySnippetList";
import { CONCEPT_STUDY_LIST } from "../site";

export function StudioConceptsSection() {
  return (
    <div id="studio-concepts" className="mt-16 sm:mt-20 pt-16 sm:pt-20 border-t border-slate-700/80">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 lg:gap-16 mb-10 sm:mb-12">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 mb-4">
            Studio concepts
          </p>
          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold italic leading-[1.05] tracking-tight">
            Concept.
          </h3>
          <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            Public demos from the CasinWorks studio — not client engagements, and not purchased products.
            Each house can be commissioned on its own: jets, limousines, or a parent brand portal.
          </p>
        </div>
      </div>

      <CaseStudySnippetList items={CONCEPT_STUDY_LIST} />
    </div>
  );
}
