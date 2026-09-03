import { type FormEvent, useState } from "react";
import {
  applyCourseTemplate,
  commitMilestoneStatus,
  createMilestone,
  deleteMilestoneOnCourse,
  fetchMilestones,
  standardCourseHoles,
  syncProjectProgress,
  updateMilestone,
} from "../api";
import type { AttachmentNeed, Milestone, MilestoneKind, MilestoneStatus } from "../types";
import { HOLE_TEMPLATES, attachmentLabel, kindLabel, resolveAttachmentNeed } from "../pipeline";
import { StatusPill, milestoneLabel, milestoneTone } from "./ui";

type HoleTemplateId = "custom" | "quotation" | "po" | "invoice";

export function MilestoneManage({
  projectId,
  milestones,
  onChanged,
}: {
  projectId: string;
  milestones: Milestone[];
  onChanged: () => Promise<void>;
}) {
  const [templateId, setTemplateId] = useState<HoleTemplateId>("custom");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<MilestoneKind>("custom");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [requiresAction, setRequiresAction] = useState(false);
  const [attachmentNeed, setAttachmentNeed] = useState<AttachmentNeed>("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  function pickTemplate(id: HoleTemplateId) {
    setTemplateId(id);
    if (id === "custom") {
      setKind("custom");
      return;
    }
    const template = HOLE_TEMPLATES.find((row) => row.id === id);
    if (!template) return;
    setTitle(template.title);
    setKind(template.kind);
    setDescription(template.description);
    setAttachmentNeed(template.attachmentNeed);
    setRequiresAction(template.requiresAction);
  }

  function resetForm() {
    setTemplateId("custom");
    setTitle("");
    setKind("custom");
    setDescription("");
    setRequiresAction(false);
    setAttachmentNeed("none");
  }

  async function refresh() {
    const list = await fetchMilestones(projectId);
    await syncProjectProgress(projectId, list);
    await onChanged();
  }

  async function addHole(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("add");
    try {
      const hasCurrent = milestones.some((m) => m.status === "current");
      await createMilestone({
        projectId,
        title: title.trim(),
        kind,
        date,
        description: description.trim(),
        status: hasCurrent ? "upcoming" : "current",
        requiresAction,
        attachmentNeed,
        ...(requiresAction ? { actionType: "approval" as const } : {}),
        order: milestones.length,
      });
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add milestone.");
    } finally {
      setBusy("");
    }
  }

  async function setStatus(m: Milestone, status: MilestoneStatus) {
    setBusy(m.id);
    setError("");
    try {
      await commitMilestoneStatus(projectId, milestones, m.id, status);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update milestone.");
    } finally {
      setBusy("");
    }
  }

  async function loadStandardCourse() {
    setBusy("seed");
    setError("");
    try {
      await applyCourseTemplate(projectId, standardCourseHoles(), "append");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load course.");
    } finally {
      setBusy("");
    }
  }

  async function saveEdit(
    m: Milestone,
    patch: { title: string; date: string; description: string; kind: MilestoneKind; requiresAction: boolean; attachmentNeed: AttachmentNeed },
  ) {
    setBusy(m.id);
    try {
      await updateMilestone(m.id, {
        title: patch.title.trim(),
        date: patch.date,
        description: patch.description.trim(),
        kind: patch.kind,
        requiresAction: patch.requiresAction,
        attachmentNeed: patch.attachmentNeed,
        ...(patch.requiresAction ? { actionType: "approval" as const } : { actionType: undefined }),
      });
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy("");
    }
  }

  async function remove(m: Milestone) {
    if (!window.confirm(`Remove “${m.title}” from the course?`)) return;
    setBusy(m.id);
    try {
      await deleteMilestoneOnCourse(projectId, m.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="max-w-xl">
      <p className="text-sm text-slate-600">
        Add extra holes if the build needs more stages. Use a quotation, PO, or invoice template when the hole needs a file on record.
      </p>
      {!milestones.some((m) => m.kind && m.kind !== "custom") && (
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void loadStandardCourse()}
          className="mt-4 rounded-full border border-black/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50"
        >
          Load standard course
        </button>
      )}

      <form onSubmit={addHole} className="mt-5 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hole type</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(
              [
                ["custom", "Custom"],
                ["quotation", "Quotation"],
                ["po", "PO"],
                ["invoice", "Invoice"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => pickTemplate(id)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                  templateId === id ? "bg-black text-white" : "border border-black/15"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hole name (e.g. Deployment)" className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={requiresAction} onChange={(e) => setRequiresAction(e.target.checked)} />
            Client action needed
          </label>
        </div>
        <AttachmentNeedToggles value={attachmentNeed} onChange={setAttachmentNeed} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this hole covers (optional)" rows={2} className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <button type="submit" disabled={busy === "add"} className="rounded-full bg-black text-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50">
          Add hole
        </button>
      </form>

      <div className="mt-6 divide-y divide-black/10 border-y border-black/10">
        {milestones.map((m) => (
          <div key={m.id} className="py-4">
            {editingId === m.id ? (
              <EditRow milestone={m} disabled={busy === m.id} onCancel={() => setEditingId(null)} onSave={(patch) => saveEdit(m, patch)} />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm">{m.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {kindLabel(m.kind)} · {m.date}
                      {attachmentLabel(resolveAttachmentNeed(m.kind, m.attachmentNeed))
                        ? ` · ${attachmentLabel(resolveAttachmentNeed(m.kind, m.attachmentNeed))}`
                        : ""}
                    </div>
                    {m.description && <p className="text-sm text-slate-600 mt-1">{m.description}</p>}
                  </div>
                  <StatusPill tone={milestoneTone(m.status)}>{milestoneLabel(m.status)}</StatusPill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.status !== "done" && (
                    <button type="button" disabled={Boolean(busy)} onClick={() => setStatus(m, "done")} className="rounded-full bg-black text-white px-3 py-1 text-[11px] font-semibold disabled:opacity-50">
                      Mark done
                    </button>
                  )}
                  {m.status !== "current" && m.status !== "done" && (
                    <button type="button" disabled={Boolean(busy)} onClick={() => setStatus(m, "current")} className="rounded-full border border-black/15 px-3 py-1 text-[11px] font-semibold disabled:opacity-50">
                      Make current
                    </button>
                  )}
                  {m.status !== "blocked" && (
                    <button type="button" disabled={Boolean(busy)} onClick={() => setStatus(m, "blocked")} className="rounded-full border border-black/15 px-3 py-1 text-[11px] font-semibold disabled:opacity-50">
                      Blocked
                    </button>
                  )}
                  {m.status === "blocked" && (
                    <button type="button" disabled={Boolean(busy)} onClick={() => setStatus(m, "current")} className="rounded-full border border-black/15 px-3 py-1 text-[11px] font-semibold disabled:opacity-50">
                      Unblock
                    </button>
                  )}
                  <button type="button" onClick={() => setEditingId(m.id)} className="rounded-full border border-black/15 px-3 py-1 text-[11px] font-semibold">
                    Edit
                  </button>
                  <button type="button" disabled={Boolean(busy)} onClick={() => remove(m)} className="rounded-full border border-black/15 px-3 py-1 text-[11px] font-semibold text-red-800 disabled:opacity-50">
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}

function AttachmentNeedToggles({
  value,
  onChange,
}: {
  value: AttachmentNeed;
  onChange: (next: AttachmentNeed) => void;
}) {
  function toggle(next: AttachmentNeed) {
    onChange(value === next ? "none" : next);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Attachment</legend>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={value === "recommended"} onChange={() => toggle("recommended")} />
        Recommended attachment
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={value === "required"} onChange={() => toggle("required")} />
        Required attachment
      </label>
    </fieldset>
  );
}

function EditRow({
  milestone,
  disabled,
  onCancel,
  onSave,
}: {
  milestone: Milestone;
  disabled: boolean;
  onCancel: () => void;
  onSave: (patch: {
    title: string;
    date: string;
    description: string;
    kind: MilestoneKind;
    requiresAction: boolean;
    attachmentNeed: AttachmentNeed;
  }) => void;
}) {
  const [title, setTitle] = useState(milestone.title);
  const [date, setDate] = useState(milestone.date);
  const [description, setDescription] = useState(milestone.description ?? "");
  const [kind, setKind] = useState<MilestoneKind>(milestone.kind ?? "custom");
  const [requiresAction, setRequiresAction] = useState(Boolean(milestone.requiresAction));
  const [attachmentNeed, setAttachmentNeed] = useState<AttachmentNeed>(
    resolveAttachmentNeed(milestone.kind, milestone.attachmentNeed),
  );

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ title, date, description, kind, requiresAction, attachmentNeed });
      }}
    >
      <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 bg-white border border-black/15 text-sm" />
      <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-black/15 text-sm" />
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <span className="text-xs text-slate-500 w-16">Type</span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as MilestoneKind)}
          className="flex-1 px-3 py-2 bg-white border border-black/15 text-sm"
        >
          <option value="custom">Custom</option>
          <option value="quotation">Quotation</option>
          <option value="po">PO</option>
          <option value="invoice">Invoice</option>
          <option value="consultation">Consultation</option>
          <option value="demo">Demo</option>
          <option value="buyoff">Buy-off</option>
          <option value="delivery">Delivery</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={requiresAction} onChange={(e) => setRequiresAction(e.target.checked)} />
        Client action needed
      </label>
      <AttachmentNeedToggles value={attachmentNeed} onChange={setAttachmentNeed} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 bg-white border border-black/15 text-sm" />
      <div className="flex gap-2">
        <button type="submit" disabled={disabled} className="rounded-full bg-black text-white px-4 py-1.5 text-xs font-semibold disabled:opacity-50">
          Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-semibold">
          Cancel
        </button>
      </div>
    </form>
  );
}
