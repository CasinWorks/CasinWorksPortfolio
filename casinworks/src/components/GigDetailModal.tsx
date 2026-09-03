import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { JobPosting } from '../types';
import { X, ArrowRight, ShieldCheck, MapPin, User, Clock, CheckCircle2 } from 'lucide-react';

interface GigDetailModalProps {
  gig: JobPosting | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (gigId: string) => void;
}

export const GigDetailModal: React.FC<GigDetailModalProps> = ({
  gig,
  isOpen,
  onClose,
  onApply,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [statement, setStatement] = useState(
    'Available for immediate engagement. 12 years background in aerothermal heating FEA and high-enthalpy validation.'
  );

  if (!isOpen || !gig) return null;

  const handleApplyClick = () => {
    setSubmitting(true);
    setTimeout(() => {
      onApply(gig.id);
      setSubmitting(false);
      onClose();
    }, 500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-[2px]">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          id="gig-detail-modal"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[#EDEAE2] border border-[#17171A]/20 rounded-t-2xl sm:rounded-xl overflow-hidden shadow-2xl z-10"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#17171A]/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#8A93AD]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#8A93AD]">
                Engagement Dossier // {gig.discipline}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#17171A]/60 hover:text-[#17171A] hover:bg-[#17171A]/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Title with upright serif + italic accent in muted blue-grey */}
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-[#8A93AD] mb-1">
                {gig.clientCode}
              </div>
              <h2 className="text-2xl font-serif text-[#17171A] leading-tight">
                {gig.title}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#17171A]/15 text-[#17171A] font-medium">
                  <MapPin className="w-3 h-3 text-[#8A93AD]" />
                  <span>{gig.location}</span>
                </span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#17171A]/15 text-[#17171A] font-mono">
                  <Clock className="w-3 h-3 text-[#8A93AD]" />
                  <span>{gig.duration}</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#17171A] text-[#EDEAE2] font-mono font-semibold">
                  {gig.rate}
                </span>
              </div>
            </div>

            {/* Posted By Details */}
            <div className="p-3 bg-[#FAF8F5] border border-[#17171A]/10 rounded flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#17171A] text-[#EDEAE2] flex items-center justify-center font-serif text-sm font-semibold">
                CW
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#8A93AD]">
                  Managing CasinWorks Principal
                </div>
                <div className="text-xs font-medium text-[#17171A]">
                  {gig.postedBy}
                </div>
              </div>
            </div>

            {/* Engagement Summary */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#8A93AD]">
                Mission Scope
              </h3>
              <p className="text-sm text-[#17171A] leading-relaxed font-sans">
                {gig.summary}
              </p>
            </div>

            {/* Deliverables List */}
            <div className="space-y-2 border-t border-[#17171A]/10 pt-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#8A93AD]">
                Key Engineering Deliverables
              </h3>
              <ul className="space-y-1.5">
                {gig.deliverables.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-xs text-[#17171A]">
                    <span className="text-[#8A93AD] mt-0.5 font-mono">0{idx + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Qualifications */}
            <div className="space-y-2 border-t border-[#17171A]/10 pt-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#8A93AD]">
                Prerequisites & Security
              </h3>
              <ul className="space-y-1 text-xs text-[#17171A]/80">
                {gig.securityClearance && (
                  <li className="font-medium text-[#17171A] flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#8A93AD]" />
                    <span>Clearance: {gig.securityClearance}</span>
                  </li>
                )}
                {gig.qualifications.map((q, idx) => (
                  <li key={idx} className="list-disc ml-4">{q}</li>
                ))}
              </ul>
            </div>

            {/* Expression of Interest Input */}
            <div className="space-y-1.5 border-t border-[#17171A]/10 pt-4">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#17171A]/80">
                Capability Note / Available Start Date
              </label>
              <textarea
                rows={2}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#17171A]/20 rounded text-xs text-[#17171A] focus:outline-none focus:border-[#17171A]"
              />
            </div>

            {/* Footer Buttons with solid black pill CTA */}
            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-[#17171A]/20 rounded-full text-xs font-medium text-[#17171A] hover:bg-[#17171A]/5 transition-colors text-center"
              >
                Return to Board
              </button>
              <button
                type="button"
                disabled={submitting || gig.isApplied}
                onClick={handleApplyClick}
                className="flex-2 py-3 px-5 bg-[#17171A] text-[#EDEAE2] rounded-full text-xs font-semibold tracking-wide flex items-center justify-center space-x-2 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
              >
                <span>{gig.isApplied ? 'Proposal Active' : submitting ? 'Transmitting...' : 'Submit Expression of Interest'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
