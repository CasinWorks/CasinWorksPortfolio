import React, { useState } from 'react';
import { ProjectDocument, ProjectEngagement } from '../types';
import { ArrowLeft, ExternalLink, CheckCircle2, Copy, FileText, X, Clock, ShieldCheck } from 'lucide-react';

interface InvoiceDetailViewProps {
  invoice: ProjectDocument;
  project: ProjectEngagement;
  onBack: () => void;
  onUploadRemittance: (invoice: ProjectDocument) => void;
}

export const InvoiceDetailView: React.FC<InvoiceDetailViewProps> = ({
  invoice,
  project,
  onBack,
  onUploadRemittance,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showExternalHandOffModal, setShowExternalHandOffModal] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const isPaid = invoice.status === 'Paid';
  const isPendingReview = invoice.status === 'Pending review';
  const isUnpaid = invoice.status === 'Awaiting payment' || invoice.status === 'Needs your upload';

  const defaultLineItems = invoice.lineItems || [
    {
      id: 'li-1',
      description: 'Phase 2 Milestone: Line Integration & Andon Trigger Protocol',
      milestoneRef: 'WP-02: Integration testing',
      quantity: 1,
      amount: 180000,
    },
    {
      id: 'li-2',
      description: 'On-site Optical Sensor Interlock Certification & Telemetry Calibration',
      milestoneRef: 'WP-03: Pre-requisite milestone',
      quantity: 1,
      amount: 60000,
    },
  ];

  const totalAmount = invoice.amount || '₱240,000';

  return (
    <div id="invoice-detail-view" className="bg-[#EDEAE2] min-h-screen text-[#17171A] font-sans pb-12 select-none">
      {/* Top Header */}
      <div className="pt-3 px-5 pb-3 border-b border-[#17171A]/10 flex items-center justify-between sticky top-0 bg-[#EDEAE2]/95 backdrop-blur z-20">
        <button
          onClick={onBack}
          id="invoice-back-btn"
          className="flex items-center space-x-1.5 text-xs font-medium text-[#17171A]/70 hover:text-[#17171A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Documents</span>
        </button>

        <span className="font-semibold text-[14px] tracking-tight text-[#17171A]">
          invoice-detail
        </span>

        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-[#E5DFD2] hover:bg-[#DDD8CE] flex items-center justify-center text-[#1E1E1B] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6 pt-5">
        {/* Header Typography */}
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#7A756D] font-normal block font-sans">
              {project.title} · {invoice.invoiceNumber || 'CW-INV-2026-082'}
            </span>
            {/* Status Tag */}
            {isPaid ? (
              <span className="rounded-full bg-[#EAE6DE] text-[#635F57] text-[11px] font-medium px-2.5 py-0.5">
                Paid
              </span>
            ) : isPendingReview ? (
              <span className="rounded-full bg-[#E9EEF4] text-[#4A6482] text-[11px] font-medium px-2.5 py-0.5 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Pending review</span>
              </span>
            ) : (
              <span className="rounded-full bg-[#F8ECE8] text-[#BA593E] text-[11px] font-medium px-2.5 py-0.5">
                Unpaid · Awaiting remittance
              </span>
            )}
          </div>

          <h1 className="text-[26px] leading-tight font-serif font-bold text-[#17171A] tracking-tight mt-1">
            {invoice.title || 'Invoice — Phase 2'}
          </h1>
          <p className="text-[13px] text-[#7A756D] mt-0.5 font-sans">
            Issued {invoice.date || 'Aug 16, 2026'} · Due {invoice.dueDate || 'Aug 30, 2026'}
          </p>
        </div>

        {/* Invoice Summary Hairline Box */}
        <div className="border-t border-b border-[#17171A]/15 py-4 my-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#7A756D]">
              Billed To
            </span>
            <span className="text-[13px] font-medium text-[#17171A]">
              Toyota Motor Philippines Corp.
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#7A756D]">
              Issued By
            </span>
            <span className="text-[13px] font-medium text-[#17171A]">
              CasinWorks Engineering Consultancy
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#7A756D]">
              Linked Milestone
            </span>
            <span className="text-[13px] font-medium text-[#17171A]">
              WP-02 / WP-03 Phase 2 Completion
            </span>
          </div>
        </div>

        {/* Line Items Breakdown */}
        <div className="my-5">
          <div className="text-[12px] font-mono uppercase tracking-wider text-[#7A756D] mb-2 pb-1 border-b border-[#17171A]/10">
            Scope Line Items
          </div>

          <div className="space-y-3">
            {defaultLineItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="py-2.5 border-b border-[#17171A]/10 flex items-start justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="text-[13.5px] font-medium text-[#17171A] leading-snug">
                    {item.description}
                  </div>
                  {item.milestoneRef && (
                    <div className="text-[11.5px] text-[#7A756D] mt-0.5 font-sans">
                      {item.milestoneRef}
                    </div>
                  )}
                </div>
                <div className="text-[13.5px] font-mono font-medium text-[#17171A] shrink-0 text-right">
                  ₱{item.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-3 space-y-1.5 text-right font-sans">
            <div className="flex justify-between text-[12.5px] text-[#7A756D]">
              <span>Subtotal</span>
              <span className="font-mono">{totalAmount}</span>
            </div>
            <div className="flex justify-between text-[12.5px] text-[#7A756D]">
              <span>Value-Added Tax (12% inclusive)</span>
              <span className="font-mono">Included</span>
            </div>
            <div className="flex justify-between text-[16px] font-bold text-[#17171A] pt-2 border-t border-[#17171A]/15">
              <span>Total Due</span>
              <span className="font-serif">{totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Wire & Bank Instructions for Corporate Remittance */}
        <div className="my-5 p-4 rounded-xl bg-[#FAF8F5] border border-[#17171A]/15 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#17171A] font-bold">
              Wire Transfer Instructions
            </span>
            <span className="text-[11px] text-[#7A756D]">Corporate BPI</span>
          </div>

          <div className="text-[12.5px] space-y-1 text-[#17171A]">
            <div className="flex justify-between py-1 border-b border-[#17171A]/5">
              <span className="text-[#7A756D]">Bank Name:</span>
              <span className="font-medium">Bank of the Philippine Islands</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#17171A]/5">
              <span className="text-[#7A756D]">Account Name:</span>
              <span className="font-medium">CasinWorks Engineering Inc.</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#17171A]/5">
              <span className="text-[#7A756D]">Account Number:</span>
              <div className="flex items-center space-x-1.5 font-mono font-medium">
                <span>0041-8932-15</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('0041893215', 'account')}
                  className="p-1 hover:bg-[#E5DFD2] rounded text-[#7A756D] hover:text-[#17171A] transition-colors"
                  title="Copy account number"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#7A756D]">Wire Reference:</span>
              <span className="font-mono font-medium text-[#17171A]">
                TMP-ANDON-PH2
              </span>
            </div>
          </div>

          {copiedField && (
            <div className="text-[11px] text-[#28CD41] font-medium flex items-center space-x-1 pt-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Account number copied to clipboard</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {isUnpaid && (
            <>
              {/* Primary Understated CTA */}
              <button
                type="button"
                onClick={() => onUploadRemittance(invoice)}
                id="upload-remittance-cta"
                className="w-full py-3.5 px-6 rounded-full bg-[#17171A] text-white hover:bg-black transition-colors font-medium text-[13px] tracking-wider uppercase text-center shadow-sm cursor-pointer"
              >
                Upload Remittance
              </button>

              {/* Secondary Link that visually reads as external hand-off (strictly no card fields or in-app checkout) */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowExternalHandOffModal(true)}
                  id="pay-invoice-external-link"
                  className="inline-flex items-center space-x-1.5 text-[13px] text-[#17171A]/80 hover:text-[#17171A] underline underline-offset-4 decoration-[#17171A]/30 hover:decoration-[#17171A] font-medium cursor-pointer transition-colors"
                >
                  <span>Pay invoice on website</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#8A93AD]" />
                </button>
                <div className="text-[11px] text-[#7A756D] mt-1">
                  Transfers to CasinWorks hosted web payment gateway
                </div>
              </div>
            </>
          )}

          {isPendingReview && (
            <div className="p-3.5 bg-[#FAF8F5] border border-[#17171A]/15 rounded-xl flex items-center space-x-3">
              <Clock className="w-5 h-5 text-[#8A93AD] shrink-0" />
              <div className="text-[12.5px] text-[#7A756D] leading-snug">
                Proof of payment has been uploaded and is under manual review by CasinWorks finance desk.
              </div>
            </div>
          )}

          {isPaid && (
            <div className="p-3.5 bg-[#FAF8F5] border border-[#17171A]/15 rounded-xl flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-[#28CD41] shrink-0" />
              <div>
                <div className="text-[13px] font-semibold text-[#17171A]">
                  Invoice fully settled
                </div>
                <div className="text-[11.5px] text-[#7A756D] mt-0.5">
                  Cleared on {invoice.paidDate || 'Jun 12, 2026'}. Milestone unlocked.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* External Hand-off Modal (strictly informative, confirming external redirection without in-app purchase fields) */}
      {showExternalHandOffModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#EDEAE2] max-w-sm w-full rounded-2xl p-6 border border-[#17171A]/20 shadow-2xl animate-fadeIn">
            <div className="w-10 h-10 rounded-full bg-[#E5DFD2] flex items-center justify-center text-[#17171A] mb-3">
              <ExternalLink className="w-5 h-5 text-[#8A93AD]" />
            </div>
            <h3 className="font-serif font-bold text-[18px] text-[#17171A]">
              External Hand-Off
            </h3>
            <p className="text-[13px] text-[#7A756D] mt-1.5 leading-relaxed">
              You are navigating to the CasinWorks secure external invoicing portal (finance.casinworks.com/inv/CW-2026-082) for online corporate banking settlement.
            </p>
            <div className="my-3 p-3 bg-[#FAF8F5] border border-[#17171A]/10 rounded-lg text-xs text-[#17171A] space-y-1 font-mono">
              <div>Invoice: {invoice.invoiceNumber || 'CW-INV-2026-082'}</div>
              <div>Amount: {totalAmount}</div>
              <div>Destination: CasinWorks Treasury Gateway</div>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExternalHandOffModal(false)}
                className="flex-1 py-2.5 px-4 rounded-full border border-[#17171A]/20 text-xs font-medium text-[#17171A] hover:bg-[#E5DFD2] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExternalHandOffModal(false);
                  window.open('https://casinworks.com/pay', '_blank', 'noopener,noreferrer');
                }}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#17171A] text-xs font-medium text-white hover:bg-black transition-colors"
              >
                Proceed to site ↗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
