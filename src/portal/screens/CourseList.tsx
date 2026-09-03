import { type DragEvent, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";
import {
  applyCourseTemplate,
  deleteCourseTemplate,
  deleteMilestoneOnCourse,
  fetchCourseTemplates,
  holesFromMilestones,
  reorderMilestones,
  saveCourseTemplate,
  standardCourseHoles,
} from "../api";
import type { CourseTemplate, Milestone } from "../types";
import { attachmentLabel, resolveAttachmentNeed } from "../pipeline";
import { StatusPill, milestoneLabel, milestoneTone } from "./ui";

export function MilestoneCourseList({
  projectId,
  milestones,
  reorderable,
  onSelect,
  onChanged,
}: {
  projectId: string;
  milestones: Milestone[];
  reorderable: boolean;
  onSelect: (m: Milestone) => void;
  onChanged?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Milestone[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = draft ?? milestones;

  useEffect(() => {
    setDraft(null);
  }, [milestones]);

  async function persist(next: Milestone[]) {
    setBusy(true);
    try {
      await reorderMilestones(projectId, next.map((m) => m.id));
      await onChanged?.();
    } catch {
      setDraft(null);
    } finally {
      setBusy(false);
      setDragId(null);
    }
  }

  function move(fromId: string, toId: string) {
    if (fromId === toId) return;
    const current = draft ?? milestones;
    const from = current.findIndex((m) => m.id === fromId);
    const to = current.findIndex((m) => m.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...current];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setDraft(next);
  }

  function shift(id: string, dir: -1 | 1) {
    const current = draft ?? milestones;
    const from = current.findIndex((m) => m.id === id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= current.length) return;
    const next = [...current];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    void persist(next);
  }

  function onDragStart(e: DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function onDragOver(e: DragEvent, id: string) {
    if (!dragId) return;
    e.preventDefault();
    move(dragId, id);
  }

  function onDragEnd() {
    if (draft) void persist(draft);
    else setDragId(null);
  }

  async function removeHole(m: Milestone) {
    const ok = window.confirm(`Delete “${m.title}” from this course?`);
    if (!ok) return;
    setBusy(true);
    try {
      await deleteMilestoneOnCourse(projectId, m.id);
      await onChanged?.();
    } catch {
      setDraft(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`mt-2 border-t border-black/10 max-w-xl ${busy ? "opacity-70" : ""}`}>
      {rows.map((m, i) => (
        <div
          key={m.id}
          onDragOver={reorderable ? (e) => onDragOver(e, m.id) : undefined}
          onDrop={reorderable ? (e) => { e.preventDefault(); onDragEnd(); } : undefined}
          className={`border-b border-black/10 flex items-stretch ${
            m.status === "current" ? "bg-white border-l-2 border-l-black" : ""
          } ${dragId === m.id ? "opacity-50" : ""}`}
        >
          {reorderable && (
            <div className="flex flex-col justify-center shrink-0 border-r border-black/5">
              <button
                type="button"
                draggable
                onDragStart={(e) => onDragStart(e, m.id)}
                onDragEnd={onDragEnd}
                className="px-1.5 py-2 text-slate-400 hover:text-black cursor-grab active:cursor-grabbing"
                aria-label={`Drag to reorder ${m.title}`}
              >
                <GripVertical className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                disabled={i === 0 || busy}
                onClick={() => shift(m.id, -1)}
                className="px-1.5 py-0.5 text-slate-400 hover:text-black disabled:opacity-30"
                aria-label={`Move ${m.title} up`}
              >
                <ChevronUp className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                disabled={i === rows.length - 1 || busy}
                onClick={() => shift(m.id, 1)}
                className="px-1.5 py-0.5 text-slate-400 hover:text-black disabled:opacity-30"
                aria-label={`Move ${m.title} down`}
              >
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => onSelect(m)}
            className="flex-1 py-3 px-3 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-5 text-[11px] font-mono text-slate-400">{i + 1}</span>
              <span
                className={`size-2.5 rounded-full shrink-0 ${
                  m.status === "blocked"
                    ? "bg-[#BA593E]"
                    : m.status === "upcoming"
                      ? "border border-slate-400 bg-transparent"
                      : "bg-black"
                }`}
              />
              <div>
                <div className="font-semibold text-sm">{m.title}</div>
                <div className="text-xs text-slate-500">
                  {m.date}
                  {attachmentLabel(resolveAttachmentNeed(m.kind, m.attachmentNeed))
                    ? ` · ${attachmentLabel(resolveAttachmentNeed(m.kind, m.attachmentNeed))}`
                    : ""}
                </div>
              </div>
            </div>
            <StatusPill tone={milestoneTone(m.status)}>{milestoneLabel(m.status)}</StatusPill>
          </button>
          {reorderable && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void removeHole(m)}
              className="shrink-0 px-3 text-slate-400 hover:text-red-800 disabled:opacity-50"
              aria-label={`Delete ${m.title}`}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function CourseTemplateBar({
  projectId,
  milestones,
  onChanged,
}: {
  projectId: string;
  milestones: Milestone[];
  onChanged: () => Promise<void>;
}) {
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function reloadTemplates() {
    setTemplates(await fetchCourseTemplates());
  }

  useEffect(() => {
    if (!open) return;
    reloadTemplates().catch((e) => setError(e instanceof Error ? e.message : "Could not load templates."));
  }, [open]);

  async function save() {
    const label = name.trim();
    if (!label) {
      setError("Name the template first.");
      return;
    }
    if (milestones.length === 0) {
      setError("Add holes before saving a template.");
      return;
    }
    setBusy("save");
    setError("");
    try {
      await saveCourseTemplate(label, holesFromMilestones(milestones));
      setName("");
      setMsg(`Saved “${label}”.`);
      await reloadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save template. Republish Firestore rules if this is a new collection.");
    } finally {
      setBusy("");
    }
  }

  async function apply(holes: CourseTemplate["holes"], mode: "append" | "replace", label: string) {
    if (mode === "replace" && milestones.length > 0) {
      const ok = window.confirm(`Replace this course with “${label}”? Current holes will be removed. Documents stay on the project.`);
      if (!ok) return;
    }
    setBusy(label);
    setError("");
    try {
      await applyCourseTemplate(projectId, holes, mode);
      setMsg(mode === "replace" ? `Course replaced with “${label}”.` : `Added “${label}” to this course.`);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply template.");
    } finally {
      setBusy("");
    }
  }

  async function remove(t: CourseTemplate) {
    if (!window.confirm(`Delete template “${t.name}”?`)) return;
    setBusy(t.id);
    try {
      await deleteCourseTemplate(t.id);
      await reloadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete template.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mt-4 max-w-xl">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs font-semibold underline underline-offset-4">
        {open ? "Hide templates" : "Save or reuse this course"}
      </button>
      {open && (
        <div className="mt-3 border border-black/10 bg-white p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Save this sequence</p>
            <p className="mt-1 text-sm text-slate-600">Stores titles and order — not dates or who’s current. Reuse it on the next engagement.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Toyota delivery course"
                className="flex-1 min-w-[12rem] px-3 py-2 bg-[var(--page-panel)] border border-black/15 text-sm"
              />
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void save()}
                className="rounded-full bg-black text-white px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                Save template
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Use a template</p>
            <div className="mt-2 divide-y divide-black/10 border-y border-black/10">
              <TemplateRow
                name="CasinWorks standard"
                count={standardCourseHoles().length}
                busy={Boolean(busy)}
                onAppend={() => void apply(standardCourseHoles(), "append", "CasinWorks standard")}
                onReplace={() => void apply(standardCourseHoles(), "replace", "CasinWorks standard")}
              />
              {templates.map((t) => (
                <div key={t.id}>
                  <TemplateRow
                    name={t.name}
                    count={t.holes.length}
                    busy={Boolean(busy)}
                    onAppend={() => void apply(t.holes, "append", t.name)}
                    onReplace={() => void apply(t.holes, "replace", t.name)}
                    onDelete={() => void remove(t)}
                  />
                </div>
              ))}
            </div>
            {templates.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">No saved templates yet. Save this course once, then apply it on the next project.</p>
            )}
          </div>
          {msg && <p className="text-sm bg-black text-white px-3 py-2">{msg}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      )}
    </div>
  );
}

function TemplateRow({
  name,
  count,
  busy,
  onAppend,
  onReplace,
  onDelete,
}: {
  name: string;
  count: number;
  busy: boolean;
  onAppend: () => void;
  onReplace: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="py-3 flex flex-wrap items-center justify-between gap-2">
      <div>
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-xs text-slate-500">{count} holes</div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" disabled={busy} onClick={onAppend} className="rounded-full border border-black/15 px-3 py-1 text-[11px] font-semibold disabled:opacity-50">
          Add to course
        </button>
        <button type="button" disabled={busy} onClick={onReplace} className="rounded-full bg-black text-white px-3 py-1 text-[11px] font-semibold disabled:opacity-50">
          Use on this project
        </button>
        {onDelete && (
          <button type="button" disabled={busy} onClick={onDelete} className="rounded-full border border-black/15 px-3 py-1 text-[11px] font-semibold text-red-800 disabled:opacity-50">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
