import React, { useState } from 'react';
import { ProjectEngagement, Waypoint, ProjectDocument } from '../types';
import { GolfFairwayVisual } from './GolfFairwayVisual';
import { ActionReviewModal } from './ActionReviewModal';
import { DocumentsSection } from './DocumentsSection';
import { INITIAL_PROJECT_DOCUMENTS } from '../data';
import { X, MoreHorizontal, CheckCircle2, ChevronDown, FileText, ArrowRight } from 'lucide-react';

interface GolfProgressScreenProps {
  projects: ProjectEngagement[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onNavigateToGigBoard?: () => void;
  documents?: ProjectDocument[];
  onUpdateDocuments?: (docs: ProjectDocument[]) => void;
  initialView?: 'course' | 'timeline' | 'documents';
}

export const GolfProgressScreen: React.FC<GolfProgressScreenProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  documents: externalDocs,
  onUpdateDocuments: externalUpdateDocs,
  initialView = 'course',
}) => {
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const [conceptView, setConceptView] = useState<'course' | 'timeline' | 'documents'>(initialView);
  const [localDocs, setLocalDocs] = useState<ProjectDocument[]>(INITIAL_PROJECT_DOCUMENTS);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(activeProject.waypoints);
  const [actionModalWaypoint, setActionModalWaypoint] = useState<Waypoint | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const currentDocs = externalDocs || localDocs;
  const handleUpdateDocs = (newDocs: ProjectDocument[]) => {
    if (externalUpdateDocs) {
      externalUpdateDocs(newDocs);
    } else {
      setLocalDocs(newDocs);
    }
  };

  // Sync when activeProject changes
  React.useEffect(() => {
    setWaypoints(activeProject.waypoints);
  }, [activeProjectId, activeProject]);

  const handleResolveAction = (wpId: string) => {
    setWaypoints((prev) =>
      prev.map((wp) => {
        if (wp.id === wpId) {
          return {
            ...wp,
            status: 'done',
            calloutTitle: 'Payment completed — Phase 2',
            calloutSubtitle: undefined,
            actionRequired: undefined,
          };
        }
        return wp;
      })
    );
    setToastMessage('Payment authorized & signed. Milestone unlocked.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleReset = () => {
    setWaypoints(activeProject.waypoints);
    setToastMessage('Progress concept reset to default state.');
    setTimeout(() => setToastMessage(null), 3000);
    setShowMenu(false);
  };

  const handleOpenAction = (wp: Waypoint) => {
    if (wp.actionRequired) {
      setActionModalWaypoint(wp);
      setIsActionModalOpen(true);
    }
  };

  // Milestone 3 (Payment)
  const paymentWp = waypoints.find((w) => w.id === 'wp-3') || waypoints[2];

  if (conceptView === 'documents') {
    return (
      <DocumentsSection
        project={activeProject}
        documents={currentDocs}
        onUpdateDocuments={handleUpdateDocs}
        onClose={() => setConceptView('course')}
        onNavigateToCourse={() => setConceptView('course')}
      />
    );
  }

  return (
    <div id="progress-concepts-container" className="bg-[#F4F1EA] min-h-screen text-[#17171A] font-sans pb-12 select-none">
      {/* Top Modal Header */}
      <div className="pt-2 px-4 pb-2 border-b border-[#E5DFD2] flex items-center justify-between sticky top-0 bg-[#F4F1EA]/95 backdrop-blur z-20">
        {/* Close Button */}
        <button
          onClick={handleReset}
          id="modal-close-btn"
          title="Reset / Dismiss"
          className="w-9 h-9 rounded-full bg-[#EAE6DE] hover:bg-[#DDD8CE] flex items-center justify-center text-[#1E1E1B] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex flex-col items-center">
          <span className="font-semibold text-[15px] tracking-tight text-[#17171A]">
            progress-concepts
          </span>
        </div>

        {/* Options / Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            id="modal-options-btn"
            title="Switch Concept View"
            className="w-9 h-9 rounded-full bg-[#EAE6DE] hover:bg-[#DDD8CE] flex items-center justify-center text-[#1E1E1B] transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Quick Concept Switcher Dropdown */}
          {showMenu && (
            <div className="absolute right-0 top-11 w-52 bg-[#FAF8F5] border border-[#DDD7C8] rounded-xl shadow-xl p-2 z-30 space-y-1">
              <div className="text-[11px] font-mono text-[#7A756D] px-2 py-1 uppercase tracking-wider">
                Concept Views
              </div>
              <button
                onClick={() => {
                  setConceptView('course');
                  setShowMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                  conceptView === 'course'
                    ? 'bg-[#1F1E1B] text-[#FFFFFF]'
                    : 'text-[#17171A] hover:bg-[#EDEAE2]'
                }`}
              >
                <span>The course, so far</span>
                <span className="text-[10px] opacity-70">Course</span>
              </button>

              <button
                onClick={() => {
                  setConceptView('timeline');
                  setShowMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                  conceptView === 'timeline'
                    ? 'bg-[#1F1E1B] text-[#FFFFFF]'
                    : 'text-[#17171A] hover:bg-[#EDEAE2]'
                }`}
              >
                <span>Where things stand</span>
                <span className="text-[10px] opacity-70">Timeline</span>
              </button>

              <button
                onClick={() => {
                  setConceptView('documents');
                  setShowMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                  conceptView === 'documents'
                    ? 'bg-[#1F1E1B] text-[#FFFFFF]'
                    : 'text-[#17171A] hover:bg-[#EDEAE2]'
                }`}
              >
                <span>Project documents</span>
                <span className="text-[10px] opacity-70 font-mono">PO/IN/RM</span>
              </button>

              <div className="border-t border-[#E5DFD2] pt-1 mt-1">
                <button
                  onClick={handleReset}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#7A756D] hover:text-[#17171A] rounded"
                >
                  Reset to initial state
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Concept Segmented Switcher Pill */}
      <div className="px-5 pt-3 pb-1 flex justify-center">
        <div className="inline-flex bg-[#EAE6DE] p-1 rounded-full border border-[#DDD7C8]/70">
          <button
            onClick={() => setConceptView('course')}
            id="view-course-pill"
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              conceptView === 'course'
                ? 'bg-[#1F1E1B] text-white shadow-sm'
                : 'text-[#635F57] hover:text-[#1F1E1B]'
            }`}
          >
            The course
          </button>
          <button
            onClick={() => setConceptView('timeline')}
            id="view-timeline-pill"
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              conceptView === 'timeline'
                ? 'bg-[#1F1E1B] text-white shadow-sm'
                : 'text-[#635F57] hover:text-[#1F1E1B]'
            }`}
          >
            Where things stand
          </button>
          <button
            onClick={() => setConceptView('documents')}
            id="view-documents-pill"
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              conceptView === 'documents'
                ? 'bg-[#1F1E1B] text-white shadow-sm'
                : 'text-[#635F57] hover:text-[#1F1E1B]'
            }`}
          >
            Documents
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="mx-5 my-2 px-3.5 py-2.5 bg-[#1F1E1B] text-[#FFFFFF] text-xs rounded-lg shadow-md flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#8492A6] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="px-6 pt-4">
        {/* VIEW 1: THE COURSE, SO FAR (IMAGE 1) */}
        {conceptView === 'course' && (
          <div id="course-concept-view">
            {/* Header typography matching IMG_3932.png */}
            <div className="mb-4">
              <span className="text-[13px] text-[#7A756D] font-normal block font-sans">
                Project progress
              </span>
              <h1 className="text-[27px] leading-tight font-serif font-bold text-[#17171A] tracking-tight mt-0.5">
                The <span className="italic font-normal text-[#8492A6]">course,</span> so far.
              </h1>
              <p className="text-[13px] text-[#7A756D] mt-1 font-sans">
                A hole-by-hole view of where things stand.
              </p>

              <div className="mt-5">
                <h2 className="text-[20px] font-serif font-bold text-[#17171A] leading-snug">
                  {activeProject.title}
                </h2>
                <p className="text-[12px] text-[#7A756D] mt-0.5 font-sans">
                  Started {activeProject.startDate} · Target finish {activeProject.targetCompletionDate}
                </p>
              </div>
            </div>

            {/* Fairway Visual Ribbon Graphic */}
            <div className="my-1">
              <GolfFairwayVisual
                waypoints={waypoints}
                onOpenAction={handleOpenAction}
                onSelectWaypoint={handleOpenAction}
              />
            </div>

            {/* Milestone Summary List below fairway matching IMG_3932.png */}
            <div className="mt-2 border-t border-[#E5DFD2]">
              {/* Row 1: Hardware install */}
              <div className="py-3 border-b border-[#E5DFD2] flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1F1E1B] shrink-0" />
                  <div>
                    <div className="font-bold text-[14px] text-[#1F1E1B] leading-tight">
                      Hardware install
                    </div>
                    <div className="text-[12px] text-[#7A756D]">
                      Jul 18
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-[#EAE6DE] text-[#635F57] text-[11px] font-medium px-2.5 py-0.5">
                  Done
                </span>
              </div>

              {/* Row 2: Integration testing */}
              <div className="py-3 border-b border-[#E5DFD2] flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1F1E1B] shrink-0" />
                  <div>
                    <div className="font-bold text-[14px] text-[#1F1E1B] leading-tight">
                      Integration testing
                    </div>
                    <div className="text-[12px] text-[#7A756D]">
                      Aug 5
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-[#EAE6DE] text-[#635F57] text-[11px] font-medium px-2.5 py-0.5">
                  Done
                </span>
              </div>

              {/* Row 3: Payment — Phase 2 */}
              <div
                onClick={() => handleOpenAction(paymentWp)}
                className="py-3 border-b border-[#E5DFD2] flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      paymentWp.status === 'done' ? 'bg-[#1F1E1B]' : 'bg-[#BA593E]'
                    }`}
                  />
                  <div>
                    <div className="font-bold text-[14px] text-[#1F1E1B] leading-tight group-hover:text-[#BA593E] transition-colors">
                      Payment — Phase 2
                    </div>
                    <div className="text-[12px] text-[#7A756D]">
                      Due Aug 30
                    </div>
                  </div>
                </div>
                {paymentWp.status === 'done' ? (
                  <span className="rounded-full bg-[#EAE6DE] text-[#635F57] text-[11px] font-medium px-2.5 py-0.5">
                    Done
                  </span>
                ) : (
                  <span className="rounded-full bg-[#F7E7E2] text-[#BA593E] text-[11px] font-medium px-2.5 py-0.5 group-hover:bg-[#F2DAD2] transition-colors">
                    Blocked on you
                  </span>
                )}
              </div>

              {/* Row 4: Final sign-off */}
              <div className="py-3 border-b border-[#E5DFD2] flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-[#B0AAA0] bg-[#F4F1EA] shrink-0" />
                  <div>
                    <div className="font-bold text-[14px] text-[#1F1E1B] leading-tight">
                      Final sign-off
                    </div>
                    <div className="text-[12px] text-[#7A756D]">
                      Sep 25
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-[#9E988F] font-normal">
                  Upcoming
                </span>
              </div>
            </div>

            {/* Document Flow Quick Access Banner */}
            <div className="mt-5 p-3.5 rounded-xl bg-[#EDEAE2] border border-[#DDD7C8] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-[6px] border border-[#17171A]/20 flex items-center justify-center font-mono text-xs font-bold text-[#17171A]">
                  PO
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#17171A]">
                    Project paper trail
                  </div>
                  <div className="text-[11px] text-[#7A756D]">
                    {currentDocs.length} records · POs, invoices & remittances
                  </div>
                </div>
              </div>
              <button
                onClick={() => setConceptView('documents')}
                id="course-to-documents-btn"
                className="text-xs font-semibold text-[#17171A] hover:text-[#BA593E] flex items-center space-x-1"
              >
                <span>Open records</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: WHERE THINGS STAND (IMAGE 2) */}
        {conceptView === 'timeline' && (
          <div id="timeline-concept-view">
            {/* Header typography matching IMG_3934.png */}
            <div className="mb-4">
              <span className="text-[13px] text-[#7A756D] font-normal block font-sans">
                Project progress
              </span>
              <h1 className="text-[27px] leading-tight font-serif font-bold text-[#17171A] tracking-tight mt-0.5">
                Where things <span className="italic font-normal text-[#8492A6]">stand.</span>
              </h1>
              <p className="text-[13px] text-[#7A756D] mt-1 font-sans">
                A clear timeline from kickoff to delivery.
              </p>

              <div className="mt-5">
                <h2 className="text-[20px] font-serif font-bold text-[#17171A] leading-snug">
                  {activeProject.title}
                </h2>
                <p className="text-[12px] text-[#7A756D] mt-0.5 font-sans">
                  Started {activeProject.startDate} · Target finish {activeProject.targetCompletionDate}
                </p>
              </div>

              {/* Progress Bar matching IMG_3934.png */}
              <div className="mt-4">
                <div className="h-1.5 w-full bg-[#E5DFD2] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1F1E1B] rounded-full transition-all duration-500"
                    style={{
                      width: paymentWp.status === 'done' ? '75%' : '55%',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[12px] text-[#7A756D] mt-1.5 font-sans">
                  <span>In progress</span>
                  <span>{paymentWp.status === 'done' ? '75% complete' : '55% complete'}</span>
                </div>
              </div>
            </div>

            {/* Vertical Timeline matching IMG_3934.png */}
            <div className="mt-7 relative pl-7">
              {/* Continuous vertical connector line */}
              <div className="absolute left-[5.5px] top-2 bottom-3 w-[1.5px] bg-[#DDD6C6]" />

              {/* Node 1: Hardware install */}
              <div className="relative mb-6">
                <span className="absolute -left-7 top-1.5 w-3 h-3 rounded-full bg-[#1F1E1B] ring-4 ring-[#F4F1EA]" />
                <div className="text-[12px] text-[#7A756D] font-sans">
                  Jul 18
                </div>
                <div className="font-bold text-[15px] text-[#1F1E1B] leading-tight mt-0.5">
                  Hardware install
                </div>
                <p className="text-[12.5px] text-[#7A756D] mt-0.5 font-sans leading-relaxed">
                  On-site PLC and panel installation completed.
                </p>
              </div>

              {/* Node 2: Integration testing */}
              <div className="relative mb-6">
                <span className="absolute -left-7 top-1.5 w-3 h-3 rounded-full bg-[#1F1E1B] ring-4 ring-[#F4F1EA]" />
                <div className="text-[12px] text-[#7A756D] font-sans">
                  Aug 5
                </div>
                <div className="font-bold text-[15px] text-[#1F1E1B] leading-tight mt-0.5">
                  Integration testing
                </div>
                <p className="text-[12.5px] text-[#7A756D] mt-0.5 font-sans leading-relaxed">
                  Line integration verified against Andon triggers.
                </p>
              </div>

              {/* Node 3: Payment — Phase 2 */}
              <div className="relative mb-6">
                <span
                  className={`absolute -left-7 top-1.5 w-3 h-3 rounded-full ring-4 ring-[#F4F1EA] ${
                    paymentWp.status === 'done' ? 'bg-[#1F1E1B]' : 'bg-[#BA593E]'
                  }`}
                />
                <div className="text-[12px] text-[#7A756D] font-sans">
                  Due Aug 30
                </div>
                <div className="font-bold text-[15px] text-[#1F1E1B] leading-tight mt-0.5">
                  Payment — Phase 2
                </div>
                <p className="text-[12.5px] text-[#7A756D] mt-0.5 font-sans leading-relaxed">
                  Required before final configuration begins.
                </p>

                {paymentWp.status === 'done' ? (
                  <span className="inline-block mt-1.5 rounded-full bg-[#EAE6DE] text-[#635F57] text-[11px] font-medium px-2.5 py-0.5">
                    Payment authorized
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <button
                      onClick={() => handleOpenAction(paymentWp)}
                      id="action-needed-pill"
                      className="inline-block rounded-full bg-[#F8ECE8] text-[#BA593E] hover:bg-[#F2DAD2] text-[11px] font-medium px-2.5 py-0.5 transition-colors cursor-pointer"
                    >
                      Action needed from you
                    </button>
                    <button
                      onClick={() => setConceptView('documents')}
                      className="text-[11.5px] text-[#17171A] hover:text-[#BA593E] font-medium underline underline-offset-2"
                    >
                      Invoice & remittance slip →
                    </button>
                  </div>
                )}
              </div>

              {/* Node 4: Final sign-off */}
              <div className="relative mb-6">
                <span className="absolute -left-7 top-1.5 w-3 h-3 rounded-full border-2 border-[#B0AAA0] bg-[#F4F1EA] ring-4 ring-[#F4F1EA]" />
                <div className="text-[12px] text-[#7A756D] font-sans">
                  Sep 25
                </div>
                <div className="font-bold text-[15px] text-[#1F1E1B] leading-tight mt-0.5">
                  Final sign-off
                </div>
                <p className="text-[12.5px] text-[#7A756D] mt-0.5 font-sans leading-relaxed">
                  Review and approve completed system.
                </p>
              </div>

              {/* Node 5: Project delivered */}
              <div className="relative mb-2">
                <span className="absolute -left-7 top-1.5 w-3 h-3 rounded-full border-2 border-[#B0AAA0] bg-[#F4F1EA] ring-4 ring-[#F4F1EA]" />
                <div className="text-[12px] text-[#7A756D] font-sans">
                  Oct 14
                </div>
                <div className="font-bold text-[15px] text-[#1F1E1B] leading-tight mt-0.5">
                  Project delivered
                </div>
                <p className="text-[12.5px] text-[#7A756D] mt-0.5 font-sans leading-relaxed">
                  Handover and documentation complete.
                </p>
              </div>
            </div>

            {/* Document Flow Quick Access Banner */}
            <div className="mt-5 p-3.5 rounded-xl bg-[#EDEAE2] border border-[#DDD7C8] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-[6px] border border-[#17171A]/20 flex items-center justify-center font-mono text-xs font-bold text-[#17171A]">
                  IN
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#17171A]">
                    Documents & invoices
                  </div>
                  <div className="text-[11px] text-[#7A756D]">
                    {currentDocs.length} records · POs, invoices & remittances
                  </div>
                </div>
              </div>
              <button
                onClick={() => setConceptView('documents')}
                id="timeline-to-documents-btn"
                className="text-xs font-semibold text-[#17171A] hover:text-[#BA593E] flex items-center space-x-1"
              >
                <span>Open records</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Review & Authorization Modal for Client Payment / Sign-off */}
      <ActionReviewModal
        waypoint={actionModalWaypoint}
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        onResolve={handleResolveAction}
      />
    </div>
  );
};
