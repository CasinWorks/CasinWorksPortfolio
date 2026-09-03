import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import { applyToGig, fetchApplicationsForUser, fetchOpenGigs } from "../api";
import { usePortalAuth } from "../auth";
import type { Gig, GigApplication } from "../types";

export function GigBoardScreen() {
  usePageMeta({
    title: `Gig board — Portal | ${SITE.name}`,
    path: "/portal/gigs",
    noIndex: true,
  });
  const { profile } = usePortalAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [apps, setApps] = useState<GigApplication[]>([]);
  const [query, setQuery] = useState("");
  const [discipline, setDiscipline] = useState("All");
  const [selected, setSelected] = useState<Gig | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOpenGigs()
      .then(setGigs)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load gigs."));
    if (profile) {
      fetchApplicationsForUser(profile.uid).then(setApps).catch(() => undefined);
    }
  }, [profile]);

  const disciplines = useMemo(() => {
    const set = new Set(gigs.map((g) => g.discipline).filter(Boolean) as string[]);
    return ["All", ...set];
  }, [gigs]);

  const filtered = gigs.filter((g) => {
    const q = query.toLowerCase();
    const matchQ =
      !q ||
      g.title.toLowerCase().includes(q) ||
      (g.location ?? "").toLowerCase().includes(q) ||
      g.postedBy.toLowerCase().includes(q);
    const matchD = discipline === "All" || g.discipline === discipline;
    return matchQ && matchD;
  });

  const appliedIds = new Set(apps.map((a) => a.gigId));

  async function onApply(gig: Gig, statement: string) {
    if (!profile) return;
    await applyToGig({
      gigId: gig.id,
      applicantId: profile.uid,
      applicantName: profile.displayName,
      applicantEmail: profile.email,
      statement,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    const next = await fetchApplicationsForUser(profile.uid);
    setApps(next);
    setSelected(null);
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        CasinWorks // Subcontractor registry
      </p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight leading-[1.05]">
        High-stakes engagements & <span className="italic text-slate-400">open postings.</span>
      </h1>
      <p className="mt-3 max-w-xl text-slate-600">
        Specialized roles for independent engineers. Apply here; engagement contracts happen off-platform.
      </p>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <div className="mt-6 relative max-w-xl">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search discipline, location, or posting…"
          className="w-full pl-9 pr-4 py-2 bg-[var(--page-panel)] border border-black/15 text-sm focus:outline-none focus:border-black"
        />
        <Search className="size-3.5 text-slate-400 absolute left-3 top-2.5" aria-hidden />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {disciplines.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDiscipline(d)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium ${
              discipline === d ? "bg-black text-white" : "border border-black/15 text-slate-600"
            }`}
          >
            {d === "All" ? "All roles" : d}
          </button>
        ))}
      </div>

      <div className="mt-8 divide-y divide-black/10 border-y border-black/10">
        {filtered.length === 0 && <p className="py-10 text-slate-500">No open postings right now.</p>}
        {filtered.map((gig) => (
          <button
            key={gig.id}
            type="button"
            onClick={() => setSelected(gig)}
            className="w-full text-left py-6 hover:bg-[var(--page-panel)]/70"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {gig.discipline || "Engagement"}
              {gig.clientCode ? ` · ${gig.clientCode}` : ""}
            </p>
            <h2 className="mt-2 font-serif text-xl font-semibold">{gig.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {gig.location && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] border border-black/15">
                  <MapPin className="size-3" aria-hidden /> {gig.location}
                </span>
              )}
              {gig.workType && (
                <span className="px-2 py-0.5 text-[11px] border border-black/15">{gig.workType}</span>
              )}
              {gig.rate && <span className="px-2 py-0.5 text-[11px] border border-black/15">{gig.rate}</span>}
            </div>
            <p className="mt-3 text-sm text-slate-600 line-clamp-2">{gig.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold">
              {appliedIds.has(gig.id) ? "Application sent" : "View dossier"} <ArrowRight className="size-3.5" aria-hidden />
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <GigModal
            gig={selected}
            applied={appliedIds.has(selected.id)}
            onClose={() => setSelected(null)}
            onApply={onApply}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GigModal({
  gig,
  applied,
  onClose,
  onApply,
}: {
  gig: Gig;
  applied: boolean;
  onClose: () => void;
  onApply: (gig: Gig, statement: string) => Promise<void>;
}) {
  const [statement, setStatement] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="relative w-full max-w-lg bg-[var(--page-cream)] border border-black/15 z-10 max-h-[85vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-black/10 flex justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {gig.discipline || "Engagement"}
          </span>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-black text-sm">
            Close
          </button>
        </div>
        <div className="p-6 space-y-4">
          <h2 className="font-serif text-2xl font-semibold leading-tight">{gig.title}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{gig.description}</p>
          {gig.deliverables && gig.deliverables.length > 0 && (
            <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
              {gig.deliverables.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
          {!applied && (
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Availability and relevant background"
              rows={4}
              className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm focus:outline-none focus:border-black"
            />
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="button"
            disabled={sending || applied}
            onClick={async () => {
              setSending(true);
              setError("");
              try {
                await onApply(gig, statement);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not apply.");
              } finally {
                setSending(false);
              }
            }}
            className="w-full py-3.5 bg-black text-white rounded-full text-sm font-semibold disabled:opacity-50"
          >
            {applied ? "Already applied" : sending ? "Sending…" : "Submit application"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
