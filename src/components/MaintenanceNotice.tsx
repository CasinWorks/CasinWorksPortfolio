import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/** Set to false or remove this component when maintenance is over. */
const MAINTENANCE_ENABLED = false;

const MANILA_TZ = "Asia/Manila";
const DISMISS_KEY = "casinworks-maintenance-dismissed";
const END_KEY = "casinworks-maintenance-end";

function getNextMidnightManila(from = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(from);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "01";
  const y = get("year");
  const m = get("month");
  const d = String(Number(get("day")) + 1).padStart(2, "0");

  return new Date(`${y}-${m}-${d}T00:00:00+08:00`);
}

function getMaintenanceEndMs(): number {
  const stored = localStorage.getItem(END_KEY);
  if (stored) return Number(stored);

  const end = getNextMidnightManila().getTime();
  localStorage.setItem(END_KEY, String(end));
  return end;
}

function isMaintenanceActive(): boolean {
  if (!MAINTENANCE_ENABLED) return false;
  return Date.now() < getMaintenanceEndMs();
}

export function MaintenanceNotice() {
  const [open, setOpen] = useState(false);

  const returnLabel = useMemo(() => {
    const end = new Date(getMaintenanceEndMs());
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: MANILA_TZ,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(end);
  }, []);

  useEffect(() => {
    if (!isMaintenanceActive()) return;
    const dismissed = sessionStorage.getItem(DISMISS_KEY);
    if (!dismissed) setOpen(true);
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  if (!isMaintenanceActive()) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0D0D0B]/75 backdrop-blur-sm"
            aria-hidden
            onClick={dismiss}
          />

          <motion.div
            role="alertdialog"
            aria-labelledby="maintenance-title"
            aria-describedby="maintenance-desc"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#1a1a1a] text-white p-10 sm:p-12 shadow-[0_40px_120px_rgba(0,0,0,0.5)]"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500 mb-6">
              Site notice
            </p>
            <h2 id="maintenance-title" className="font-serif text-3xl sm:text-4xl font-bold italic leading-tight tracking-tighter">
              Under maintenance
            </h2>
            <p id="maintenance-desc" className="mt-6 text-lg text-slate-400 leading-snug tracking-tight">
              Casin Works is temporarily under maintenance. Everything will be back online at{" "}
              <span className="text-white font-semibold">12:00 AM</span> ({returnLabel} Philippine Time).
            </p>
            <p className="mt-4 text-sm text-slate-500 leading-relaxed">
              Thank you for your patience. You may continue browsing, but some features may be unavailable until service resumes.
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="mt-10 w-full sm:w-auto rounded-full bg-white text-black px-8 py-4 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Understood
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
