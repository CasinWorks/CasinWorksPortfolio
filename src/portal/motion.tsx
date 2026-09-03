import { type Key, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLocation, Outlet } from "react-router-dom";
import type { MilestoneStatus } from "./types";

/** Editorial ease — same curve as portal.css `--press`. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const PAGE_MS = 0.24;
export const STAGGER_MS = 0.05;
export const STAGGER_Y = 24;
export const FILL_MS = 0.42;
export const DOT_MS = 0.28;

const pageTransition = { duration: PAGE_MS, ease: EASE };

export function PageFade({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

/** Enter-only route fade. No exit wait — navigation should feel instant. */
export function AnimatedOutlet() {
  const location = useLocation();
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={location.pathname}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      <Outlet />
    </motion.div>
  );
}

export function StaggerList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  key?: Key;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: STAGGER_MS, delayChildren: 0.04 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  key?: Key;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={
        reduce
          ? undefined
          : {
              hidden: { opacity: 0, y: STAGGER_Y },
              show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
            }
      }
    >
      {children}
    </motion.div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div
      className="h-1.5 w-full bg-black/10 overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full w-full bg-black origin-left will-change-transform"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: pct / 100 }}
        transition={reduce ? { duration: 0 } : { duration: FILL_MS, ease: EASE }}
      />
    </div>
  );
}

const DOT_FILL: Record<MilestoneStatus, string> = {
  upcoming: "#ecebe7",
  current: "#1a1a1a",
  done: "#1a1a1a",
  blocked: "#BA593E",
};

export function TimelineDot({
  status,
  className,
}: {
  status: MilestoneStatus;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={`rounded-full ${className ?? ""}`}
      initial={false}
      animate={{
        scale: status === "current" ? 1.22 : status === "blocked" ? 1.08 : 1,
        backgroundColor: DOT_FILL[status],
        boxShadow:
          status === "upcoming" ? "inset 0 0 0 2px #94a3b8" : "inset 0 0 0 0px rgba(0,0,0,0)",
      }}
      transition={reduce ? { duration: 0 } : { duration: DOT_MS, ease: EASE }}
    />
  );
}
