import React, { useState } from 'react';
import { ProjectDocument, ProjectEngagement } from '../types';
import { UploadPOScreen } from './UploadPOScreen';
import { InvoiceDetailView } from './InvoiceDetailView';
import { UploadRemittanceScreen } from './UploadRemittanceScreen';
import {
  X,
  MoreHorizontal,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Download,
  Eye,
  PlusCircle,
} from 'lucide-react';

interface DocumentsSectionProps {
  project: ProjectEngagement;
  documents: ProjectDocument[];
  onUpdateDocuments: (docs: ProjectDocument[]) => void;
  onClose?: () => void;
  onNavigateToCourse?: () => void;
}

type DocumentFlowSubState =
  | 'list'
  | 'upload-po'
  | 'invoice-detail'
  | 'upload-remittance'
  | 'doc-preview';

export const DocumentsSection: React.FC<DocumentsSectionProps> = ({
  project,
  documents,
  onUpdateDocuments,
  onClose,
  onNavigateToCourse,
}) => {
  const [subState, setSubState] = useState<DocumentFlowSubState>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<ProjectDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [showUploadPicker, setShowUploadPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenInvoice = (doc: ProjectDocument) => {
    setSelectedInvoice(doc);
    setSubState('invoice-detail');
  };

  const handleOpenRemittanceUpload = (invoice?: ProjectDocument) => {
    if (invoice) setSelectedInvoice(invoice);
    setShowUploadPicker(false);
    setSubState('upload-remittance');
  };

  const handleOpenPOUpload = () => {
    setShowUploadPicker(false);
    setSubState('upload-po');
  };

  const handleRowClick = (doc: ProjectDocument) => {
    if (doc.type === 'IN') {
      handleOpenInvoice(doc);
    } else if (doc.type === 'RM' && (doc.status === 'Needs your upload' || doc.status === 'Awaiting your upload')) {
      // Find linked invoice if any
      const linkedInv = documents.find((d) => d.type === 'IN' && d.id === 'doc-inv-ph2');
      handleOpenRemittanceUpload(linkedInv || undefined);
    } else {
      // Show document preview/audit info
      setPreviewDoc(doc);
    }
  };

  const handleSubmitPO = (newPoData: Partial<ProjectDocument>) => {
    const newDoc: ProjectDocument = {
      id: `doc-po-${Date.now()}`,
      projectId: project.id,
      type: 'PO',
      title: newPoData.title || 'Purchase Order #4472',
      subtitle: 'Uploaded just now',
      date: newPoData.date || 'Today',
      amount: newPoData.amount || '₱480,000',
      status: 'Pending review',
      fileName: newPoData.fileName || 'PO_Signed.pdf',
      fileSize: newPoData.fileSize || '285 KB',
      referenceNumber: newPoData.referenceNumber || 'PO-4472',
      notes: newPoData.notes,
    };

    onUpdateDocuments([newDoc, ...documents]);
    setSubState('list');
    showToast('Purchase Order submitted. Under review by CasinWorks engineering.');
  };

  const handleSubmitRemittance = (remittanceData: Partial<ProjectDocument>) => {
    // Update existing or add new
    let updated = false;
    const newDocs = documents.map((doc) => {
      if (doc.id === 'doc-rm-ph2' || (doc.type === 'RM' && doc.status === 'Needs your upload')) {
        updated = true;
        return {
          ...doc,
          subtitle: 'Uploaded just now',
          status: 'Pending review' as const,
          referenceNumber: remittanceData.referenceNumber || 'BPI-REF-9920148-X',
          fileName: remittanceData.fileName || 'BPI_DepositSlip_REF9920148.pdf',
          fileSize: remittanceData.fileSize || '194 KB',
          date: 'Aug 30, 2026',
        };
      }
      return doc;
    });

    if (!updated) {
      newDocs.push({
        id: `doc-rm-${Date.now()}`,
        projectId: project.id,
        type: 'RM',
        title: remittanceData.title || 'Remittance — Phase 2',
        subtitle: 'Uploaded just now',
        date: 'Today',
        amount: remittanceData.amount || '₱240,000',
        status: 'Pending review',
        referenceNumber: remittanceData.referenceNumber || 'BPI-REF-9920148-X',
        fileName: remittanceData.fileName || 'BPI_DepositSlip.pdf',
        fileSize: remittanceData.fileSize || '194 KB',
      });
    }

    onUpdateDocuments(newDocs);
    setSubState('list');
    showToast("Remittance submitted. We'll confirm this within 1 business day.");
  };

  // Substate Renders
  if (subState === 'upload-po') {
    return (
      <UploadPOScreen
        project={project}
        onBack={() => setSubState('list')}
        onSubmitPO={handleSubmitPO}
      />
    );
  }

  if (subState === 'invoice-detail' && selectedInvoice) {
    return (
      <InvoiceDetailView
        invoice={selectedInvoice}
        project={project}
        onBack={() => setSubState('list')}
        onUploadRemittance={(inv) => {
          setSelectedInvoice(inv);
          setSubState('upload-remittance');
        }}
      />
    );
  }

  if (subState === 'upload-remittance') {
    return (
      <UploadRemittanceScreen
        project={project}
        invoice={selectedInvoice || undefined}
        onBack={() => setSubState('list')}
        onSubmitRemittance={handleSubmitRemittance}
      />
    );
  }

  return (
    <div id="documents-flow-container" className="bg-[#EDEAE2] min-h-screen text-[#17171A] font-sans pb-14 select-none">
      {/* Top Modal Header matching IMG_3935.png */}
      <div className="pt-2 px-4 pb-2 border-b border-[#E5DFD2] flex items-center justify-between sticky top-0 bg-[#EDEAE2]/95 backdrop-blur z-20">
        {/* Close Button */}
        <button
          onClick={onClose || onNavigateToCourse}
          id="documents-close-btn"
          title="Back / Close"
          className="w-9 h-9 rounded-full bg-[#EAE6DE] hover:bg-[#DDD8CE] flex items-center justify-center text-[#1E1E1B] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title matching IMG_3935.png */}
        <div className="flex flex-col items-center">
          <span className="font-semibold text-[15px] tracking-tight text-[#17171A]">
            documents-flow
          </span>
        </div>

        {/* Options / Action Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            id="documents-options-btn"
            title="Options Menu"
            className="w-9 h-9 rounded-full bg-[#EAE6DE] hover:bg-[#DDD8CE] flex items-center justify-center text-[#1E1E1B] transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Quick Options Dropdown */}
          {showMenu && (
            <div className="absolute right-0 top-11 w-52 bg-[#FAF8F5] border border-[#DDD7C8] rounded-xl shadow-xl p-2 z-30 space-y-1">
              <div className="text-[11px] font-mono text-[#7A756D] px-2 py-1 uppercase tracking-wider">
                Document Actions
              </div>
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleOpenPOUpload();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#17171A] hover:bg-[#EDEAE2] transition-colors"
              >
                Upload Purchase Order
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  const inv = documents.find((d) => d.type === 'IN' && d.id === 'doc-inv-ph2');
                  handleOpenRemittanceUpload(inv);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#17171A] hover:bg-[#EDEAE2] transition-colors"
              >
                Upload Remittance Slip
              </button>
              <div className="border-t border-[#E5DFD2] pt-1 mt-1">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (onNavigateToCourse) onNavigateToCourse();
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#7A756D] hover:text-[#17171A] rounded"
                >
                  View Course Fairway
                </button>
              </div>
            </div>
          )}
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
      <div className="px-6 pt-5">
        {/* Header Typography matching IMG_3935.png */}
        <div className="mb-4">
          <span className="text-[13px] text-[#7A756D] font-normal block font-sans">
            {project.title}
          </span>
          <h1 className="text-[27px] leading-tight font-serif font-bold text-[#17171A] tracking-tight mt-0.5">
            Project <span className="italic font-normal text-[#8A93AD]">documents.</span>
          </h1>
          <p className="text-[13px] text-[#7A756D] mt-1 font-sans">
            Every PO, invoice, and payment record in one place.
          </p>
        </div>

        {/* Chronological List of Documents with Hairline Dividers matching IMG_3935.png */}
        <div className="mt-6 border-t border-[#E5DFD2]">
          {documents.map((doc) => {
            const isAwaitingPayment = doc.status === 'Awaiting payment';
            const isNeedsUpload = doc.status === 'Needs your upload' || doc.status === 'Awaiting your upload';
            const isPendingReview = doc.status === 'Pending review';
            const isConfirmedOrPaid = doc.status === 'Confirmed' || doc.status === 'Paid';

            return (
              <div
                key={doc.id}
                onClick={() => handleRowClick(doc)}
                className="py-3.5 border-b border-[#E5DFD2] flex items-center justify-between cursor-pointer group hover:bg-[#EAE6DE]/50 px-1 -mx-1 rounded transition-colors"
              >
                {/* Left Side: Letter Mark Badge + Metadata */}
                <div className="flex items-start space-x-3.5">
                  {/* Letter Mark Badge matching IMG_3935.png */}
                  <div className="w-9 h-9 rounded-[6px] border border-[#17171A]/20 bg-transparent text-[#17171A] font-mono font-medium text-[13px] flex items-center justify-center shrink-0 mt-0.5">
                    {doc.type}
                  </div>

                  <div>
                    <div className="font-bold text-[14.5px] text-[#17171A] leading-snug group-hover:text-[#BA593E] transition-colors">
                      {doc.title}
                    </div>
                    <div className="text-[12px] text-[#7A756D] mt-0.5 font-sans">
                      {doc.subtitle}
                    </div>
                    {doc.amount && (
                      <div className="text-[13px] font-medium text-[#17171A] mt-0.5 font-sans">
                        {doc.amount}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Status Tag matching IMG_3935.png */}
                <div className="shrink-0 pl-2">
                  {isConfirmedOrPaid && (
                    <span className="rounded-full bg-[#EAE6DE] text-[#635F57] text-[11px] font-medium px-2.5 py-0.5">
                      {doc.status}
                    </span>
                  )}

                  {isPendingReview && (
                    <span className="rounded-full bg-[#E9EEF4] text-[#4A6482] text-[11px] font-medium px-2.5 py-0.5 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Pending review</span>
                    </span>
                  )}

                  {isAwaitingPayment && (
                    <span className="rounded-full bg-[#F8ECE8] text-[#BA593E] text-[11px] font-medium px-2.5 py-0.5 group-hover:bg-[#F2DAD2] transition-colors">
                      Awaiting payment
                    </span>
                  )}

                  {isNeedsUpload && (
                    <span className="rounded-full bg-[#F8ECE8] text-[#BA593E] text-[11px] font-medium px-2.5 py-0.5 group-hover:bg-[#F2DAD2] transition-colors">
                      Needs your upload
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Black Pill CTA Button matching IMG_3935.png */}
        <div className="mt-7">
          <button
            onClick={() => setShowUploadPicker(true)}
            id="upload-document-btn"
            className="w-full py-3.5 px-6 rounded-full bg-[#17171A] text-white hover:bg-black transition-colors font-medium text-[13px] tracking-wider uppercase text-center shadow-sm cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <span>UPLOAD A DOCUMENT</span>
            <span className="text-base leading-none">→</span>
          </button>
        </div>
      </div>

      {/* Upload Choice Sheet Modal */}
      {showUploadPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#EDEAE2] w-full max-w-sm rounded-t-[28px] sm:rounded-2xl p-6 border-t sm:border border-[#17171A]/20 shadow-2xl animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#17171A]/10">
              <h3 className="font-serif font-bold text-[18px] text-[#17171A]">
                Upload a Document
              </h3>
              <button
                onClick={() => setShowUploadPicker(false)}
                className="p-1 rounded-full hover:bg-[#E5DFD2] text-[#7A756D] hover:text-[#17171A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              {/* Option 1: Purchase Order */}
              <button
                onClick={handleOpenPOUpload}
                id="pick-upload-po"
                className="w-full p-3.5 rounded-xl bg-[#FAF8F5] border border-[#17171A]/15 text-left flex items-center justify-between group hover:border-[#17171A] transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-[6px] border border-[#17171A]/20 text-[#17171A] font-mono font-bold text-[13px] flex items-center justify-center shrink-0">
                    PO
                  </div>
                  <div>
                    <div className="text-[13.5px] font-semibold text-[#17171A]">
                      Purchase Order (PO)
                    </div>
                    <div className="text-[11.5px] text-[#7A756D] mt-0.5">
                      Formal client PO authorizing project milestones
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#8A93AD] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Option 2: Remittance / Proof of Payment */}
              <button
                onClick={() => {
                  const inv = documents.find((d) => d.type === 'IN' && d.id === 'doc-inv-ph2');
                  handleOpenRemittanceUpload(inv);
                }}
                id="pick-upload-remittance"
                className="w-full p-3.5 rounded-xl bg-[#FAF8F5] border border-[#17171A]/15 text-left flex items-center justify-between group hover:border-[#17171A] transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-[6px] border border-[#17171A]/20 text-[#17171A] font-mono font-bold text-[13px] flex items-center justify-center shrink-0">
                    RM
                  </div>
                  <div>
                    <div className="text-[13.5px] font-semibold text-[#17171A]">
                      Remittance / Bank Slip
                    </div>
                    <div className="text-[11.5px] text-[#7A756D] mt-0.5">
                      Deposit slip or wire proof for Phase 2 invoice
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#8A93AD] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Preview Modal for Confirmed PO / RM */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#EDEAE2] max-w-sm w-full rounded-2xl p-6 border border-[#17171A]/20 shadow-2xl animate-fadeIn">
            <div className="flex items-start justify-between pb-3 border-b border-[#17171A]/10">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-[6px] border border-[#17171A]/20 text-[#17171A] font-mono font-bold text-[12px] flex items-center justify-center">
                  {previewDoc.type}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-[16px] text-[#17171A] leading-tight">
                    {previewDoc.title}
                  </h3>
                  <div className="text-[11.5px] text-[#7A756D]">
                    {previewDoc.date} · {previewDoc.status}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-full hover:bg-[#E5DFD2] text-[#7A756D] hover:text-[#17171A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-2.5 text-[12.5px] text-[#17171A]">
              <div className="flex justify-between py-1 border-b border-[#17171A]/5">
                <span className="text-[#7A756D]">Document File:</span>
                <span className="font-mono text-xs">{previewDoc.fileName || 'document.pdf'}</span>
              </div>
              {previewDoc.fileSize && (
                <div className="flex justify-between py-1 border-b border-[#17171A]/5">
                  <span className="text-[#7A756D]">File Size:</span>
                  <span>{previewDoc.fileSize}</span>
                </div>
              )}
              {previewDoc.amount && (
                <div className="flex justify-between py-1 border-b border-[#17171A]/5">
                  <span className="text-[#7A756D]">Recorded Amount:</span>
                  <span className="font-medium font-mono">{previewDoc.amount}</span>
                </div>
              )}
              {previewDoc.referenceNumber && (
                <div className="flex justify-between py-1 border-b border-[#17171A]/5">
                  <span className="text-[#7A756D]">Reference Number:</span>
                  <span className="font-mono font-medium">{previewDoc.referenceNumber}</span>
                </div>
              )}
              {previewDoc.notes && (
                <div className="pt-1">
                  <span className="text-[#7A756D] block mb-1">Notes:</span>
                  <p className="text-[12px] text-[#17171A] bg-[#FAF8F5] p-2.5 rounded-lg border border-[#17171A]/10">
                    {previewDoc.notes}
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center space-x-2 text-[11px] text-[#28CD41] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Verified in CasinWorks permanent project ledger</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setPreviewDoc(null)}
                className="w-full py-2.5 rounded-full bg-[#17171A] text-white text-xs font-medium hover:bg-black transition-colors"
              >
                Close preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
