/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppItem, DesignColor, DesignTypo } from "./types";

export const APPS_DATA: AppItem[] = [
  {
    id: "vigilkeep",
    name: "VigilKeep",
    category: "PERSONAL / RENEWAL",
    status: "LIVE",
    demoLabel: "LIVE DEMO",
    description:
      "A personal renewal companion and expiry guardian for passports, licenses, and registrations — private aliases instead of real numbers, with everything stored locally in your browser.",
    url: "https://vigil-keep.vercel.app",
    releaseDate: "June 2026",
    technologies: ["Local-first storage", "Passcode vault", "Expiry tracking"],
  },
  {
    id: "bills-quote",
    name: "Quotation & Invoice Workspace",
    category: "PROFESSIONAL SERVICES",
    status: "LIVE",
    demoLabel: "LIVE DEMO",
    description:
      "A contractor-first workflow that turns quoting and invoicing into clean, trackable income records — without spreadsheets.",
    url: "https://bills-quote.vercel.app/login",
    technologies: [
      "Clients & quotes",
      "Invoices workflow",
      "Dashboard & CSV export",
    ],
    details: {
      primaryOutcome:
        "Faster document creation, fewer errors through reusable defaults, and a clearer picture of issued value over time.",
      problem: [
        "Quoting and invoicing starts in templates/spreadsheets, then slowly becomes inconsistent and error-prone.",
        "Client details, payment instructions, and terms drift across documents over time.",
        "There's no reliable month-to-month view of issued work (quoted vs invoiced) for cashflow planning.",
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
      nextSteps: [
        "PDF generation + branded templates",
        "Payment status tracking + reminders",
        "Tax/VAT + multi-currency support",
        "Role-based access for small teams",
        "Cloud sync + audit history (optional)",
      ],
    },
  },
  {
    id: "kinsenas",
    name: "KinsenasApp",
    category: "CONSUMER FINANCE",
    status: "LIVE",
    demoLabel: "LIVE DEMO",
    caseStudy: true,
    description:
      "A cutoff-based personal finance tracker for everyday Filipinos — with an AI-ready briefing prompt for guidance.",
    url: "https://kinsenas-app-virid.vercel.app",
    technologies: [
      "15th/30th cutoffs",
      "Bills & savings",
      "AI briefing prompt",
    ],
    details: {
      primaryOutcome:
        "A simpler, more realistic money workflow (15th/30th cutoff) that people can actually maintain — plus clearer next-step guidance.",
      problem: [
        "Many finance apps feel too complex: too many categories, charts, and jargon.",
        "Tracking alone doesn't help; users still ask \"so what should I do next?\"",
        "Real-life budgeting often follows 15th/30th payroll cutoffs, but most tools don't model this well.",
      ],
      solution: [
        "A mobile-first workspace with cutoff-based budgeting and essential trackers (bills, savings, loans, investments).",
        "Clear progress views per cutoff so users quickly see what's due, paid, and left.",
        "A structured \"AI briefing prompt\" generator that summarizes finances for any AI assistant to analyze.",
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
    },
  },
];

export const DESIGN_COLORS: DesignColor[] = [
  {
    name: "Warm Cream",
    slug: "brand-cream",
    hex: "#F5F3EE",
    role: "Primary background canvas. Recreates physical design journal feel.",
  },
  {
    name: "Near Black",
    slug: "brand-dark",
    hex: "#0D0D0B",
    role: "Display text, heavy overlines, hairline separators, and primary button fills.",
  },
  {
    name: "Deep Slate-Teal",
    slug: "brand-teal",
    hex: "#2D4A5A",
    role: "Humanist body prose, supporting tags, active indicator fills, and subtitle overlines.",
  },
  {
    name: "Soft Lavender",
    slug: "brand-lavender",
    hex: "#C8CEE0",
    role: "Decorative watermarks, layered italic typography, and subtle layout guidelines.",
  },
];

export const DESIGN_TYPOGRAPHY: DesignTypo[] = [
  {
    level: "Display Title (H1)",
    fontFamily: "Cormorant Garamond (Serif)",
    size: "3.5rem - 4.25rem",
    weight: "Light (300) / Regular (400)",
    useCase: "Hero showcase heading 'Apps For Everyone' and branding headers.",
  },
  {
    level: "Section Title (H2)",
    fontFamily: "Cormorant Garamond (Serif)",
    size: "2.25rem",
    weight: "Regular (400) / Medium (500)",
    useCase: "Grid module titles, sidebar panels, and interactive details headings.",
  },
  {
    level: "Card Header (H3)",
    fontFamily: "Cormorant Garamond (Serif)",
    size: "1.75rem",
    weight: "SemiBold (600)",
    useCase: "Individual web application card names.",
  },
  {
    level: "Tracking Label (Overline)",
    fontFamily: "DM Sans (Sans-serif)",
    size: "0.75rem (12px)",
    weight: "Medium (500) with tracking-widest (0.2em)",
    useCase: "Locations, release status overlines, active timestamps, and categories.",
  },
  {
    level: "Journal Prose (Body)",
    fontFamily: "DM Sans (Sans-serif)",
    size: "0.925rem (15px)",
    weight: "Regular (400) / Line height 1.6",
    useCase: "App descriptions, explanatory modals, and persistent notifications.",
  },
];

export const GENERAL_SPECS = {
  appName: "Casin Works — Apps For Everyone",
  developerName: "C.J. Casin",
  location: "Mandaluyong, Philippines",
  missionStatement:
    "Designing lightweight, high-utility, and privacy-first software tools for everyday Filipinos. Free of cost, free of tracking.",
  hostingHint:
    "All applications in this hub run in micro-containers or static servers on isolated domains. This dashboard serves as a luxury directory to unify access.",
  securityStatement:
    "Cryptographic sandbox: your credentials and sessions are hashed and kept locally in your context. No passwords, trackers, or cookies are ever forwarded to any remote cloud endpoint.",
};
