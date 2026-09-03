import React, { useState } from 'react';
import { JobPosting } from '../types';
import { GigDetailModal } from './GigDetailModal';
import { 
  ArrowRight, 
  MapPin, 
  User, 
  Clock, 
  Search, 
  CheckCircle2, 
  ShieldCheck, 
  ChevronRight,
  Filter
} from 'lucide-react';

interface GigBoardScreenProps {
  gigs: JobPosting[];
  onApplyGig: (gigId: string) => void;
  onNavigateToProgress?: () => void;
}

export const GigBoardScreen: React.FC<GigBoardScreenProps> = ({
  gigs,
  onApplyGig,
  onNavigateToProgress,
}) => {
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGig, setSelectedGig] = useState<JobPosting | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const disciplines = [
    'All',
    'Aerospace & Fluid Dynamics',
    'Cryogenics & High-Pressure Fluidics',
    'Avionics & Control Theory',
    'Materials Science & Manufacturing',
  ];

  const filteredGigs = gigs.filter((gig) => {
    const matchesDiscipline =
      selectedDiscipline === 'All' || gig.discipline === selectedDiscipline;
    const matchesQuery =
      gig.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.postedBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDiscipline && matchesQuery;
  });

  return (
    <div id="gig-board-screen" className="pb-16 font-sans">
      {/* Editorial Header Section */}
      <div className="px-5 pt-6 pb-5 border-b border-[#17171A]/10 bg-[#EDEAE2]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] font-mono tracking-widest text-[#8A93AD] uppercase block">
              CasinWorks // Subcontractor Registry
            </span>
            <span className="text-[10px] tracking-wider text-[#17171A]/60 uppercase font-mono">
              We make things work.
            </span>
          </div>
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#17171A]/5 text-[#17171A] border border-[#17171A]/15">
            <span>Verified Fellows</span>
          </div>
        </div>

        {/* Headline with upright serif + italic accent in muted blue-grey */}
        <h1 className="text-2xl sm:text-3xl font-serif text-[#17171A] leading-tight">
          High-Stakes Engagements & <span className="italic text-[#8A93AD]">Open Postings.</span>
        </h1>
        <p className="mt-1.5 text-xs text-[#17171A]/70 leading-relaxed max-w-lg font-sans">
          Curated specialized roles for independent technical fellows, principals, and specialized test facilities.
        </p>

        {/* Search Bar with hairline border */}
        <div className="mt-4 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discipline, location, or partner..."
            className="w-full pl-9 pr-4 py-2 bg-[#FAF8F5] border border-[#17171A]/15 rounded text-xs text-[#17171A] placeholder-[#8A93AD] focus:outline-none focus:border-[#17171A]"
          />
          <Search className="w-3.5 h-3.5 text-[#8A93AD] absolute left-3 top-2.5" />
        </div>

        {/* Filter Pills */}
        <div className="mt-3 flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {disciplines.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDiscipline(d)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                selectedDiscipline === d
                  ? 'bg-[#17171A] text-[#EDEAE2]'
                  : 'bg-[#FAF8F5] text-[#17171A]/70 border border-[#17171A]/15 hover:text-[#17171A]'
              }`}
            >
              {d === 'All' ? 'All Roles' : d.split('&')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Postings Count Bar */}
      <div className="px-5 py-2.5 bg-[#FAF8F5] border-b border-[#17171A]/10 flex items-center justify-between text-xs font-mono">
        <span className="text-[#8A93AD]">OPEN POSTINGS ({filteredGigs.length})</span>
        <span className="text-[#17171A]/60">VETTED INDEPENDENT TEAMS</span>
      </div>

      {/* Gig List - Hairline dividers instead of card shadows */}
      <div className="divide-y divide-[#17171A]/10 border-b border-[#17171A]/10 bg-[#EDEAE2]">
        {filteredGigs.map((gig) => {
          return (
            <div
              key={gig.id}
              id={`gig-item-${gig.id}`}
              onClick={() => {
                setSelectedGig(gig);
                setIsModalOpen(true);
              }}
              className="p-5 hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {/* Discipline & Client Code */}
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A93AD]">
                      {gig.discipline}
                    </span>
                    <span className="text-[10px] text-[#8A93AD] font-mono">•</span>
                    <span className="text-[10px] font-mono text-[#17171A]/50">
                      {gig.clientCode}
                    </span>
                  </div>

                  {/* Role Title (Prompt Requirement) */}
                  <h3 className="text-base sm:text-lg font-serif font-medium text-[#17171A] leading-snug group-hover:text-black transition-colors">
                    {gig.title}
                  </h3>

                  {/* Location/Remote tag (Prompt Requirement) */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-[#FAF8F5] border border-[#17171A]/15 text-[#17171A]">
                      <MapPin className="w-3 h-3 text-[#8A93AD]" />
                      <span>{gig.location}</span>
                    </span>

                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border border-[#17171A]/15 text-[#17171A]">
                      {gig.workType}
                    </span>

                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-[#17171A] bg-[#17171A]/5">
                      {gig.rate}
                    </span>

                    {gig.securityClearance && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono text-[#8A93AD] border border-[#8A93AD]/30">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>{gig.securityClearance.split('/')[0]}</span>
                      </span>
                    )}
                  </div>

                  {/* Posted-by Label (Prompt Requirement) */}
                  <div className="pt-1.5 flex items-center space-x-1.5 text-xs text-[#17171A]/70">
                    <User className="w-3 h-3 text-[#8A93AD]" />
                    <span className="font-mono text-[11px] text-[#8A93AD]">Posted by:</span>
                    <span className="font-medium text-[#17171A] text-[11px]">{gig.postedBy}</span>
                  </div>

                  {/* One-sentence summary */}
                  <p className="text-xs text-[#17171A]/75 font-sans line-clamp-2 leading-relaxed pt-1">
                    {gig.summary}
                  </p>
                </div>

                {/* Right side CTA Arrow / Applied status */}
                <div className="shrink-0 flex flex-col items-end justify-between self-stretch">
                  {gig.isApplied ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-mono uppercase bg-[#8A93AD]/20 text-[#17171A] border border-[#8A93AD]/40">
                      <CheckCircle2 className="w-3 h-3 text-[#8A93AD]" />
                      <span>Applied</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#17171A] text-[#EDEAE2] group-hover:bg-black transition-colors">
                      <span>View</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Subcontractor Standards Banner */}
      <div className="p-6 bg-[#FAF8F5] border-b border-[#17171A]/10 text-center space-y-2">
        <h4 className="text-sm font-serif text-[#17171A]">
          Direct Peer-Reviewed Vetting
        </h4>
        <p className="text-xs text-[#17171A]/70 max-w-sm mx-auto leading-relaxed">
          Every contractor at CasinWorks operates under rigorous non-disclosure and direct partner sponsorship.
        </p>
      </div>

      {/* Gig Detail Modal */}
      <GigDetailModal
        gig={selectedGig}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onApply={onApplyGig}
      />
    </div>
  );
};
