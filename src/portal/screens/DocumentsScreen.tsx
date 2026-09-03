import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Download, ExternalLink, Upload } from "lucide-react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import {
  DOCUMENT_GROUPS,
  createDocument,
  docTypeLabel,
  docTypeName,
  fetchDocument,
  fetchDocuments,
  fetchProject,
  statusLabel,
  uploadProjectFile,
} from "../api";
import { usePortalAuth } from "../auth";
import type { DocumentType, Project, ProjectDocument } from "../types";
import { QuoteView } from "./QuoteView";
import { AttachProjectRecordForm } from "./AttachProjectRecordForm";
import { IssueInvoiceForm } from "./IssueInvoiceForm";
import { StatusPill, documentTone } from "./ui";

type Flow = "list" | "invoice" | "quotation" | "record" | "attach" | "issue-invoice" | "upload-po" | "upload-remittance";

export function DocumentsScreen() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId?: string }>();
  const navigate = useNavigate();
  const { profile } = usePortalAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [flow, setFlow] = useState<Flow>(documentId ? "invoice" : "list");
  const [active, setActive] = useState<ProjectDocument | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  usePageMeta({
    title: `Documents — Portal | ${SITE.name}`,
    path: `/portal/projects/${projectId ?? ""}/documents`,
    noIndex: true,
  });

  async function reload() {
    if (!projectId) return;
    const [p, d] = await Promise.all([fetchProject(projectId), fetchDocuments(projectId)]);
    setProject(p);
    setDocs(d);
    if (!p) setError("This project is not available on your account.");
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : "Could not load documents."));
  }, [projectId]);

  useEffect(() => {
    if (!documentId) {
      setFlow("list");
      setActive(null);
      return;
    }
    fetchDocument(documentId).then((d) => {
      setActive(d);
      if (!d) {
        setFlow("list");
        return;
      }
      if (d.type === "quotation" && d.quotation) setFlow("quotation");
      else if (d.type === "invoice") setFlow("invoice");
      else setFlow("record");
    });
  }, [documentId]);

  function backToList() {
    setFlow("list");
    setActive(null);
    if (documentId) navigate(`/portal/projects/${projectId}/documents`);
  }

  if (error) return <p className="text-red-700">{error}</p>;
  if (!project) return <p className="text-slate-500">Loading documents…</p>;

  if (flow === "upload-po" || flow === "upload-remittance") {
    return (
      <UploadForm
        project={project}
        type={flow === "upload-po" ? "PO" : "remittance"}
        linkedInvoice={active}
        onBack={() => setFlow("list")}
        onDone={async (msg) => {
          await reload();
          setToast(msg);
          setFlow("list");
        }}
        uploadedBy={profile?.email ?? "client"}
      />
    );
  }

  if (flow === "issue-invoice") {
    return (
      <div className="max-w-2xl">
        <button type="button" onClick={() => setFlow("list")} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <ArrowLeft className="size-4" aria-hidden /> Documents
        </button>
        <h1 className="mt-6 font-serif text-3xl font-semibold tracking-tight">Issue an invoice.</h1>
        <p className="mt-2 text-sm text-slate-600">{project.name}. Payment stays off-site.</p>
        <div className="mt-8">
          <IssueInvoiceForm
            projects={[project]}
            lockedProjectId={project.id}
            compact
            issuer={profile?.email ?? "admin"}
            onCreated={async () => {
              await reload();
              setToast("Invoice issued.");
              setFlow("list");
            }}
          />
        </div>
      </div>
    );
  }

  if (flow === "attach") {
    return (
      <div className="max-w-2xl">
        <button type="button" onClick={() => setFlow("list")} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <ArrowLeft className="size-4" aria-hidden /> Documents
        </button>
        <h1 className="mt-6 font-serif text-3xl font-semibold tracking-tight">Attach a record.</h1>
        <p className="mt-2 text-sm text-slate-600">{project.name}</p>
        <div className="mt-8">
          <AttachProjectRecordForm
            projects={[project]}
            lockedProjectId={project.id}
            uploadedBy={profile?.email ?? "admin"}
            onCreated={async (title) => {
              await reload();
              setToast(`${title} added.`);
              setFlow("list");
            }}
          />
        </div>
      </div>
    );
  }

  if (flow === "record" && active) {
    return (
      <RecordDetail
        project={project}
        record={active}
        onBack={backToList}
      />
    );
  }

  if (flow === "quotation" && active?.quotation) {
    return (
      <QuoteView
        project={project}
        quote={active.quotation}
        fileUrl={active.fileUrl}
        onBack={backToList}
      />
    );
  }

  if (flow === "invoice" && active) {
    return (
      <InvoiceDetail
        project={project}
        invoice={active}
        onBack={backToList}
        onUploadRemittance={() => setFlow("upload-remittance")}
      />
    );
  }

  return (
    <div>
      <Link
        to={`/portal/projects/${project.id}`}
        className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
      >
        ← Project
      </Link>
      <p className="mt-6 text-[13px] text-slate-500">{project.name}</p>
      <h1 className="font-serif text-4xl font-semibold tracking-tight">
        Project <span className="italic font-normal text-slate-400">records.</span>
      </h1>
      <p className="mt-2 text-slate-600 max-w-xl">
        {profile?.role === "admin"
          ? "Consultations, demos, proposals, technical packs, quotations, POs, invoices, and remittances. Payment stays off-site."
          : "Open quotations, purchase orders, invoices, and any file CasinWorks attached to this project."}
      </p>
      {toast && <p className="mt-4 text-sm bg-black text-white px-3 py-2">{toast}</p>}

      <div className="mt-8 flex flex-wrap gap-3">
        {profile?.role === "admin" && (
          <>
            <button
              type="button"
              onClick={() => setFlow("attach")}
              className="rounded-full bg-black text-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              Attach record
            </button>
            <button
              type="button"
              onClick={() => setFlow("issue-invoice")}
              className="rounded-full border border-black/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              Issue invoice
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setFlow("upload-po")}
          className="rounded-full border border-black/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
        >
          Upload PO
        </button>
        <button
          type="button"
          onClick={() => setFlow("upload-remittance")}
          className="rounded-full border border-black/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
        >
          Upload remittance
        </button>
      </div>

      {docs.length === 0 && <p className="mt-10 py-8 text-slate-500 border-y border-black/10">No records yet.</p>}
      {DOCUMENT_GROUPS.map((group) => {
        const items = docs.filter((d) => group.types.includes(d.type));
        if (items.length === 0) return null;
        return (
          <section key={group.id} className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{group.label}</h2>
            <div className="mt-3 divide-y divide-black/10 border-y border-black/10">
              {items.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="w-full py-5 flex items-start justify-between gap-4 text-left hover:bg-[var(--page-panel)]/80"
                  onClick={() => {
                    if (d.type === "remittance" && (d.status === "needs_upload" || !d.fileUrl)) {
                      setActive(d);
                      setFlow("upload-remittance");
                      return;
                    }
                    navigate(`/portal/projects/${project.id}/documents/${d.id}`);
                  }}
                >
                  <div className="flex gap-3">
                    <span className="size-9 border border-black/15 flex items-center justify-center font-mono text-[10px] font-bold">
                      {docTypeLabel(d.type)}
                    </span>
                    <div>
                      <div className="font-semibold">{d.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {docTypeName(d.type)} · {d.date}
                        {d.amount ? ` · ${d.amount}` : ""}
                        {d.fileName ? ` · ${d.fileName}` : ""}
                      </div>
                    </div>
                  </div>
                  <StatusPill tone={documentTone(d.status)}>{statusLabel(d.status)}</StatusPill>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RecordDetail({
  project,
  record,
  onBack,
}: {
  project: Project;
  record: ProjectDocument;
  onBack: () => void;
}) {
  const isImage = Boolean(record.fileName && /\.(png|jpe?g|gif|webp|bmp)$/i.test(record.fileName));
  const isPdf = Boolean(record.fileName && /\.pdf$/i.test(record.fileName)) || Boolean(record.fileUrl && /\.pdf(\?|$)/i.test(record.fileUrl));

  return (
    <div className="max-w-2xl">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <ArrowLeft className="size-4" aria-hidden /> Documents
      </button>
      <p className="mt-6 text-[13px] text-slate-500">
        {project.name} · {docTypeName(record.type)}
      </p>
      <div className="mt-1 flex items-start justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{record.title}</h1>
        <StatusPill tone={documentTone(record.status)}>{statusLabel(record.status)}</StatusPill>
      </div>
      <p className="text-sm text-slate-500 mt-2">
        {record.date}
        {record.attendees ? ` · ${record.attendees}` : ""}
      </p>
      {record.notes && <p className="mt-6 text-sm text-slate-700 whitespace-pre-wrap">{record.notes}</p>}
      {isImage && record.fileUrl && (
        <img src={record.fileUrl} alt={record.title} className="mt-6 max-h-[480px] w-full object-contain border border-black/10 bg-white" />
      )}
      {isPdf && record.fileUrl && (
        <iframe
          src={record.fileUrl}
          title={record.title}
          className="mt-6 w-full h-[70vh] min-h-[480px] border border-black/10 bg-white"
        />
      )}
      {record.fileUrl && (
        <a
          href={record.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-black text-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
        >
          {record.fileName || "Open file"}
          <Download className="size-3.5" aria-hidden />
        </a>
      )}
      {!record.fileUrl && !record.notes && <p className="mt-6 text-sm text-slate-500">No file attached.</p>}
    </div>
  );
}

function InvoiceDetail({
  project,
  invoice,
  onBack,
  onUploadRemittance,
}: {
  project: Project;
  invoice: ProjectDocument;
  onBack: () => void;
  onUploadRemittance: () => void;
}) {
  const [copied, setCopied] = useState("");
  const payUrl = invoice.paymentUrl;
  const unpaid = invoice.status === "awaiting_payment" || invoice.status === "needs_upload";

  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <ArrowLeft className="size-4" aria-hidden /> Documents
      </button>
      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] text-slate-500">
            {project.name} · {invoice.invoiceNumber || "Invoice"}
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight mt-1">{invoice.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Issued {invoice.date}
            {invoice.dueDate ? ` · Due ${invoice.dueDate}` : ""}
          </p>
        </div>
        <StatusPill tone={documentTone(invoice.status)}>{statusLabel(invoice.status)}</StatusPill>
      </div>

      {invoice.fileUrl && (
        <a
          href={invoice.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-black text-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
        >
          {invoice.fileName || "Open invoice"}
          <Download className="size-3.5" aria-hidden />
        </a>
      )}

      <div className="mt-6 border-y border-black/15 py-4 space-y-3 max-w-xl">
        <Row label="Billed to" value={project.clientName} />
        <Row label="Issued by" value={SITE.brand} />
        {invoice.amount && <Row label="Amount" value={invoice.amount} />}
      </div>

      {invoice.lineItems && invoice.lineItems.length > 0 && (
        <ul className="mt-6 max-w-xl divide-y divide-black/10 border-y border-black/10">
          {invoice.lineItems.map((li) => (
            <li key={li.id} className="py-3 flex justify-between gap-4 text-sm">
              <span>
                {li.description}
                {li.milestoneRef && <span className="block text-xs text-slate-500 mt-0.5">{li.milestoneRef}</span>}
              </span>
              <span className="font-medium tabular-nums">{li.amount.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}

      {invoice.paymentInstructions && (
        <div className="mt-6 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">Bank details</p>
          {Object.entries({
            Bank: invoice.paymentInstructions.bankName,
            Name: invoice.paymentInstructions.accountName,
            Account: invoice.paymentInstructions.accountNumber,
            SWIFT: invoice.paymentInstructions.swiftBic,
          }).map(([k, v]) =>
            v ? (
              <button
                key={k}
                type="button"
                onClick={() => copy(v, k)}
                className="w-full flex items-center justify-between py-2 border-b border-black/10 text-sm"
              >
                <span className="text-slate-500">{k}</span>
                <span className="inline-flex items-center gap-2 font-medium">
                  {copied === k ? "Copied" : v}
                  <Copy className="size-3.5 text-slate-400" aria-hidden />
                </span>
              </button>
            ) : null,
          )}
        </div>
      )}

      {unpaid && (
        <div className="mt-8 flex flex-wrap gap-3">
          {payUrl && (
            <a
              href={payUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-black text-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              Pay invoice on website
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
          <button
            type="button"
            onClick={onUploadRemittance}
            className="rounded-full border border-black/15 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
          >
            I’ve paid — upload remittance
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function UploadForm({
  project,
  type,
  linkedInvoice,
  onBack,
  onDone,
  uploadedBy,
}: {
  project: Project;
  type: Extract<DocumentType, "PO" | "remittance">;
  linkedInvoice: ProjectDocument | null;
  onBack: () => void;
  onDone: (msg: string) => Promise<void>;
  uploadedBy: string;
}) {
  const [reference, setReference] = useState(linkedInvoice?.referenceNumber ?? "");
  const [amount, setAmount] = useState(linkedInvoice?.amount ?? "");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Attach a PDF or image of the document.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const uploaded = await uploadProjectFile(project.id, file);
      await createDocument({
        projectId: project.id,
        type,
        title:
          type === "PO"
            ? `Purchase Order ${reference || ""}`.trim()
            : `Remittance${linkedInvoice ? ` — ${linkedInvoice.title}` : ""}`,
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName,
        amount: amount || undefined,
        status: "pending_review",
        uploadedBy,
        date: new Date().toISOString().slice(0, 10),
        referenceNumber: reference || undefined,
        notes: notes || undefined,
      });
      await onDone(
        type === "PO"
          ? "Purchase order submitted. Under review by CasinWorks."
          : "Remittance submitted. We’ll confirm this within 1 business day.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-lg">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <ArrowLeft className="size-4" aria-hidden /> Documents
      </button>
      <h1 className="mt-6 font-serif text-3xl font-semibold tracking-tight">
        {type === "PO" ? "Upload purchase order." : "Upload remittance."}
      </h1>
      <p className="mt-2 text-sm text-slate-600">{project.name}</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={type === "PO" ? "PO number" : "Bank reference"}
          className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm focus:outline-none focus:border-black"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm focus:outline-none focus:border-black"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={3}
          className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm focus:outline-none focus:border-black"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border border-dashed border-black/20 py-10 text-sm text-slate-600 hover:border-black"
        >
          <Upload className="size-5 mx-auto mb-2" aria-hidden />
          {file ? file.name : "Drop or choose a PDF / image"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={sending}
          className="w-full py-3.5 bg-black text-white rounded-full text-sm font-semibold disabled:opacity-50"
        >
          {sending ? "Uploading…" : "Submit for review"}
        </button>
      </form>
    </div>
  );
}
