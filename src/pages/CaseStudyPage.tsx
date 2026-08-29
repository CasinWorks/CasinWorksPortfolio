import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ConfidentialCaseStudyDetail } from "../components/ConfidentialCaseStudyDetail";
import { ConceptCaseStudyDetail } from "../components/ConceptCaseStudyDetail";
import { JsonLd } from "../components/JsonLd";
import { usePageMeta } from "../hooks/usePageMeta";
import { caseStudyPath, isConceptCaseStudy, resolveCaseStudy, SITE } from "../site";
import NotFoundPage from "./NotFoundPage";

export default function CaseStudyPage() {
  const { slug } = useParams<{ slug: string }>();
  const study = slug ? resolveCaseStudy(slug) : null;

  usePageMeta({
    title: study
      ? `${study.title} — Case Study | ${SITE.name}`
      : `Case study not found — ${SITE.name}`,
    description: study?.snippet ?? SITE.description,
    path: study && slug ? caseStudyPath(study.id) : `/case-studies/${slug ?? ""}`,
    type: "article",
    noIndex: !study,
  });

  const articleSchema = useMemo(() => {
    if (!study) return null;
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: study.title,
      description: study.snippet,
      url: `${SITE.url}${caseStudyPath(study.id)}`,
      author: { "@id": `${SITE.url}/#person` },
      publisher: { "@id": `${SITE.url}/#organization` },
    };
  }, [study]);

  if (!study) {
    return <NotFoundPage />;
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {articleSchema && <JsonLd id="case-study" data={articleSchema} />}
      <header className="border-b border-slate-800">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-16 py-8 flex items-center justify-between gap-6">
          <Link to="/" className="flex flex-col leading-none hover:opacity-80 transition-opacity">
            <span className="text-2xl font-serif font-bold tracking-tighter italic">{SITE.brand}</span>
            <span className="text-[8px] uppercase tracking-[0.5em] opacity-50 font-black">Independent Engineering</span>
          </Link>
          <Link
            to="/#work"
            className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Link>
        </div>
      </header>

      <main className="px-6 sm:px-8 lg:px-16 py-16 sm:py-24 lg:py-32">
        <div className="max-w-[1800px] mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500 mb-12">Case Study</p>
          {isConceptCaseStudy(study) ? (
            <ConceptCaseStudyDetail study={study} />
          ) : (
            <ConfidentialCaseStudyDetail study={study} />
          )}
        </div>
      </main>
    </div>
  );
}
