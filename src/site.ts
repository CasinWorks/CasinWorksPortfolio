/** Site-wide contact */
export const SITE = {
  email: "christianjoshuacasin@gmail.com",
  tagline: "We make things work",
} as const;

/** Strategic partners (not client logos — institutional credibility) */
export const PARTNERS = {
  pfs: {
    name: "PFS Automation Microsystems Inc.",
    url: "https://pfsautomation.com",
  },
} as const;

export type CaseStudy = {
  id: "quotation-invoicing" | "kinsenas";
  sector: string;
  title: string;
  subtitle: string;
  liveUrl: string;
  primaryOutcome: string;
  problem: string[];
  solution: string[];
  keyFeatures: string[];
  feasibility: string[];
  roadmap: string[];
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "quotation-invoicing",
    sector: "Professional Services",
    title: "Quotation & Invoice Workspace",
    subtitle:
      "A contractor-first workflow that turns quoting and invoicing into clean, trackable income records — without spreadsheets.",
    liveUrl: "https://bills-quote.vercel.app/login",
    primaryOutcome:
      "Faster document creation, fewer errors through reusable defaults, and a clearer picture of issued value over time.",
    problem: [
      "Quoting and invoicing starts in templates/spreadsheets, then slowly becomes inconsistent and error-prone.",
      "Client details, payment instructions, and terms drift across documents over time.",
      "There’s no reliable month-to-month view of issued work (quoted vs invoiced) for cashflow planning.",
    ],
    solution: [
      "A single contractor workspace to manage clients, quotes, invoices, and defaults in one place.",
      "A dashboard that summarizes issued value and visualizes money flow to support forward planning.",
      "Exports to simplify record-keeping and reporting.",
    ],
    keyFeatures: [
      "Clients directory with reusable profiles",
      "Quotes list with statuses and totals",
      "Invoices aligned to the quoting workflow",
      "Dashboard summarizing YTD and monthly issued value",
      "Numbering and defaults (terms, validity, due dates)",
      "Bank details stored for consistent payment instructions",
      "CSV export for quotes/invoices",
    ],
    feasibility: [
      "Built around the core flow first (create → track → export) so it stays simple and shippable.",
      "Designed for speed and clarity: minimal steps, predictable layouts, and strong defaults.",
      "Structured data to allow future upgrades like PDF templates, reminders, and multi-user workspaces.",
    ],
    roadmap: [
      "PDF generation + branded templates",
      "Payment status tracking + reminders",
      "Tax/VAT + multi-currency support",
      "Role-based access for small teams",
      "Cloud sync + audit history (optional)",
    ],
  },
  {
    id: "kinsenas",
    sector: "Consumer Finance",
    title: "KinsenasApp",
    subtitle:
      "A cutoff-based personal finance tracker for everyday Filipinos — with an AI-ready briefing prompt for guidance.",
    liveUrl: "https://kinsenas-app-virid.vercel.app",
    primaryOutcome:
      "A simpler, more realistic money workflow (15th/30th cutoff) that people can actually maintain — plus clearer next-step guidance.",
    problem: [
      "Many finance apps feel too complex: too many categories, charts, and jargon.",
      "Tracking alone doesn’t help; users still ask “so what should I do next?”",
      "Real-life budgeting often follows 15th/30th payroll cutoffs, but most tools don’t model this well.",
    ],
    solution: [
      "A mobile-first workspace with cutoff-based budgeting and essential trackers (bills, savings, loans, investments).",
      "Clear progress views per cutoff so users quickly see what’s due, paid, and left.",
      "A structured “AI briefing prompt” generator that summarizes finances for any AI assistant to analyze.",
    ],
    keyFeatures: [
      "Bills & payments tracker by cutoff (15th / 30th)",
      "Monthly income and net savings overview",
      "Savings goals + monthly history",
      "Loans snapshot with payment-aware tracking",
      "Investments overview + PH-focused investment guide",
      "Backup & restore via export/import",
      "AI briefing prompt generator for financial guidance",
    ],
    feasibility: [
      "Optimized for consistency: minimal friction so users keep tracking.",
      "Local-first by default to build trust with sensitive finance data.",
      "Portable data so users can move devices without being trapped.",
    ],
    roadmap: [
      "Automated insights (risk alerts, cutoff shortfalls, habit trends)",
      "Recurring bills + smart templates",
      "Opt-in multi-device sync",
      "Explainable financial health score",
      "Exports for planning and personal records",
    ],
  },
];
