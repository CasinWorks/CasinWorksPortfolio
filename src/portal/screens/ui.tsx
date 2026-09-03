import { motion, useReducedMotion } from "motion/react";
import type { DocumentStatus, MilestoneStatus, ProjectStatus } from "../types";
import { EASE } from "../motion";

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "neutral" | "blocked" | "current" | "muted";
}) {
  const reduce = useReducedMotion();
  const cls =
    tone === "blocked"
      ? "bg-[#F8ECE8] text-[#BA593E]"
      : tone === "current"
        ? "bg-black text-white"
        : tone === "muted"
          ? "text-slate-400"
          : "bg-[var(--page-panel)] text-slate-600";
  const enter =
    reduce || tone === "muted"
      ? undefined
      : tone === "blocked" || tone === "current"
        ? { opacity: [0.5, 1, 0.78, 1] }
        : { opacity: [0.65, 1] };

  if (tone === "muted") {
    return <span className={`text-[11px] font-medium ${cls}`}>{children}</span>;
  }
  return (
    <motion.span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}
      initial={false}
      animate={enter}
      transition={{ duration: 0.55, ease: EASE }}
    >
      {children}
    </motion.span>
  );
}

export function milestoneTone(status: MilestoneStatus): "neutral" | "blocked" | "current" | "muted" {
  if (status === "blocked") return "blocked";
  if (status === "current") return "current";
  if (status === "upcoming") return "muted";
  return "neutral";
}

export function milestoneLabel(status: MilestoneStatus) {
  if (status === "blocked") return "Blocked on you";
  if (status === "current") return "Current";
  if (status === "upcoming") return "Upcoming";
  return "Done";
}

export function projectLabel(status: ProjectStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function documentTone(status: DocumentStatus): "neutral" | "blocked" | "current" | "muted" {
  if (status === "awaiting_payment" || status === "needs_upload" || status === "expired") return "blocked";
  if (status === "pending_review" || status === "issued") return "current";
  return "neutral";
}
