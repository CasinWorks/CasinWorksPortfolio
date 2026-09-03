import { SITE } from "../site";
import type { Project, Quotation, QuoteMilestone, QuoteScopeItem } from "./types";

export const QUOTE_ISSUER_PHONE = "09190036230";

export const DEFAULT_QUOTE_BANK = {
  bankName: "Bank of the Philippine Islands (BPI)",
  accountName: "CHRISTIAN JOSHUA CASIN",
  accountNumber: "1899059728",
};

export const CONSULTING_HOURLY_RATE = SITE.consultingHourlyRatePhp;

export const DEFAULT_QUOTE_TERMS = [
  "This quotation is valid for {validity} days from date of issuance.",
  "The first consultation is complimentary. This quotation covers the agreed build scope only.",
  "Scope covers system development, deployment, and documentation only. Ongoing support and maintenance are not included.",
  "Payment schedule is milestone-based as indicated above.",
];

export function parseMoney(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPesoPdf(amount: number) {
  return `PHP ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatQuoteDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function newId() {
  return crypto.randomUUID();
}

export function consultingFee(hours: number) {
  const h = Number(hours) || 0;
  return Math.round(h * CONSULTING_HOURLY_RATE * 100) / 100;
}

export function consultingDetails(hours: number) {
  const h = Number(hours) || 0;
  const label = h === 1 ? "1 hour" : `${h} hours`;
  return `${label} × ${formatPeso(CONSULTING_HOURLY_RATE)}/hr`;
}

export function consultingLine(hours = 1, projectName?: string): QuoteScopeItem {
  const h = hours > 0 ? hours : 1;
  return {
    id: newId(),
    description: "Consulting",
    details: projectName ? `${consultingDetails(h)} — ${projectName}` : consultingDetails(h),
    hours: h,
    amount: consultingFee(h),
  };
}

export function defaultScope(project: Project): QuoteScopeItem[] {
  return [
    {
      id: newId(),
      description: project.name,
      details: "",
      amount: 0,
    },
  ];
}

export function defaultMilestones(total: number): QuoteMilestone[] {
  const rows: { title: string; percent: number }[] = [
    { title: "Downpayment", percent: 33.33 },
    { title: "Deployment", percent: 26.67 },
    { title: "Final Payment (Upon handover of project)", percent: 40 },
  ];
  return rows.map((row) => ({
    id: newId(),
    title: row.title,
    percent: row.percent,
    amount: Math.round((total * row.percent) / 100 * 100) / 100,
  }));
}

export function scopeTotal(scope: QuoteScopeItem[]) {
  return scope.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

export function applyMilestonePercents(milestones: QuoteMilestone[], total: number): QuoteMilestone[] {
  return milestones.map((row) => ({
    ...row,
    amount: Math.round((total * (Number(row.percent) || 0)) / 100 * 100) / 100,
  }));
}

export function buildQuotation(input: {
  quoteNumber: string;
  validityDays: number;
  billTo: Quotation["billTo"];
  scope: QuoteScopeItem[];
  milestones: QuoteMilestone[];
}): Quotation {
  const issueDate = todayIso();
  const validityDays = input.validityDays || 30;
  const terms = DEFAULT_QUOTE_TERMS.map((t) => t.replace("{validity}", String(validityDays)));
  return {
    quoteNumber: input.quoteNumber.trim() || "Q-0001",
    issueDate,
    validUntil: addDaysIso(issueDate, validityDays),
    validityDays,
    issuerName: SITE.fullName,
    issuerEmail: SITE.email,
    issuerPhone: QUOTE_ISSUER_PHONE,
    billTo: input.billTo,
    scope: input.scope.filter((row) => row.description.trim() || row.details.trim() || row.amount),
    milestones: applyMilestonePercents(input.milestones, scopeTotal(input.scope)),
    paymentNote: "Please remit payments to the following (Philippine bank transfer / deposit as applicable):",
    ...DEFAULT_QUOTE_BANK,
    withholdingTax: "Not applicable",
    terms,
  };
}

export function nextQuoteNumberFromExisting(existing: string[]) {
  let max = 0;
  for (const value of existing) {
    const match = value.match(/Q-(\d+)/i);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `Q-${String(max + 1).padStart(4, "0")}`;
}
