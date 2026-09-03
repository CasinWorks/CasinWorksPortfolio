export type UserRole = 'client' | 'subcontractor';

export type ScreenId = 'signin' | 'gigboard' | 'progress' | 'documents';

export type DocumentType = 'PO' | 'IN' | 'RM';

export type DocumentStatus =
  | 'Pending review'
  | 'Confirmed'
  | 'Paid'
  | 'Awaiting payment'
  | 'Needs your upload'
  | 'Awaiting your upload';

export interface InvoiceLineItem {
  id: string;
  description: string;
  milestoneRef?: string;
  quantity?: number;
  amount: number;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  type: DocumentType;
  title: string;
  subtitle: string;
  date: string;
  amount?: string;
  numericAmount?: number;
  status: DocumentStatus;
  fileName?: string;
  fileSize?: string;
  referenceNumber?: string;
  notes?: string;
  invoiceNumber?: string;
  lineItems?: InvoiceLineItem[];
  dueDate?: string;
  paidDate?: string;
  paymentInstructions?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    swiftBic?: string;
    branch?: string;
  };
}

export interface MilestoneAction {
  type: 'approval' | 'payment' | 'feedback';
  badgeLabel: string;
  amount?: string;
  documentTitle?: string;
  notes?: string;
  dueDate: string;
}

export interface Waypoint {
  id: string;
  code?: string;
  name: string;
  date: string;
  status: 'done' | 'current' | 'blocked-on-you' | 'upcoming';
  t: number; // 0.0 to 1.0 along the fairway spline
  pos: { x: number; y: number }; // rendered coordinate in SVG viewBox (e.g., 340 x 560)
  calloutTitle?: string;
  calloutSubtitle?: string;
  calloutPosition?: 'left' | 'right';
  description?: string;
  deliverableSummary?: string;
  actionRequired?: MilestoneAction;
}

export interface ProjectEngagement {
  id: string;
  title: string;
  tagline: string;
  clientName: string;
  referenceCode: string;
  holeNumber: number;
  par: number;
  totalYards: number; // metric metaphor e.g. 440 YDS / 18 WKS
  durationWeeks: number;
  startDate: string;
  targetCompletionDate: string;
  currentBallT: number; // current position parameter [0..1]
  progressPercentage?: number;
  waypoints: Waypoint[];
}

export interface JobPosting {
  id: string;
  title: string;
  discipline: string;
  location: string;
  workType: 'Remote' | 'On-site' | 'Hybrid';
  postedBy: string;
  clientCode: string;
  securityClearance?: string;
  rate: string;
  duration: string;
  summary: string;
  deliverables: string[];
  qualifications: string[];
  isApplied?: boolean;
}
