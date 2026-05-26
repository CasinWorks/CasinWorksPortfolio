import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ConfidentialCaseStudyDetail } from "../components/ConfidentialCaseStudyDetail";
import { PublicCaseStudyDetail } from "../components/PublicCaseStudyDetail";
import { resolveCaseStudy } from "../site";

export default function CaseStudyPage() {
  const { slug } = useParams<{ slug: string }>();
  const resolved = slug ? resolveCaseStudy(slug) : null;

  if (!resolved) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white px-8 py-32">
        <div className="max-w-[1800px] mx-auto">
          <p className="text-2xl font-serif font-bold italic mb-8">Case study not found.</p>
          <Link
            to="/#work"
            className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to case studies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <header className="border-b border-slate-800">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-16 py-8 flex items-center justify-between gap-6">
          <Link to="/" className="flex flex-col leading-none hover:opacity-80 transition-opacity">
            <span className="text-2xl font-serif font-bold tracking-tighter italic">C. J. Casin</span>
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
          {resolved.kind === "confidential" ? (
            <ConfidentialCaseStudyDetail study={resolved.study} />
          ) : (
            <PublicCaseStudyDetail study={resolved.study} />
          )}
        </div>
      </main>
    </div>
  );
}
