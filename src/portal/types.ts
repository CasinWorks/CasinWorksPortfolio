export type PortalRole = "admin" | "client" | "subcontractor";

export type ProjectStatus = "active" | "blocked" | "complete" | "paused";

export type MilestoneStatus = "done" | "current" | "blocked" | "upcoming";

export type MilestoneKind =
  | "consultation"
  | "demo"
  | "buyoff"
  | "quotation"
  | "po"
  | "delivery"
  | "invoice"
  | "custom";

export type AttachmentNeed = "none" | "recommended" | "required";

export type DocumentType =
  | "consultation"
  | "demo"
  | "proposal"
  | "quotation"
  | "PO"
  | "invoice"
  | "remittance"
  | "technical"
  | "other";

export type DocumentStatus =
  | "pending_review"
  | "confirmed"
  | "paid"
  | "awaiting_payment"
  | "needs_upload"
  | "issued"
  | "accepted"
  | "expired";

export type GigStatus = "open" | "closed";

export type ApplicationStatus = "pending" | "accepted" | "rejected";

export type WorkType = "Remote" | "On-site" | "Hybrid";

export interface PortalUser {
  uid: string;
  email: string;
  displayName: string;
  role: PortalRole;
  company?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  milestoneRef?: string;
  quantity?: number;
  amount: number;
}

export interface QuoteScopeItem {
  id: string;
  description: string;
  details: string;
  /** Hours at the consulting rate. When set, amount is hours × ₱5,000. */
  hours?: number;
  amount: number;
}

export interface QuoteMilestone {
  id: string;
  title: string;
  percent: number;
  amount: number;
}

export interface QuoteBillTo {
  company: string;
  contact: string;
  address: string;
  email: string;
  phone: string;
}

export interface Quotation {
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
  validityDays: number;
  issuerName: string;
  issuerEmail: string;
  issuerPhone: string;
  billTo: QuoteBillTo;
  scope: QuoteScopeItem[];
  milestones: QuoteMilestone[];
  paymentNote: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  withholdingTax: string;
  terms: string[];
}

export interface PaymentInstructions {
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftBic?: string;
  branch?: string;
}

export interface Client {
  id: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  /** Firebase Auth uid once they register. */
  authUid?: string;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  /** Firebase Auth uid once they register; empty until then. */
  clientId: string;
  /** Always stored lowercase so projects can be created before they have an account. */
  clientEmail: string;
  clientName: string;
  /** CRM clients/{id} when the project was created from a client record. */
  crmClientId?: string;
  budget?: string;
  timelineStart?: string;
  timelineEnd?: string;
  status: ProjectStatus;
  progressPercentage: number;
  tagline?: string;
  referenceCode?: string;
  currentHoleTitle?: string;
  currentHoleKind?: string;
  shareToken?: string;
  /** Set when an invoice or remittance is on file. Blocks project delete. */
  paymentStarted?: boolean;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  date: string;
  status: MilestoneStatus;
  requiresAction: boolean;
  order: number;
  kind?: MilestoneKind;
  description?: string;
  actionType?: "approval" | "payment" | "feedback";
  actionAmount?: string;
  documentTitle?: string;
  attachmentNeed?: AttachmentNeed;
}

export interface ProjectShare {
  token: string;
  projectId: string;
  clientEmail: string;
  clientName: string;
  name: string;
  status: ProjectStatus;
  progressPercentage: number;
  currentHoleTitle?: string;
  timelineStart?: string;
  timelineEnd?: string;
  milestones: Milestone[];
}

export interface CourseTemplateHole {
  title: string;
  kind: MilestoneKind;
  description?: string;
  requiresAction: boolean;
  actionType?: "approval" | "payment" | "feedback";
  attachmentNeed?: AttachmentNeed;
}

export interface CourseTemplate {
  id: string;
  name: string;
  holes: CourseTemplateHole[];
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  type: DocumentType;
  title: string;
  fileUrl?: string;
  fileName?: string;
  amount?: string;
  numericAmount?: number;
  status: DocumentStatus;
  uploadedBy: string;
  date: string;
  dueDate?: string;
  paidDate?: string;
  invoiceNumber?: string;
  referenceNumber?: string;
  notes?: string;
  paymentUrl?: string;
  lineItems?: InvoiceLineItem[];
  paymentInstructions?: PaymentInstructions;
  quotation?: Quotation;
  meetingAt?: string;
  attendees?: string;
}

export interface Gig {
  id: string;
  title: string;
  description: string;
  status: GigStatus;
  postedBy: string;
  discipline?: string;
  location?: string;
  workType?: WorkType;
  rate?: string;
  duration?: string;
  deliverables?: string[];
  qualifications?: string[];
  clientCode?: string;
}

export type ConsultationStatus = "requested" | "confirmed" | "cancelled";

export interface ConsultationBooking {
  id: string;
  clientUid: string;
  clientEmail: string;
  clientName: string;
  company?: string;
  startsAt: string;
  hours: number;
  notes?: string;
  status: ConsultationStatus;
}

export interface GigApplication {
  id: string;
  gigId: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  statement?: string;
  status: ApplicationStatus;
  createdAt: string;
}
