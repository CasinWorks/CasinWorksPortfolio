/** Site-wide contact & SEO defaults */
export const SITE = {
  email: "christianjoshuacasin@gmail.com",
  tagline: "We make things work",
  url: "https://www.casinworks.com",
  brand: "CasinWorks",
  fullName: "Christian Joshua Casin",
  name: "C. J. Casin",
  title: "CasinWorks — Independent Engineering",
  description:
    "CasinWorks — mission-critical software, SCADA, and industrial systems. Independent engineering practice of Christian Joshua Casin (C.J. Casin), Mandaluyong, Philippines.",
  location: "Mandaluyong, Philippines",
  /** Independent consulting, billed hourly in PHP */
  consultingHourlyRatePhp: 5000,
  /** Client reply SLA shown near contact */
  responseTimePromise: "I reply within 1 business day.",
  ogImagePath: "/og-image.jpg",
} as const;

export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQS: FaqItem[] = [
  {
    question: "What kinds of projects do you take on?",
    answer:
      "Mission-critical software for manufacturing, industrial operations, and enterprises that need senior engineering accountability — SCADA-adjacent systems, factory-floor tooling, operational dashboards, and custom architecture where downtime or weak delivery has real cost.",
  },
  {
    question: "Do you work under NDA?",
    answer:
      "Yes. Most enterprise engagements are confidential. Portfolio case studies describe technical scope with client identity withheld where required.",
  },
  {
    question: "How do engagements usually start?",
    answer:
      "Send a short brief via the inquiry form or email. We clarify scope, constraints, and success criteria, then agree on a focused first phase before any larger commitment.",
  },
  {
    question: "What is your consulting rate?",
    answer:
      `Independent consulting is ₱${SITE.consultingHourlyRatePhp.toLocaleString("en-US")} per hour. Larger builds are quoted as a fixed scope after consultation.`,
  },
  {
    question: "How quickly will I hear back?",
    answer:
      "I reply to new consultation inquiries within 1 business day. Complex scopes may need a short follow-up call before a written proposal.",
  },
  {
    question: "Where are you based, and do you work remotely?",
    answer:
      "I’m based in Mandaluyong, Philippines, and work with local manufacturing partners as well as remote enterprise clients. On-site work is available when the engagement requires it.",
  },
];

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

export type ConfidentialCaseStudySlug =
  | "semiconductor-data-lifecycle"
  | "automotive-andon-ecosystem";

export type ConceptCaseStudySlug =
  | "vela-aviation"
  | "vela-concierge"
  | "vela-private";

export type CaseStudySlug = ConfidentialCaseStudySlug | ConceptCaseStudySlug;

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
      "Replaced analog shouting and paper logs on high-volume welding lines with a real-time digital Andon command center — instant triage, factory telemetry, and 24/7 floor execution.",
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

export type ConceptLiveLink = {
  label: string;
  href: string;
};

export type ConceptCaseStudy = {
  id: ConceptCaseStudySlug;
  kind: "concept";
  label: string;
  sector: string;
  title: string;
  snippet: string;
  role: string;
  coreStack: string[];
  sections: ConfidentialCaseStudySection[];
  results: string[];
  liveLinks: ConceptLiveLink[];
  related?: { slug: ConceptCaseStudySlug; label: string }[];
};

/** Public studio concepts — fictional brands, not client engagements. Each site is a standalone commission. */
export const CONCEPT_CASE_STUDIES: ConceptCaseStudy[] = [
  {
    id: "vela-aviation",
    kind: "concept",
    label: "Studio concept",
    sector: "Private Aviation · Concept",
    title: "Vela Aviation — a Manila aviation house for private jets",
    snippet:
      "A specialist jet and ferry site — gallery, specialty, team, and enquiry — that ships as its own operator stack for aviation houses that do not run ground.",
    role: "Independent engineer — product, design system, and front-end architecture",
    coreStack: ["React", "TypeScript", "Vite", "Motion", "Vercel", "Enquiry"],
    liveLinks: [{ label: "Vela Aviation", href: "https://aviation.casinworks.com" }],
    related: [
      { slug: "vela-concierge", label: "Vela Concierge" },
      { slug: "vela-private", label: "Vela Private" },
    ],
    sections: [
      {
        title: "The brief: aviation, on its own",
        intro:
          "Jet and charter operators need a house site that sells the aircraft story — not a chauffeur booking form. This studio concept is a complete aviation marketing and enquiry product, ready to commission for a jet-only client.",
        bullets: [
          {
            heading: "One house, one domain",
            text: "aviation.casinworks.com is a standalone Vite app on its own subdomain. It does not depend on ground booking to function.",
          },
          {
            heading: "Manila across Asia-Pacific",
            text: "Ferry and delivery narrative from Manila, with gallery, specialty, team, and a dedicated enquiry flow.",
          },
        ],
      },
      {
        title: "What ships in the demo",
        intro: "The live site is interactive product, not a slide deck.",
        items: [
          "Cinematic scroll, hero ken-burns, and staggered reveals that respect reduced-motion preferences.",
          "Vela Aviation ferry and delivery narrative from Manila across Asia-Pacific: gallery, specialty, team, and enquiry.",
        ],
      },
      {
        title: "How it is hosted",
        intro:
          "Its own Vercel project on aviation.casinworks.com. Commission as a single-site operator stack. A chauffeur house can be added later without rebuilding this one.",
        items: ["aviation.casinworks.com — aviation house"],
      },
    ],
    results: [
      "A public, clickable aviation house that demonstrates commercial web craft without using a client’s name or trademarks.",
      "The same motion and enquiry pattern can be commissioned as a production stack for a jet-only operator.",
    ],
  },
  {
    id: "vela-concierge",
    kind: "concept",
    label: "Studio concept",
    sector: "Chauffeur & Tours · Concept",
    title: "Vela Concierge — Philippine chauffeur, transfers, and tours",
    snippet:
      "A specialist ground site — story booking, staff inbox, NAIA transfers, wedding chauffeur, and signature tours — for limousine operators that do not fly.",
    role: "Independent engineer — product, design system, and front-end architecture",
    coreStack: [
      "React",
      "TypeScript",
      "Vite",
      "Motion",
      "Vercel",
      "Story booking",
      "RBAC demo",
    ],
    liveLinks: [{ label: "Vela Concierge", href: "https://concierge.casinworks.com" }],
    related: [
      { slug: "vela-aviation", label: "Vela Aviation" },
      { slug: "vela-private", label: "Vela Private" },
    ],
    sections: [
      {
        title: "The brief: ground, on its own",
        intro:
          "Limousine and chauffeur houses need vehicle story, booking, and staff operations — not a jet catalogue. This studio concept is a complete ground product, ready to commission for a fleet that stays on the road.",
        bullets: [
          {
            heading: "One house, one domain",
            text: "concierge.casinworks.com is a standalone Vite app. Booking, contact, and the staff demo all live on this site.",
          },
          {
            heading: "Philippine ground",
            text: "NAIA transfers, wedding chauffeur, and signature tours — El Nido, Bohol, Tagaytay & Taal, Banaue, Intramuros — without an aviation form in the way.",
          },
        ],
      },
      {
        title: "What ships in the demo",
        intro: "The live site is interactive product, not a slide deck.",
        items: [
          "Cinematic scroll, hero ken-burns, and staggered reveals that respect reduced-motion preferences.",
          "Story booking: vehicle, service, calendar, details, confirmation — with a local staff inbox and role-based demo login.",
          "Philippine signature tours plus NAIA transfers and wedding chauffeur.",
        ],
      },
      {
        title: "How it is hosted",
        intro:
          "Its own Vercel project on concierge.casinworks.com. Commission as a single-site operator stack. An aviation house can be added later without rebuilding this one.",
        items: ["concierge.casinworks.com — chauffeur and tours"],
      },
    ],
    results: [
      "A public, clickable chauffeur site that demonstrates commercial web craft without using a client’s name or trademarks.",
      "The same motion, booking, and staff-ops pattern can be commissioned as a production stack for a limousine-only operator.",
    ],
  },
  {
    id: "vela-private",
    kind: "concept",
    label: "Studio concept",
    sector: "Luxury Brand Portal · Concept",
    title: "Vela Private — a parent portal for specialist houses",
    snippet:
      "An umbrella luxury portal — cinematic motion, About, and architecture blueprint — for operators who need a brand front door without collapsing aviation and ground into a single form.",
    role: "Independent engineer — product, design system, and front-end architecture",
    coreStack: ["React", "TypeScript", "Vite", "Motion", "Vercel"],
    liveLinks: [{ label: "Vela Private", href: "https://vela.casinworks.com" }],
    related: [
      { slug: "vela-aviation", label: "Vela Aviation" },
      { slug: "vela-concierge", label: "Vela Concierge" },
    ],
    sections: [
      {
        title: "The brief: a front door, not a combined form",
        intro:
          "Some operators want a parent brand that holds the umbrella story while specialist houses keep their own booking and enquiry. This studio concept is that portal — commission it when the client needs a luxury front door, not a one-page mash-up.",
        bullets: [
          {
            heading: "Umbrella, not a merger",
            text: "vela.casinworks.com frames private aviation and Philippine chauffeur as two houses under one concierge standard — without collapsing them into a single form.",
          },
          {
            heading: "Hash routes for the house story",
            text: "About and the architecture blueprint live on the parent portal, so the brand narrative stays here while operations stay on the specialist sites.",
          },
        ],
      },
      {
        title: "What ships in the demo",
        intro: "The live site is interactive product, not a slide deck.",
        items: [
          "Cinematic scroll, hero ken-burns, and staggered reveals that respect reduced-motion preferences.",
          "Hash routes for About and the architecture blueprint.",
        ],
      },
      {
        title: "How it is hosted",
        intro:
          "Its own Vercel project on vela.casinworks.com. Commission the portal alone, or pair it with the aviation and chauffeur houses when the operator runs both.",
        items: ["vela.casinworks.com — parent portal"],
      },
    ],
    results: [
      "A public, clickable luxury portal that demonstrates commercial web craft without using a client’s name or trademarks.",
      "The same motion and multi-house framing can be commissioned as a production brand front door.",
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
  label?: string;
};

export const CASE_STUDY_LIST: CaseStudyListItem[] = CONFIDENTIAL_CASE_STUDIES.map((s) => ({
  slug: s.id as CaseStudySlug,
  sector: s.sector,
  title: s.title,
  snippet: s.snippet,
  confidential: true as const,
}));

export const CONCEPT_STUDY_LIST: CaseStudyListItem[] = CONCEPT_CASE_STUDIES.map((s) => ({
  slug: s.id as CaseStudySlug,
  sector: s.sector,
  title: s.title,
  snippet: s.snippet,
  liveUrl: s.liveLinks[0]?.href,
  confidential: false as const,
  label: s.label,
}));

export function caseStudyPath(slug: CaseStudySlug) {
  return `/case-studies/${slug}`;
}

export function resolveCaseStudy(slug: string) {
  const confidential = CONFIDENTIAL_CASE_STUDIES.find((s) => s.id === slug);
  if (confidential) return confidential;
  const concept = CONCEPT_CASE_STUDIES.find((s) => s.id === slug);
  return concept ?? null;
}

export function isConceptCaseStudy(
  study: ConfidentialCaseStudy | ConceptCaseStudy
): study is ConceptCaseStudy {
  return "kind" in study && study.kind === "concept";
}

/** Integrated app directory — same origin as main portfolio */
export const APPS_FOR_EVERYONE_PATH = "/AppsForEveryone";
export const STUDIO_CONCEPTS_HASH = "/#studio-concepts";
