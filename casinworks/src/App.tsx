import React, { useState } from 'react';
import { ScreenId, UserRole, ProjectEngagement, JobPosting, ProjectDocument } from './types';
import { INITIAL_PROJECTS, INITIAL_GIGS, INITIAL_PROJECT_DOCUMENTS } from './data';
import { SignInScreen } from './components/SignInScreen';
import { GigBoardScreen } from './components/GigBoardScreen';
import { GolfProgressScreen } from './components/GolfProgressScreen';
import { DocumentsSection } from './components/DocumentsSection';
import { 
  Flag, 
  Briefcase, 
  User, 
  Smartphone, 
  Maximize2, 
  Wifi, 
  Battery, 
  Signal, 
  ShieldCheck,
  ChevronRight,
  FileText
} from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('progress');
  const [userRole, setUserRole] = useState<UserRole>('client');
  const [projects, setProjects] = useState<ProjectEngagement[]>(INITIAL_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>('tmp-andon');
  const [documents, setDocuments] = useState<ProjectDocument[]>(INITIAL_PROJECT_DOCUMENTS);
  const [gigs, setGigs] = useState<JobPosting[]>(INITIAL_GIGS);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);

  // Handle Sign In transition
  const handleSignIn = (role: UserRole) => {
    setUserRole(role);
    if (role === 'client') {
      setCurrentScreen('progress');
    } else {
      setCurrentScreen('gigboard');
    }
  };

  // Handle Subcontractor Applying for Gig
  const handleApplyGig = (gigId: string) => {
    setGigs((prev) =>
      prev.map((g) => (g.id === gigId ? { ...g, isApplied: true } : g))
    );
  };

  return (
    <div className="min-h-screen bg-[#E4E0D6] text-[#17171A] flex flex-col justify-between selection:bg-[#8A93AD]/25 selection:text-[#17171A]">
      {/* Top Presentation Bar: Quick Screen Switching & Frame Toggle */}
      <header className="sticky top-0 z-40 bg-[#EDEAE2]/95 backdrop-blur border-b border-[#17171A]/10 px-4 py-2.5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand mark */}
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-[#17171A] rounded-sm" />
            <span className="font-mono text-xs font-semibold tracking-widest uppercase text-[#17171A]">
              CASINWORKS
            </span>
            <span className="hidden sm:inline text-[#8A93AD] text-xs font-mono">
              // HIGH-STAKES ENGINEERING
            </span>
          </div>

          {/* Screen Navigation Tabs */}
          <div className="flex items-center bg-[#FAF8F5] border border-[#17171A]/15 rounded-full p-0.5">
            <button
              onClick={() => setCurrentScreen('progress')}
              id="nav-progress-tab"
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 ${
                currentScreen === 'progress'
                  ? 'bg-[#17171A] text-[#EDEAE2] font-semibold'
                  : 'text-[#17171A]/70 hover:text-[#17171A]'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>3. Project Hole</span>
            </button>

            <button
              onClick={() => setCurrentScreen('documents')}
              id="nav-documents-tab"
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 ${
                currentScreen === 'documents'
                  ? 'bg-[#17171A] text-[#EDEAE2] font-semibold'
                  : 'text-[#17171A]/70 hover:text-[#17171A]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>4. Documents</span>
            </button>

            <button
              onClick={() => setCurrentScreen('gigboard')}
              id="nav-gigboard-tab"
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 ${
                currentScreen === 'gigboard'
                  ? 'bg-[#17171A] text-[#EDEAE2] font-semibold'
                  : 'text-[#17171A]/70 hover:text-[#17171A]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>2. Gig Board</span>
            </button>

            <button
              onClick={() => setCurrentScreen('signin')}
              id="nav-signin-tab"
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 ${
                currentScreen === 'signin'
                  ? 'bg-[#17171A] text-[#EDEAE2] font-semibold'
                  : 'text-[#17171A]/70 hover:text-[#17171A]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Sign In</span>
            </button>
          </div>

          {/* Device Frame Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMobileFrame(!isMobileFrame)}
              id="toggle-frame-mode"
              className="px-2.5 py-1 rounded-full border border-[#17171A]/15 bg-[#FAF8F5] text-[11px] font-mono text-[#17171A]/80 hover:text-[#17171A] transition-colors flex items-center space-x-1.5"
            >
              {isMobileFrame ? (
                <>
                  <Maximize2 className="w-3 h-3 text-[#8A93AD]" />
                  <span className="hidden sm:inline">Expand View</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3 h-3 text-[#8A93AD]" />
                  <span className="hidden sm:inline">iOS Frame (390px)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 flex items-start justify-center p-0 sm:p-6 overflow-y-auto">
        <div
          className={`w-full transition-all duration-300 ${
            isMobileFrame
              ? 'max-w-[400px] bg-[#EDEAE2] sm:border-[10px] sm:border-[#17171A] sm:rounded-[48px] shadow-2xl relative overflow-hidden my-0 sm:my-3'
              : 'max-w-2xl bg-[#EDEAE2] rounded-xl border border-[#17171A]/15 my-4 overflow-hidden'
          }`}
        >
          {/* iOS Status Bar & Dynamic Island (Simulated for iOS Mobile Feel) */}
          {isMobileFrame && (
            <div className="pt-3 pb-1.5 px-6 flex items-center justify-between text-xs text-[#17171A] select-none bg-[#EDEAE2]">
              <span className="font-bold text-[14px] tracking-tight font-sans">4:00</span>
              
              {/* Dynamic Island Pill with Navigation arrow & mini avatar */}
              <div className="h-[28px] px-3 bg-black rounded-full mx-auto flex items-center space-x-2 shadow-sm">
                <svg className="w-3.5 h-3.5 text-[#0A84FF] fill-current" viewBox="0 0 24 24">
                  <polygon points="12 2 19 21 12 17 5 21" />
                </svg>
                <div className="w-4 h-4 rounded-full bg-[#8A93AD] overflow-hidden flex items-center justify-center text-[8px] text-white font-bold">
                  CW
                </div>
              </div>

              {/* Status Icons */}
              <div className="flex items-center space-x-1.5 text-[12px] font-sans font-semibold">
                <Signal className="w-3.5 h-3.5 text-[#17171A]" />
                <Wifi className="w-3.5 h-3.5 text-[#17171A]" />
                <div className="flex items-center space-x-0.5">
                  <span className="text-[11px] text-[#28CD41] font-bold">29%</span>
                  <Battery className="w-4 h-4 text-[#17171A]" />
                </div>
              </div>
            </div>
          )}

          {/* Active Screen Rendering with modal curve */}
          <div className="min-h-[640px] rounded-t-[32px] overflow-hidden shadow-sm bg-[#F4F1EA]">
            {currentScreen === 'signin' && (
              <SignInScreen onSignIn={handleSignIn} />
            )}

            {currentScreen === 'gigboard' && (
              <GigBoardScreen
                gigs={gigs}
                onApplyGig={handleApplyGig}
                onNavigateToProgress={() => setCurrentScreen('progress')}
              />
            )}

            {currentScreen === 'progress' && (
              <GolfProgressScreen
                projects={projects}
                activeProjectId={activeProjectId}
                onSelectProject={(id) => setActiveProjectId(id)}
                onNavigateToGigBoard={() => setCurrentScreen('gigboard')}
                documents={documents}
                onUpdateDocuments={setDocuments}
              />
            )}

            {currentScreen === 'documents' && (
              <DocumentsSection
                project={projects.find((p) => p.id === activeProjectId) || projects[0]}
                documents={documents}
                onUpdateDocuments={setDocuments}
                onClose={() => setCurrentScreen('progress')}
                onNavigateToCourse={() => setCurrentScreen('progress')}
              />
            )}
          </div>

          {/* iOS Bottom Home Bar & Mobile Tab Bar */}
          <div className="sticky bottom-0 z-30 bg-[#FAF8F5]/95 backdrop-blur border-t border-[#17171A]/10 px-4 py-2 flex items-center justify-around">
            <button
              onClick={() => setCurrentScreen('progress')}
              className={`flex flex-col items-center space-y-0.5 py-1 px-3 rounded transition-colors ${
                currentScreen === 'progress'
                  ? 'text-[#17171A] font-semibold'
                  : 'text-[#8A93AD] hover:text-[#17171A]'
              }`}
            >
              <Flag className="w-4 h-4" />
              <span className="text-[10px] font-mono tracking-tight uppercase">Course</span>
            </button>

            <button
              onClick={() => setCurrentScreen('documents')}
              id="bottom-nav-documents"
              className={`flex flex-col items-center space-y-0.5 py-1 px-3 rounded transition-colors ${
                currentScreen === 'documents'
                  ? 'text-[#17171A] font-semibold'
                  : 'text-[#8A93AD] hover:text-[#17171A]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="text-[10px] font-mono tracking-tight uppercase">Docs</span>
            </button>

            <button
              onClick={() => setCurrentScreen('gigboard')}
              className={`flex flex-col items-center space-y-0.5 py-1 px-3 rounded transition-colors ${
                currentScreen === 'gigboard'
                  ? 'text-[#17171A] font-semibold'
                  : 'text-[#8A93AD] hover:text-[#17171A]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span className="text-[10px] font-mono tracking-tight uppercase">Gig Board</span>
            </button>

            <button
              onClick={() => setCurrentScreen('signin')}
              className={`flex flex-col items-center space-y-0.5 py-1 px-3 rounded transition-colors ${
                currentScreen === 'signin'
                  ? 'text-[#17171A] font-semibold'
                  : 'text-[#8A93AD] hover:text-[#17171A]'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="text-[10px] font-mono tracking-tight uppercase">Access</span>
            </button>
          </div>

          {/* iOS Home Indicator Bar */}
          {isMobileFrame && (
            <div className="py-2 flex justify-center bg-[#FAF8F5]">
              <div className="w-32 h-1 bg-[#17171A]/80 rounded-full" />
            </div>
          )}
        </div>
      </main>

      {/* Understated Editorial Footer */}
      <footer className="py-3 px-4 text-center text-xs font-mono text-[#8A93AD] border-t border-[#17171A]/10 bg-[#EDEAE2]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CASINWORKS // INDEPENDENT ENGINEERING CONSULTANCY</span>
          <span className="text-[#17171A]/70">"HIGH-STAKES ENGINEERING. WE MAKE THINGS WORK."</span>
          <span>EST. 2026</span>
        </div>
      </footer>
    </div>
  );
}
