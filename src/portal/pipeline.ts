import type { AttachmentNeed, CourseTemplateHole, DocumentType, Milestone, MilestoneKind, MilestoneStatus, ProjectDocument } from "./types";
import { SITE } from "../site";

export const ENGAGEMENT_PIPELINE: { title: string; kind: MilestoneKind; description: string }[] = [
  {
    title: "Consultation",
    kind: "consultation",
    description: `Discovery call at ₱${SITE.consultingHourlyRatePhp.toLocaleString("en-US")} per hour. Log hours and notes, then mark this hole done.`,
  },
  {
    title: "Demo",
    kind: "demo",
    description: "Walkthrough of the approach. Attach demo notes, then mark done.",
  },
  {
    title: "Buy-off",
    kind: "buyoff",
    description: "Client agrees scope before a commercial quote.",
  },
  {
    title: "Send quotation",
    kind: "quotation",
    description: "Issue the quotation PDF, send it to the client, then mark this hole done. They also see it on their portal.",
  },
  {
    title: "Purchase order",
    kind: "po",
    description: "Client issues a PO. Mark done when it is on file.",
  },
  {
    title: "Delivery",
    kind: "delivery",
    description: "Build, deploy, and hand over. Add extra holes if the build needs more stages.",
  },
];

export function kindLabel(kind?: MilestoneKind) {
  switch (kind) {
    case "consultation":
      return "Consultation";
    case "demo":
      return "Demo";
    case "buyoff":
      return "Buy-off";
    case "quotation":
      return "Quotation";
    case "po":
      return "Purchase order";
    case "delivery":
      return "Delivery";
    case "invoice":
      return "Invoice";
    default:
      return "Hole";
  }
}

export const HOLE_TEMPLATES: {
  id: string;
  title: string;
  kind: MilestoneKind;
  description: string;
  attachmentNeed: AttachmentNeed;
  requiresAction: boolean;
}[] = [
  {
    id: "quotation",
    title: "Send quotation",
    kind: "quotation",
    description: "Issue the quotation PDF, send it to the client, then mark this hole done.",
    attachmentNeed: "required",
    requiresAction: false,
  },
  {
    id: "po",
    title: "Purchase order",
    kind: "po",
    description: "Client issues a PO. Mark done when the file is on record.",
    attachmentNeed: "required",
    requiresAction: true,
  },
  {
    id: "invoice",
    title: "Invoice",
    kind: "invoice",
    description: "Issue an invoice. Payment stays off-site. Mark done when it is filed.",
    attachmentNeed: "required",
    requiresAction: false,
  },
];

export function attachmentLabel(need?: AttachmentNeed) {
  if (need === "required") return "Attachment required";
  if (need === "recommended") return "Attachment recommended";
  return "";
}

export function expectedDocType(kind?: MilestoneKind): DocumentType {
  switch (kind) {
    case "quotation":
      return "quotation";
    case "po":
      return "PO";
    case "invoice":
      return "invoice";
    case "demo":
      return "demo";
    case "consultation":
      return "consultation";
    case "buyoff":
      return "proposal";
    default:
      return "other";
  }
}

export function resolveAttachmentNeed(kind?: MilestoneKind, need?: AttachmentNeed): AttachmentNeed {
  if (need) return need;
  if (kind === "quotation" || kind === "po" || kind === "invoice") return "required";
  if (kind === "demo" || kind === "consultation") return "recommended";
  return "none";
}

export function docsForHole(kind: MilestoneKind | undefined, documents: ProjectDocument[]): ProjectDocument[] {
  switch (kind) {
    case "quotation":
      return documents.filter((d) => d.type === "quotation");
    case "po":
      return documents.filter((d) => d.type === "PO");
    case "invoice":
      return documents.filter((d) => d.type === "invoice");
    case "demo":
      return documents.filter((d) => d.type === "demo");
    case "consultation":
      return documents.filter((d) => d.type === "consultation");
    case "buyoff":
      return documents.filter((d) => d.type === "proposal");
    case "delivery":
      return documents.filter((d) => d.type === "invoice" || d.type === "technical" || d.type === "other");
    default:
      return documents.filter((d) => d.type === "technical" || d.type === "other");
  }
}

export function applyMilestoneStatus(milestones: Milestone[], id: string, status: MilestoneStatus): Milestone[] {
  const next = milestones.map((row) => ({ ...row }));
  const idx = next.findIndex((row) => row.id === id);
  if (idx < 0) return next;
  if (status === "current") {
    return next.map((row, i) => ({
      ...row,
      status: i < idx ? "done" : i === idx ? "current" : row.status === "blocked" ? "blocked" : "upcoming",
      requiresAction: i === idx ? row.requiresAction : i < idx ? false : row.requiresAction,
    }));
  }
  if (status === "done") {
    return next.map((row, i) => {
      if (i <= idx) return { ...row, status: "done" as const, requiresAction: false };
      if (i === idx + 1 && row.status !== "blocked") return { ...row, status: "current" as const };
      return row;
    });
  }
  next[idx] = { ...next[idx], status, requiresAction: status === "blocked" };
  return next;
}

export function applyOrder(milestones: Milestone[], orderedIds: string[]): Milestone[] {
  const byId = new Map(milestones.map((row) => [row.id, row]));
  const ordered: Milestone[] = [];
  for (const id of orderedIds) {
    const row = byId.get(id);
    if (row) ordered.push(row);
  }
  for (const row of milestones) {
    if (!orderedIds.includes(row.id)) ordered.push(row);
  }
  const doneIds = new Set(milestones.filter((row) => row.status === "done").map((row) => row.id));
  const blockedIds = new Set(milestones.filter((row) => row.status === "blocked").map((row) => row.id));
  let opened = false;
  return ordered.map((row, order) => {
    if (doneIds.has(row.id)) return { ...row, order, status: "done" as const };
    if (!opened) {
      opened = true;
      return { ...row, order, status: blockedIds.has(row.id) ? ("blocked" as const) : ("current" as const) };
    }
    return { ...row, order, status: blockedIds.has(row.id) ? ("blocked" as const) : ("upcoming" as const) };
  });
}

export function holesFromPipeline(): CourseTemplateHole[] {
  return ENGAGEMENT_PIPELINE.map((hole) => ({
    title: hole.title,
    kind: hole.kind,
    description: hole.description,
    requiresAction: hole.kind === "po",
    attachmentNeed: hole.kind === "quotation" || hole.kind === "po" ? "required" : hole.kind === "demo" || hole.kind === "consultation" ? "recommended" : "none",
  }));
}
