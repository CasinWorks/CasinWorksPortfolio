import React, { useState, useRef } from 'react';
import { ProjectDocument, ProjectEngagement } from '../types';
import { ArrowLeft, Upload, FileText, CheckCircle2, X, AlertCircle } from 'lucide-react';

interface UploadPOScreenProps {
  project: ProjectEngagement;
  onBack: () => void;
  onSubmitPO: (doc: Partial<ProjectDocument>) => void;
}

export const UploadPOScreen: React.FC<UploadPOScreenProps> = ({
  project,
  onBack,
  onSubmitPO,
}) => {
  const [poNumber, setPoNumber] = useState('PO-4472');
  const [amount, setAmount] = useState('₱480,000');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<{
    name: string;
    size: string;
    type: string;
    previewUrl?: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile({
        name: f.name,
        size: `${(f.size / 1024).toFixed(1)} KB`,
        type: f.type,
      });
    }
  };

  const handleUseSampleFile = () => {
    setFile({
      name: `PO_Toyota_TMP_4472_Approved.pdf`,
      size: '286.4 KB',
      type: 'application/pdf',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitPO({
      type: 'PO',
      title: `Purchase Order #${poNumber.replace(/^PO-?#?/i, '') || '4472'}`,
      subtitle: 'Uploaded just now',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: amount || undefined,
      referenceNumber: poNumber,
      status: 'Pending review',
      fileName: file ? file.name : `PO_${poNumber}_Signed.pdf`,
      fileSize: file ? file.size : '312 KB',
      notes: notes || undefined,
    });
  };

  return (
    <div id="upload-po-screen" className="bg-[#EDEAE2] min-h-screen text-[#17171A] font-sans pb-12 select-none">
      {/* Top Header */}
      <div className="pt-3 px-5 pb-3 border-b border-[#17171A]/10 flex items-center justify-between sticky top-0 bg-[#EDEAE2]/95 backdrop-blur z-20">
        <button
          onClick={onBack}
          id="upload-po-back-btn"
          className="flex items-center space-x-1.5 text-xs font-medium text-[#17171A]/70 hover:text-[#17171A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Documents</span>
        </button>

        <span className="font-semibold text-[14px] tracking-tight text-[#17171A]">
          upload-po
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
        <div className="mb-6">
          <span className="text-[13px] text-[#7A756D] font-normal block font-sans">
            {project.title}
          </span>
          <h1 className="text-[26px] leading-tight font-serif font-bold text-[#17171A] tracking-tight mt-0.5">
            Upload <span className="italic font-normal text-[#8A93AD]">purchase order.</span>
          </h1>
          <p className="text-[13px] text-[#7A756D] mt-1 font-sans leading-relaxed">
            Attach your organization's formal PO to log commitments and schedule engineering milestones.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File Upload Zone */}
          <div>
            <label className="block text-[12px] font-mono uppercase tracking-wider text-[#7A756D] mb-1.5">
              PO Document (PDF, PNG, TIFF)
            </label>

            {!file ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const f = e.dataTransfer.files[0];
                    setFile({
                      name: f.name,
                      size: `${(f.size / 1024).toFixed(1)} KB`,
                      type: f.type,
                    });
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all bg-[#FAF8F5]/80 hover:bg-[#FAF8F5] ${
                  isDragging ? 'border-[#17171A] bg-[#EDEAE2]' : 'border-[#17171A]/25'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.png,.jpg,.jpeg,.tiff"
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-[#E5DFD2] flex items-center justify-center mx-auto mb-2 text-[#17171A]">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-[13.5px] font-semibold text-[#17171A]">
                  Drag or tap to attach PO
                </div>
                <div className="text-[12px] text-[#7A756D] mt-0.5">
                  PDF or image scan up to 25MB
                </div>

                <div className="mt-3 pt-3 border-t border-[#17171A]/10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseSampleFile();
                    }}
                    className="text-[11.5px] text-[#17171A] underline hover:text-[#8A93AD] font-medium"
                  >
                    Quick-load sample PO (PO_Toyota_TMP_4472.pdf)
                  </button>
                </div>
              </div>
            ) : (
              /* File Preview once uploaded */
              <div className="p-3.5 bg-[#FAF8F5] border border-[#17171A]/15 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-[#E5DFD2] flex items-center justify-center text-[#17171A] shrink-0 font-mono text-xs font-bold">
                    PO
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#17171A] leading-tight truncate max-w-[200px]">
                      {file.name}
                    </div>
                    <div className="text-[11px] text-[#7A756D] mt-0.5">
                      {file.size} · Ready for submission
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1.5 rounded-full hover:bg-[#E5DFD2] text-[#7A756D] hover:text-[#17171A] transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-[12px] font-mono uppercase tracking-wider text-[#7A756D] mb-1">
                Purchase Order Number <span className="text-[#8A93AD] font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO-4472"
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#17171A]/20 rounded-lg text-[14px] text-[#17171A] focus:outline-none focus:border-[#17171A] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12px] font-mono uppercase tracking-wider text-[#7A756D] mb-1">
                Committed PO Amount <span className="text-[#8A93AD] font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. ₱480,000"
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#17171A]/20 rounded-lg text-[14px] text-[#17171A] focus:outline-none focus:border-[#17171A] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12px] font-mono uppercase tracking-wider text-[#7A756D] mb-1">
                Notes or Internal Reference <span className="text-[#8A93AD] font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Special billing instructions, division code, or department contact"
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#17171A]/20 rounded-lg text-[13px] text-[#17171A] focus:outline-none focus:border-[#17171A] transition-colors"
              />
            </div>
          </div>

          {/* Audit Trail Copy */}
          <div className="pt-1 flex items-start space-x-2 text-[12px] text-[#7A756D] leading-relaxed">
            <AlertCircle className="w-4 h-4 text-[#8A93AD] shrink-0 mt-0.5" />
            <span>
              Submitted POs are matched against proposal scope and logged to the project ledger within 1 business day.
            </span>
          </div>

          {/* Black Pill CTA */}
          <div className="pt-2">
            <button
              type="submit"
              id="submit-po-btn"
              className="w-full py-3.5 px-6 rounded-full bg-[#17171A] text-white hover:bg-black transition-colors font-medium text-[13px] tracking-wider uppercase text-center shadow-sm cursor-pointer"
            >
              Submit PO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
