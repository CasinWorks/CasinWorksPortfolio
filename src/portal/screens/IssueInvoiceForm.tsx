import { type FormEvent, useEffect, useState } from "react";
import { issueInvoice } from "../api";
import type { Project } from "../types";

export function IssueInvoiceForm({
  projects,
  issuer,
  onCreated,
  lockedProjectId,
  compact,
}: {
  projects: Project[];
  issuer: string;
  onCreated: () => Promise<void>;
  lockedProjectId?: string;
  compact?: boolean;
}) {
  const [projectId, setProjectId] = useState(lockedProjectId ?? "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (lockedProjectId) setProjectId(lockedProjectId);
  }, [lockedProjectId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await issueInvoice({
        projectId,
        title,
        amount: amount || undefined,
        status: "awaiting_payment",
        uploadedBy: issuer,
        date: new Date().toISOString().slice(0, 10),
        paymentUrl: paymentUrl || undefined,
      });
      setTitle("");
      setAmount("");
      setPaymentUrl("");
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      {!compact && <h2 className="font-serif text-2xl font-semibold">Issue invoice</h2>}
      <form onSubmit={onSubmit} className={`grid sm:grid-cols-2 gap-3 ${compact ? "" : "mt-4 max-w-2xl"}`}>
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
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Invoice title" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <input value={paymentUrl} onChange={(e) => setPaymentUrl(e.target.value)} placeholder="External pay URL (opens new tab)" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        {error && <p className="sm:col-span-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={saving || !projectId} className="rounded-full bg-black text-white text-sm font-semibold sm:col-span-2 py-2.5 disabled:opacity-50">
          {saving ? "Issuing…" : "Issue invoice"}
        </button>
      </form>
    </section>
  );
}
