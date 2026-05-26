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

export type ConfidentialCaseStudySection = {
  title: string;
  intro?: string;
  bullets?: { heading: string; text: string }[];
  items?: string[];
};

export type CaseStudySlug =
  | "semiconductor-data-lifecycle"
  | "automotive-andon-ecosystem"
  | "quotation-invoicing"
  | "kinsenas";

export type ConfidentialCaseStudySlug = Extract<
  CaseStudySlug,
  "semiconductor-data-lifecycle" | "automotive-andon-ecosystem"
>;

export type ConfidentialCaseStudy = {
  id: ConfidentialCaseStudySlug;
  label: string;
  sector: string;
  title: string;
  snippet: string;
  role: string;
  coreStack: string[];
  sections: ConfidentialCaseStudySection[];
  results: string[];
};

/** NDA engagements — client identity withheld; technical scope approved for portfolio */
export const CONFIDENTIAL_CASE_STUDIES: ConfidentialCaseStudy[] = [
  {
    id: "automotive-andon-ecosystem",
    label: "Confidential work (NDA)",
    sector: "Automotive Manufacturing",
    title: "Industrial IoT & Real-Time Andon Ecosystem for a Global Automotive Giant",
    snippet:
      "Replaced analog shouting and paper logs on high-volume welding lines with a real-time digital Andon command center — instant triage, factory telemetry, and 365+ days of flawless floor execution.",
    role: "Lead Software Architect & Systems Integrator (Independent Contractor)",
    coreStack: [
      "React.js",
      "Node.js",
      "PostgreSQL",
      "Industrial Hardware Interfacing",
      "Ultra-Low Latency Telemetry",
      "RBAC",
    ],
    sections: [
      {
        title: "The Challenge: Chaos on the Factory Floor",
        intro:
          "Within the high-volume welding assembly lines of a premier global automotive manufacturer, critical incident management was completely analog. When an operational bottleneck or mechanical fault occurred, operators literally had to shout across a roaring factory floor to catch a manager's attention.",
        bullets: [
          {
            heading: "Downtime Latency",
            text: "Response times were entirely dependent on human sight and sound, leaking critical minutes per incident.",
          },
          {
            heading: "The Paperwork Bottleneck",
            text: "Operational metrics—line stops, Takt time variances, and machine downtime—were tracked by hand on whiteboards and clipboards, leaving leadership completely blind to real-time manufacturing data.",
          },
        ],
      },
      {
        title: "The Engineering: Building the Factory's Digital Nervous System",
        intro:
          "Collaborating with a specialized hardware partner, I architected a standalone, bare-metal industrial software engine from scratch. We wired physical factory lines directly into a high-visibility, digital command center:",
        items: [
          "Hardware-to-Software Event Streaming: Interfaced physical line-side buttons, industrial sirens, and tower lights directly with a high-performance web layer.",
          "Dynamic, Color-Coded Triaging: Engineered a command dashboard that instantly flashes localized, color-coded visual overrides—Amber for immediate maintenance dispatch, Blue for leadership intervention—pinpointing the exact physical coordinate of the failure.",
          "Autonomous Factory Telemetry: Deployed edge-sensor integrations to automatically compute and record ruthless manufacturing metrics in real-time.",
          "Takt Time Deviations: Microsecond-accurate cycle monitoring against production targets.",
          "Automated Line-Stop Aggregation: Instantaneous tracking of total cumulative downtime per shift.",
          "Shift Variance Telemetry: Automated tracking of overtime and production volume.",
          "Unalterable Incident Auditing: Every single mechanical trigger, leadership acknowledgement, and final resolution is cryptographically timestamped, giving management an unassailable data audit trail.",
        ],
      },
      {
        title: "The Architecture: Built for Severe Environments",
        intro:
          "Industrial software cannot afford to crash. I designed a redundant, standalone infrastructure engineered for 100% data integrity:",
        items: [
          "The Engine: An ultra-fast React.js interface paired with a high-throughput Node.js backend and a highly optimized PostgreSQL database built to withstand relentless transactional write streams.",
          "Zero-Packet-Drop Streaming: Implemented rock-solid real-time data flows to ensure factory-wide monitors update instantly without dropped frames.",
          "Granular Governance: A rigorous Role-Based Access Control (RBAC) framework ensures operators see only their localized line controls, while plant executives get full analytical access.",
        ],
      },
    ],
    results: [
      "Instantaneous MTTR: Eradicated manual shouting and paper logs, cutting Mean Time to Resolution down to the absolute minimum through instantaneous digital dispatching.",
      "100% Production Stability: This custom ecosystem has operated continuously on the production floor for over a year with zero downtime, zero software bugs, and zero defects — proving that custom-built, independent software can carry the weight of a world-class automotive assembly line.",
    ],
  },
  {
  id: "semiconductor-data-lifecycle",
  label: "Confidential work (NDA)",
  sector: "Semiconductor Manufacturing",
  title:
    "High-Throughput Data Lifecycle Automation for a Multi-Billion Dollar Semiconductor Manufacturer",
  snippet:
    "Orchestrated 2TB/day machine-vision data lifecycles across 400TB of localized NAS — decoupling heavy offloads from live inspection lines with a custom automation engine.",
  role: "Lead Infrastructure & Software Architect (Independent Contractor)",
  coreStack: [
    "Multi-Array Enterprise NAS",
    "Dedicated High-Speed Topologies",
    "Custom Automation Architecture",
    "Role-Based Access Control (RBAC)",
    "Cryptographic Logging",
  ],
  sections: [
    {
      title: "The Challenge: Extreme Data Velocity & Hardware Saturation",
      intro:
        "At a global, multi-billion dollar semiconductor packaging facility, advanced machine vision inspection lines were generating over 2TB of high-resolution production data every single day. This extreme volume created a critical operational bottleneck:",
      bullets: [
        {
          heading: "Storage Exhaustion",
          text: "Local inspection workstations frequently hit 100% storage capacity, threatening costly line stoppages.",
        },
        {
          heading: "Compute Overhead",
          text: "Standard network file transfer protocols heavily drained machine resources, spiking CPU utilization to critical limits and risking real-time processing delays during active manufacturing.",
        },
      ],
    },
    {
      title: "The Infrastructure Engineering & Cleanroom Deployment",
      intro:
        "To handle the high data velocity without impacting the facility’s broader corporate network, I designed and deployed an isolated, high-throughput hardware architecture:",
      bullets: [
        {
          heading: "Ultra-Restricted Environment Execution",
          text: "Personally executed the physical site integration and hardware deployment inside a strict Class 1,000 (ISO 6) cleanroom environment, adhering to rigorous multi-stage decontamination, airlock protocols, and full static-dissipative cleanroom attire (bunny suits).",
        },
        {
          heading: "Isolated Network Topologies",
          text: "Provisioned and integrated dual enterprise-grade NAS arrays, injecting 400TB of localized storage directly into active production cells.",
        },
        {
          heading: "Direct-Attach Pipelines",
          text: "Engineered dedicated CAT6 network pipelines directly from the processing machines to guarantee maximum transfer speed.",
        },
      ],
    },
    {
      title: "The Custom Software Solution: SynoCommand Engine",
      intro:
        "Because off-the-shelf backup software lacked the granular safety features needed for a live manufacturing line, I engineered a specialized desktop automation application to orchestrate the entire data lifecycle:",
      items: [
        "Intelligent Automation Pipeline: Configured with advanced conditional logic to run automated, scheduled, or real-time live backups filtered strictly by file extensions and precise file age (e.g., targeting files older than 3 days).",
        "System Concurrency Protection: Built-in state logic blocks conflicting processes (Scan, Backup, Purge) from running simultaneously, ensuring total software stability.",
        "Fail-Safe Storage Reclamation: Implemented a secure, dual-authenticated verification mechanism that cross-references backup integrity before safely purging local machine files to reclaim space.",
        "Enterprise Security & Audit Readiness: Integrated strict Role-Based Access Control (RBAC) separating Manager overrides from Operator functions.",
        "Immutable, local audit logging utilizing cryptographic hash chains to guarantee log integrity, allowing seamless CSV exports for strict corporate compliance reviews.",
        "Embedded live telemetry to monitor NAS hardware health, drive arrays, CPU load, and RAM consumption.",
      ],
    },
  ],
  results: [
    "Zero-Downtime Resource Isolation: Completely decoupled heavy data transfer payloads from active machine vision processing, allowing files to offload seamlessly without compromising system performance.",
    "Continuous Operations: Fully automated local storage reclamation, unlocking 24/7 continuous uptime and total data availability across all manufacturing shifts.",
  ],
  },
];

export type CaseStudy = {
  id: Extract<CaseStudySlug, "quotation-invoicing" | "kinsenas">;
  sector: string;
  title: string;
  subtitle: string;
  snippet: string;
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
    snippet:
      "Turns quoting and invoicing into a repeatable workflow with reusable client profiles, issued-value tracking, and exports — without spreadsheets.",
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
    snippet:
      "Cutoff-based budgeting (15th/30th) for everyday Filipinos — bills, savings, loans, and investments, plus AI-ready briefing prompts for guidance.",
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

export type CaseStudyListItem = {
  slug: CaseStudySlug;
  sector: string;
  title: string;
  snippet: string;
  liveUrl?: string;
  confidential?: boolean;
};

export const CASE_STUDY_LIST: CaseStudyListItem[] = [
  ...CONFIDENTIAL_CASE_STUDIES.map((s) => ({
    slug: s.id,
    sector: s.sector,
    title: s.title,
    snippet: s.snippet,
    confidential: true as const,
  })),
  ...CASE_STUDIES.map((s) => ({
    slug: s.id,
    sector: s.sector,
    title: s.title,
    snippet: s.snippet,
    liveUrl: s.liveUrl,
  })),
];

export function caseStudyPath(slug: CaseStudySlug) {
  return `/case-studies/${slug}`;
}

export function resolveCaseStudy(slug: string) {
  const confidential = CONFIDENTIAL_CASE_STUDIES.find((s) => s.id === slug);
  if (confidential) return { kind: "confidential" as const, study: confidential };
  const study = CASE_STUDIES.find((s) => s.id === slug);
  if (study) return { kind: "public" as const, study };
  return null;
}
