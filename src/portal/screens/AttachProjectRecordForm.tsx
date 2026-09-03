import { type FormEvent, useEffect, useRef, useState } from "react";
import { ATTACHABLE_TYPES, attachProjectRecord, docTypeName } from "../api";
import { CONSULTING_HOURLY_RATE, consultingDetails, consultingFee, formatPeso } from "../quote";
import type { DocumentType, Project } from "../types";

const FILE_ACCEPT =
  "application/pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation";

export function AttachProjectRecordForm({
  projects,
  lockedProjectId,
  lockedType,
  uploadedBy,
  onCreated,
}: {
  projects: Project[];
  lockedProjectId?: string;
  lockedType?: DocumentType;
  uploadedBy: string;
  onCreated: (title: string) => Promise<void>;
}) {
  const [projectId, setProjectId] = useState(lockedProjectId ?? "");
  const [type, setType] = useState<DocumentType>(lockedType ?? "consultation");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendees, setAttendees] = useState("");
  const [notes, setNotes] = useState("");
  const [hours, setHours] = useState("1");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lockedProjectId) setProjectId(lockedProjectId);
    if (lockedType) setType(lockedType);
  }, [lockedProjectId, lockedType]);

  const needsMeeting = type === "consultation" || type === "demo";
  const consultHours = type === "consultation" ? Number(hours) || 0 : 0;
  const consultFee = type === "consultation" ? consultingFee(consultHours) : 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const billingNote =
        type === "consultation" && consultHours > 0
          ? consultingDetails(consultHours)
          : "";
      await attachProjectRecord({
        projectId,
        type,
        title: title || `${docTypeName(type)} — ${date}`,
        notes: [billingNote, notes.trim()].filter(Boolean).join("\n\n"),
        date,
        attendees: needsMeeting ? attendees : undefined,
        file,
        uploadedBy,
        amount: type === "consultation" && consultFee ? formatPeso(consultFee) : undefined,
        numericAmount: type === "consultation" && consultFee ? consultFee : undefined,
      });
      setTitle("");
      setNotes("");
      setAttendees("");
      setHours("1");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await onCreated(title || docTypeName(type));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attach record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      {!lockedProjectId && <h2 className="font-serif text-2xl font-semibold">Attach project record</h2>}
      {!lockedProjectId && (
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          Consultation notes, demos, proposals, technical packs, and other project files. The client can open these on the project.
        </p>
      )}
      <form onSubmit={onSubmit} className={`space-y-3 max-w-2xl ${lockedProjectId ? "" : "mt-4"}`}>
        <div className="grid sm:grid-cols-2 gap-3">
          {!lockedProjectId && (
            <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} className="px-3.5 py-2.5 bg-white border border-black/15 text-sm">
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {!lockedType && (
          <select value={type} onChange={(e) => setType(e.target.value as DocumentType)} className="px-3.5 py-2.5 bg-white border border-black/15 text-sm">
            {ATTACHABLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {docTypeName(t)}
              </option>
            ))}
          </select>
          )}
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        </div>
        {needsMeeting && (
          <input
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="Attendees (optional)"
            className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm"
          />
        )}
        {type === "consultation" && (
          <div className="grid sm:grid-cols-2 gap-3 items-center">
            <input
              type="number"
              min={0.5}
              step="0.5"
              required
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Hours"
              className="px-3.5 py-2.5 bg-white border border-black/15 text-sm"
            />
            <p className="text-sm text-slate-600">
              {consultHours > 0
                ? `${consultingDetails(consultHours)} = ${formatPeso(consultFee)}`
                : `₱${CONSULTING_HOURLY_RATE.toLocaleString("en-US")} per hour`}
            </p>
          </div>
        )}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            type === "consultation"
              ? "Discussion notes, decisions, next steps"
              : type === "demo"
                ? "What was shown, feedback, follow-up"
                : type === "technical"
                  ? "What this pack covers (architecture, specs, drawings)"
                  : "Notes (optional)"
          }
          rows={4}
          className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border border-dashed border-black/20 py-8 text-sm text-slate-600 hover:border-black"
        >
          {file ? file.name : "Attach a file (PDF, image, Office, zip) — optional"}
        </button>
        <input ref={inputRef} type="file" accept={FILE_ACCEPT} className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={saving || !projectId} className="rounded-full bg-black text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
          {saving ? "Saving…" : "Add to project"}
        </button>
      </form>
    </section>
  );
}
