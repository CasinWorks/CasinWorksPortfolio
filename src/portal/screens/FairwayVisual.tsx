import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";
import type { Milestone, ProjectDocument } from "../types";
import { attachmentLabel, docsForHole, resolveAttachmentNeed } from "../pipeline";
import { EASE } from "../motion";
import { ProjectRecordsList } from "./ProjectRecordsList";
import { milestoneLabel, milestoneTone, StatusPill } from "./ui";

const RIBBON =
  "M 168 40 C 168 70 218 85 218 120 C 218 160 140 175 134 215 C 128 250 120 275 134 310 C 154 345 218 355 212 390 C 206 425 168 435 168 448";

type Point = { x: number; y: number };

const FALLBACK: Point[] = [
  { x: 174, y: 64 },
  { x: 198, y: 112 },
  { x: 16, y: 164 },
  { x: 16, y: 220 },
  { x: 24, y: 276 },
  { x: 170, y: 336 },
  { x: 190, y: 388 },
  { x: 168, y: 420 },
];

function samplePath(d: string, count: number): Point[] {
  if (count <= 0 || typeof document === "undefined") return [];
  const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
  el.setAttribute("d", d);
  const len = el.getTotalLength();
  if (!len) return [];
  const start = len * 0.1;
  const end = len * 0.86;
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const p = el.getPointAtLength(start + (end - start) * t);
    return { x: p.x, y: p.y };
  });
}

function targetIndex(milestones: Milestone[]) {
  const current = milestones.findIndex((m) => m.status === "current");
  if (current >= 0) return current;
  if (milestones.length > 0 && milestones.every((m) => m.status === "done")) return milestones.length - 1;
  return 0;
}

function goalT(count: number, index: number) {
  if (count <= 1) return 0.5;
  return index / Math.max(1, count - 1);
}

export function FairwayVisual({
  milestones,
  documents,
  projectId,
  onSelect,
}: {
  milestones: Milestone[];
  documents?: ProjectDocument[];
  projectId?: string;
  onSelect: (m: Milestone) => void;
}) {
  const shown = milestones;
  const reduce = useReducedMotion();
  const [points, setPoints] = useState<Point[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(shown.find((m) => m.status === "current")?.id ?? shown[0]?.id ?? null);
  const [runId, setRunId] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ribbonRef = useRef<SVGPathElement>(null);
  const progressRef = useRef<SVGPathElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const t = useMotionValue(0);
  const [scale, setScale] = useState(1);

  const goal = useMemo(() => targetIndex(shown), [shown]);
  const goalId = shown[goal]?.id ?? "";
  const dest = goalT(shown.length, goal);

  const applyT = (v: number) => {
    const el = ribbonRef.current;
    const ball = ballRef.current;
    if (el && ball) {
      const len = el.getTotalLength();
      if (len) {
        const start = len * 0.1;
        const end = len * 0.86;
        const p = el.getPointAtLength(start + (end - start) * v);
        ball.style.transform = `translate3d(${p.x - 8}px, ${p.y - 8}px, 0)`;
      }
    }
    const stroke = progressRef.current;
    if (stroke) {
      stroke.style.strokeDasharray = `${8 + 78 * v} 100`;
    }
  };

  useMotionValueEvent(t, "change", applyT);

  useLayoutEffect(() => {
    const sampled = samplePath(RIBBON, shown.length);
    setPoints(sampled.length === shown.length ? sampled : FALLBACK.slice(0, shown.length));
  }, [shown.length]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / 340));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (reduce) {
      t.set(dest);
      applyT(dest);
      return;
    }
    applyT(t.get());
  }, [points, dest, reduce, t]);

  useEffect(() => {
    if (reduce) {
      t.set(dest);
      applyT(dest);
      return;
    }
    const from = t.get();
    const distance = Math.abs(dest - from);
    const duration = Math.min(0.85, 0.32 + distance * 0.5);
    const controls = animate(t, dest, { duration, ease: EASE });
    return () => controls.stop();
  }, [dest, goalId, runId, reduce, t]);

  const focused = shown.find((m) => m.id === focusedId) ?? shown[goal];
  const focusedPoint = focused ? points[shown.findIndex((m) => m.id === focused.id)] : undefined;
  const calloutLeft = focusedPoint ? focusedPoint.x < 170 : true;
  const related = focused && documents ? docsForHole(focused.kind, documents) : [];

  function replay() {
    t.set(0);
    applyT(0);
    setRunId((n) => n + 1);
  }

  return (
    <div className="relative w-full flex flex-col items-center py-2">
      <div ref={wrapRef} className="w-full max-w-[340px]">
        <div className="relative overflow-hidden" style={{ height: 480 * scale }}>
          <div className="absolute top-0 left-0 origin-top-left" style={{ width: 340, height: 480, transform: `scale(${scale})` }}>
        <svg viewBox="0 0 340 480" className="absolute inset-0 w-full h-full pointer-events-none">
          <path
            ref={ribbonRef}
            d={RIBBON}
            fill="none"
            stroke="#DDD6C6"
            strokeWidth="38"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            ref={progressRef}
            d={RIBBON}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="38"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            strokeDasharray="8 100"
            opacity={0.08}
          />
          <text x="168" y="23" textAnchor="middle" className="fill-slate-500 text-[11px]">
            Start
          </text>
          <circle cx="168" cy="40" r="4.5" fill="#1a1a1a" />
          {shown.some((m) => m.status === "blocked") && (
            <circle cx="124" cy="274" r="5" fill="#BA593E" stroke="var(--page-cream)" strokeWidth="2" />
          )}
          <line x1="168" y1="448" x2="168" y2="416" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
          <polygon points="168,418 182,426 168,434" fill="#BA593E" />
          <text x="168" y="466" textAnchor="middle" className="fill-slate-500 text-[11px]">
            Finish
          </text>
        </svg>

        {shown.map((m, i) => {
          const slot = points[i];
          if (!slot) return null;
          const active = m.id === focusedId;
          const isCurrent = m.status === "current";
          const cls =
            m.status === "blocked"
              ? "bg-[#BA593E] text-white border-[#BA593E]"
              : isCurrent
                ? "bg-black text-white border-black"
                : m.status === "upcoming"
                  ? "bg-white text-[#1a1a1a] border-black/25"
                  : "bg-[#1a1a1a] text-white border-[#1a1a1a]";
          return (
            <motion.button
              key={m.id}
              type="button"
              onClick={() => setFocusedId(m.id)}
              style={{ left: slot.x - 14, top: slot.y - 14 }}
              initial={false}
              animate={{
                scale: active || isCurrent ? 1.12 : 1,
                backgroundColor:
                  m.status === "blocked" ? "#BA593E" : m.status === "upcoming" ? "#ffffff" : "#1a1a1a",
                color: m.status === "upcoming" ? "#1a1a1a" : "#ffffff",
                borderColor:
                  m.status === "blocked" ? "#BA593E" : m.status === "upcoming" ? "rgba(0,0,0,0.25)" : "#1a1a1a",
              }}
              transition={reduce ? { duration: 0 } : { duration: 0.28, ease: EASE }}
              className={`absolute z-10 size-7 rounded-full border text-[11px] font-semibold flex items-center justify-center ${cls} ${
                active ? "ring-4 ring-black/10" : ""
              }`}
              aria-label={`${m.title}, ${milestoneLabel(m.status)}`}
            >
              {i + 1}
            </motion.button>
          );
        })}

        <div
          ref={ballRef}
          className="absolute z-20 top-0 left-0 size-4 rounded-full bg-white border-2 border-black shadow-[0_1px_4px_rgba(0,0,0,0.25)] pointer-events-none will-change-transform"
          style={{ visibility: points.length ? "visible" : "hidden" }}
          aria-hidden
        >
          <span className="absolute inset-[3px] rounded-full border border-black/20" />
        </div>

        {focused && focusedPoint && (
          <div
            className={`absolute z-30 max-w-[168px] rounded-lg px-3 py-2 shadow-sm text-left ${
              focused.status === "blocked" ? "bg-[#BA593E] text-white" : "bg-[#1a1a1a] text-white"
            }`}
            style={{
              left: Math.max(8, Math.min(172, calloutLeft ? focusedPoint.x + 22 : focusedPoint.x - 178)),
              top: Math.max(8, Math.min(420, focusedPoint.y - 28)),
            }}
          >
            <div className="text-[12px] font-medium leading-tight">{focused.title}</div>
            <div className="text-[11px] opacity-90 mt-0.5">{focused.date}</div>
          </div>
        )}
          </div>
        </div>
      </div>

      {focused && (
        <div className="mt-4 w-full max-w-xl border border-black/10 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Hole {(shown.findIndex((m) => m.id === focused.id) + 1) || 1}
              </p>
              <h3 className="mt-1 font-serif text-xl font-semibold">{focused.title}</h3>
              {focused.description && <p className="mt-1 text-sm text-slate-600">{focused.description}</p>}
              {attachmentLabel(resolveAttachmentNeed(focused.kind, focused.attachmentNeed)) && (
                <p className="mt-1 text-xs text-slate-500">
                  {attachmentLabel(resolveAttachmentNeed(focused.kind, focused.attachmentNeed))}
                </p>
              )}
            </div>
            <StatusPill tone={milestoneTone(focused.status)}>{milestoneLabel(focused.status)}</StatusPill>
          </div>
          {focused.requiresAction && (
            <p className="mt-3 text-sm text-[#BA593E]">Action needed from the client — open project records.</p>
          )}
          {projectId && related.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">Files on this hole</p>
              <ProjectRecordsList projectId={projectId} documents={related} />
            </div>
          )}
          {projectId && related.length === 0 && focused && documents && (
            <p className="mt-3 text-xs text-slate-500">No file on this hole yet.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={replay}
              className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold"
            >
              Replay the walk
            </button>
            <button
              type="button"
              onClick={() => onSelect(focused)}
              className="rounded-full bg-black text-white px-4 py-2 text-xs font-semibold"
            >
              Show in the list
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
