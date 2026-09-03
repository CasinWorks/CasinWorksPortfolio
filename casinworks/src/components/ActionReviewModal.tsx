import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Waypoint } from '../types';
import { X, CheckCircle2, ArrowRight, ShieldCheck, FileText, CreditCard } from 'lucide-react';

interface ActionReviewModalProps {
  waypoint: Waypoint | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (waypointId: string) => void;
}

export const ActionReviewModal: React.FC<ActionReviewModalProps> = ({
  waypoint,
  isOpen,
  onClose,
  onResolve,
}) => {
  const [signature, setSignature] = useState('Christian J. Casin, VP of Engineering');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  if (!isOpen || !waypoint || !waypoint.actionRequired) return null;

  const { actionRequired } = waypoint;
  const isPayment = actionRequired.type === 'payment';

  const handleConfirm = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      onResolve(waypoint.id);
      setIsAuthorizing(false);
      onClose();
    }, 600);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-[2px]">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal Dialog */}
        <motion.div
          id="client-action-modal"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[#EDEAE2] border border-[#17171A]/20 rounded-t-2xl sm:rounded-xl overflow-hidden shadow-2xl z-10"
        >
          {/* Top Bar / Header */}
          <div className="px-5 py-4 border-b border-[#17171A]/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#8A93AD]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#8A93AD]">
                High-Stakes Sign-Off Protocol // {waypoint.code}
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
            {/* Headline with upright serif + italic accent */}
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-[#8A93AD] mb-1">
                Milestone Due: {actionRequired.dueDate}
              </div>
              <h2 className="text-2xl font-serif text-[#17171A] leading-tight">
                {isPayment ? (
                  <>Authorise Tranche <span className="italic text-[#8A93AD]">Disbursement.</span></>
                ) : (
                  <>Review & Sign-Off <span className="italic text-[#8A93AD]">Engineering Dossier.</span></>
                )}
              </h2>
              <p className="mt-1.5 text-sm text-[#17171A]/80 leading-relaxed font-sans">
                {waypoint.name}
              </p>
            </div>

            {/* Status callout */}
            <div className="p-3.5 bg-[#FAF8F5] border border-[#8A93AD]/30 rounded-lg">
              <div className="flex items-start space-x-2.5">
                <div className="mt-0.5 text-[#8A93AD]">
                  {isPayment ? <CreditCard className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="text-xs text-[#17171A]">
                  <p className="font-semibold">{actionRequired.badgeLabel}</p>
                  <p className="mt-1 text-[#17171A]/70 leading-relaxed">
                    {actionRequired.notes || waypoint.deliverableSummary}
                  </p>
                </div>
              </div>
            </div>

            {/* Deliverable Details */}
            <div className="space-y-2 border-t border-[#17171A]/10 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A93AD] font-mono">DELIVERABLE ARTIFACT:</span>
                <span className="font-medium text-[#17171A]">
                  {actionRequired.documentTitle || 'Technical Verification Package v3.2'}
                </span>
              </div>
              {isPayment && actionRequired.amount && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8A93AD] font-mono">TRANCHE AMOUNT:</span>
                  <span className="font-semibold text-base text-[#17171A] font-mono">
                    {actionRequired.amount}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A93AD] font-mono">FAIRWAY IMPACT:</span>
                <span className="font-medium text-[#8A93AD]">
                  Advances ball past WP-04 to Stroke 3 (430 YDS Pin)
                </span>
              </div>
            </div>

            {/* Digital Authorization Input */}
            <div className="space-y-1.5 border-t border-[#17171A]/10 pt-4">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#17171A]/80">
                Authorised Signatory Authority
              </label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-[#17171A]/20 rounded text-sm text-[#17171A] focus:outline-none focus:border-[#17171A] transition-colors"
                placeholder="Full Legal Name & Title"
              />
              <div className="flex items-center space-x-1.5 text-[11px] text-[#8A93AD] mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#8A93AD]" />
                <span>Digitally countersigned under CasinWorks Master Engineering Agreement.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-[#17171A]/20 rounded-full text-xs font-medium text-[#17171A] hover:bg-[#17171A]/5 transition-colors text-center"
              >
                Return to Course
              </button>

              {/* Solid black pill-shaped CTA with arrow (Prompt Requirement) */}
              <button
                type="button"
                id="resolve-action-cta"
                disabled={isAuthorizing || !signature.trim()}
                onClick={handleConfirm}
                className="flex-2 py-3 px-5 bg-[#17171A] text-[#EDEAE2] rounded-full text-xs font-semibold tracking-wide flex items-center justify-center space-x-2 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span>{isAuthorizing ? 'Transmitting Sign-Off...' : isPayment ? 'Confirm Wire & Advance' : 'Sign-Off & Advance Ball'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
