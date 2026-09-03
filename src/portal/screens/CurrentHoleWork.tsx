import { type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Mail } from "lucide-react";
import { commitMilestoneStatus, docTypeName } from "../api";
import { attachmentLabel, expectedDocType, kindLabel, resolveAttachmentNeed } from "../pipeline";
import type { Milestone, Project, ProjectDocument } from "../types";
import { AttachProjectRecordForm } from "./AttachProjectRecordForm";
import { IssueInvoiceForm } from "./IssueInvoiceForm";
import { IssueQuotationForm } from "./IssueQuotationForm";

type Panel = "idle" | "form";

export function CurrentHoleWork({
  project,
  milestone,
  milestones,
  documents,
  issuer,
  onChanged,
}: {
  project: Project;
  milestone: Milestone;
  milestones: Milestone[];
  documents: ProjectDocument[];
  issuer: string;
  onChanged: () => Promise<void>;
}) {
  const kind = milestone.kind ?? "custom";
  const holeNumber = milestones.findIndex((m) => m.id === milestone.id) + 1;
  const attachmentNeed = resolveAttachmentNeed(kind, milestone.attachmentNeed);
  const expectedType = expectedDocType(kind);
  const latestQuote = documents.filter((d) => d.type === "quotation").at(-1);
  const hasConsult = documents.some((d) => d.type === "consultation");
  const hasDemo = documents.some((d) => d.type === "demo");
  const hasPo = documents.some((d) => d.type === "PO");
  const hasInvoice = documents.some((d) => d.type === "invoice");
  const hasExpectedFile = documents.some((d) => d.type === expectedType);
  const hasFile =
    kind === "quotation"
      ? Boolean(latestQuote)
      : kind === "consultation"
        ? hasConsult
        : kind === "demo"
          ? hasDemo
          : kind === "po"
            ? hasPo
            : kind === "invoice"
              ? hasInvoice
              : hasExpectedFile;
  const dedicatedKind =
    kind === "consultation" ||
    kind === "demo" ||
    kind === "buyoff" ||
    kind === "quotation" ||
    kind === "po" ||
    kind === "delivery" ||
    kind === "invoice";
  const showGenericAttach = attachmentNeed !== "none" && (kind === "custom" || !dedicatedKind);
  const [panel, setPanel] = useState<Panel>("idle");
  const [issued, setIssued] = useState<{ fileUrl: string; fileName: string; quoteNumber: string } | null>(
    latestQuote?.fileUrl
      ? {
          fileUrl: latestQuote.fileUrl,
          fileName: latestQuote.fileName || `${latestQuote.referenceNumber || "quotation"}.pdf`,
          quoteNumber: latestQuote.referenceNumber || latestQuote.title,
        }
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function markDone() {
    setError("");
    if (attachmentNeed === "required" && !hasFile) {
      setError(`Attach ${docTypeName(expectedType).toLowerCase()} first. This hole requires a file on record.`);
      return;
    }
    setBusy(true);
    try {
      await commitMilestoneStatus(project.id, milestones, milestone.id, "done");
      setPanel("idle");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark this hole done.");
    } finally {
      setBusy(false);
    }
  }

  const mailHref = issued
    ? `mailto:${encodeURIComponent(project.clientEmail)}?subject=${encodeURIComponent(
        `Quotation ${issued.quoteNumber} — ${project.name}`,
      )}&body=${encodeURIComponent(
        `Hello,\n\nPlease find quotation ${issued.quoteNumber} for ${project.name}. I have attached the PDF.\n\nThank you,\nCasinWorks`,
      )}`
    : "";

  return (
    <article id="current-hole" className="bg-white border border-black/10 p-4 sm:p-8 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Now · Hole {holeNumber || 1} of {milestones.length || 1} · {kindLabel(kind)}
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{milestone.title}</h2>
        </div>
        <span className="inline-flex rounded-full bg-black text-white px-3 py-1 text-[11px] font-medium">Current</span>
      </div>
      {milestone.description && <p className="mt-3 text-sm text-slate-600 max-w-2xl">{milestone.description}</p>}
      {attachmentNeed !== "none" && (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {attachmentLabel(attachmentNeed)}
          {hasFile ? " · On file" : ""}
        </p>
      )}

      {kind === "consultation" && (
        <HoleAction
          ready={hasConsult}
          readyLabel="Consultation is on file."
          idleLabel="Log consultation"
          idleHint="Hours and notes land on the project records. This consultation is not billed."
          panel={panel}
          onOpen={() => setPanel("form")}
          onClose={() => setPanel("idle")}
        >
          <AttachProjectRecordForm
            projects={[project]}
            lockedProjectId={project.id}
            lockedType="consultation"
            uploadedBy={issuer}
            onCreated={async () => {
              setPanel("idle");
              await onChanged();
            }}
          />
        </HoleAction>
      )}

      {kind === "demo" && (
        <HoleAction
          ready={hasDemo}
          readyLabel="Demo notes are on file."
          idleLabel="Attach demo notes"
          idleHint="Deck, recording, or written walkthrough."
          panel={panel}
          onOpen={() => setPanel("form")}
          onClose={() => setPanel("idle")}
        >
          <AttachProjectRecordForm
            projects={[project]}
            lockedProjectId={project.id}
            lockedType="demo"
            uploadedBy={issuer}
            onCreated={async () => {
              setPanel("idle");
              await onChanged();
            }}
          />
        </HoleAction>
      )}

      {kind === "buyoff" && (
        <HoleAction
          idleLabel="Attach buy-off pack"
          idleHint="Optional. A proposal or scope pack, then mark this hole done when they agree."
          panel={panel}
          onOpen={() => setPanel("form")}
          onClose={() => setPanel("idle")}
        >
          <AttachProjectRecordForm
            projects={[project]}
            lockedProjectId={project.id}
            lockedType="proposal"
            uploadedBy={issuer}
            onCreated={async () => {
              setPanel("idle");
              await onChanged();
            }}
          />
        </HoleAction>
      )}

      {kind === "quotation" && (
        <div className="mt-6">
          {panel === "form" ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">Fill the quote. Generate PDF creates the Q-format file and files it on this project.</p>
                <button type="button" onClick={() => setPanel("idle")} className="text-xs font-semibold underline underline-offset-4">
                  Cancel
                </button>
              </div>
              <IssueQuotationForm
                projects={[project]}
                lockedProjectId={project.id}
                compact
                issuer={issuer}
                onCreated={async (result) => {
                  if (result) {
                    setIssued(result);
                    window.open(result.fileUrl, "_blank", "noopener,noreferrer");
                  }
                  setPanel("idle");
                  await onChanged();
                }}
              />
            </div>
          ) : issued ? (
            <div className="border border-black/10 bg-[var(--page-panel)] p-5">
              <p className="text-sm font-semibold">Quotation {issued.quoteNumber} is ready.</p>
              <p className="mt-1 text-sm text-slate-600">
                Download the PDF, attach it to an email to {project.clientEmail || "the client"}, then mark this hole done. They will also see it under project records when they sign in.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={issued.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-black text-white px-5 py-2.5 text-sm font-semibold"
                >
                  <Download className="size-4" aria-hidden />
                  Download PDF
                </a>
                {project.clientEmail && (
                  <a
                    href={mailHref}
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold"
                  >
                    <Mail className="size-4" aria-hidden />
                    Email client
                  </a>
                )}
                <button type="button" onClick={() => setPanel("form")} className="text-sm font-semibold underline underline-offset-4 px-2">
                  Issue another
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-600 max-w-xl">
                Open the quote form, generate the PDF, send that file to the client. It is also filed on their portal.
              </p>
              <button
                type="button"
                onClick={() => setPanel("form")}
                className="mt-4 rounded-full bg-black text-white px-6 py-3 text-sm font-semibold"
              >
                Issue quotation PDF
              </button>
            </div>
          )}
        </div>
      )}

      {kind === "po" && (
        <div className="mt-6">
          <p className="text-sm text-slate-600 max-w-xl">
            {hasPo
              ? "A purchase order is already on file. Confirm it from Admin if it is still pending review, then mark this hole done."
              : "The client uploads the PO from project records. Open records to check, then mark this hole done when it is on file."}
          </p>
          <Link
            to={`/portal/projects/${project.id}/documents`}
            className="mt-4 inline-flex rounded-full bg-black text-white px-6 py-3 text-sm font-semibold"
          >
            Open records
          </Link>
        </div>
      )}

      {kind === "delivery" && (
        <HoleAction
          idleLabel="Issue invoice"
          idleHint="Optional billing for this stage. Payment stays off-site. Mark done at handover."
          panel={panel}
          onOpen={() => setPanel("form")}
          onClose={() => setPanel("idle")}
        >
          <IssueInvoiceForm
            projects={[project]}
            lockedProjectId={project.id}
            compact
            issuer={issuer}
            onCreated={async () => {
              setPanel("idle");
              await onChanged();
            }}
          />
        </HoleAction>
      )}

      {kind === "invoice" && (
        <HoleAction
          ready={hasInvoice}
          readyLabel="Invoice is on file."
          idleLabel="Issue invoice"
          idleHint="Payment stays off-site. File the invoice, then mark this hole done."
          panel={panel}
          onOpen={() => setPanel("form")}
          onClose={() => setPanel("idle")}
        >
          <IssueInvoiceForm
            projects={[project]}
            lockedProjectId={project.id}
            compact
            issuer={issuer}
            onCreated={async () => {
              setPanel("idle");
              await onChanged();
            }}
          />
        </HoleAction>
      )}

      {showGenericAttach && (
        <HoleAction
          ready={hasFile}
          readyLabel="Attachment is on file."
          idleLabel={attachmentNeed === "required" ? "Attach required file" : "Attach recommended file"}
          idleHint={
            attachmentNeed === "required"
              ? "This hole cannot be marked done until a file is on record."
              : "A file is recommended. You can still mark the hole done without one."
          }
          panel={panel}
          onOpen={() => setPanel("form")}
          onClose={() => setPanel("idle")}
        >
          <AttachProjectRecordForm
            projects={[project]}
            lockedProjectId={project.id}
            lockedType={expectedType}
            uploadedBy={issuer}
            onCreated={async () => {
              setPanel("idle");
              await onChanged();
            }}
          />
        </HoleAction>
      )}

      {kind === "custom" && attachmentNeed === "none" && (
        <p className="mt-6 text-sm text-slate-600">Mark this hole done when the work is finished. Attach files from project records if needed.</p>
      )}

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <div className="mt-8 pt-6 border-t border-black/10 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || (attachmentNeed === "required" && !hasFile)}
          onClick={() => void markDone()}
          className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Updating…" : `Mark ${milestone.title} done`}
        </button>
        <p className="text-xs text-slate-500">
          {attachmentNeed === "required" && !hasFile
            ? "File the required attachment first."
            : "Advances the next hole. The client sees the same course."}
        </p>
      </div>
    </article>
  );
}

function HoleAction({
  ready,
  readyLabel,
  idleLabel,
  idleHint,
  panel,
  onOpen,
  onClose,
  children,
}: {
  ready?: boolean;
  readyLabel?: string;
  idleLabel: string;
  idleHint: string;
  panel: Panel;
  onOpen: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  if (ready) {
    return (
      <div className="mt-6">
        <p className="text-sm font-semibold">{readyLabel}</p>
        <p className="mt-1 text-sm text-slate-600">{idleHint}</p>
      </div>
    );
  }
  if (panel === "form") {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600">{idleHint}</p>
          <button type="button" onClick={onClose} className="text-xs font-semibold underline underline-offset-4">
            Cancel
          </button>
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="mt-6">
      <p className="text-sm text-slate-600 max-w-xl">{idleHint}</p>
      <button type="button" onClick={onOpen} className="mt-4 rounded-full bg-black text-white px-6 py-3 text-sm font-semibold">
        {idleLabel}
      </button>
    </div>
  );
}
