import { type FormEvent, useEffect, useState } from "react";
import { issueQuotation, nextQuoteNumber, fetchClient } from "../api";
import {
  applyMilestonePercents,
  buildQuotation,
  defaultMilestones,
  defaultScope,
  formatPeso,
  newId,
  scopeTotal,
} from "../quote";
import type { Project, QuoteBillTo, QuoteMilestone, QuoteScopeItem } from "../types";

const emptyBill: QuoteBillTo = { company: "", contact: "", address: "", email: "", phone: "" };

export function IssueQuotationForm({
  projects,
  issuer,
  onCreated,
  lockedProjectId,
  compact,
}: {
  projects: Project[];
  issuer: string;
  onCreated: (issued?: { fileUrl: string; fileName: string; quoteNumber: string }) => Promise<void>;
  lockedProjectId?: string;
  compact?: boolean;
}) {
  const [projectId, setProjectId] = useState(lockedProjectId ?? "");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [validityDays, setValidityDays] = useState("30");
  const [billTo, setBillTo] = useState<QuoteBillTo>(emptyBill);
  const [scope, setScope] = useState<QuoteScopeItem[]>([]);
  const [milestones, setMilestones] = useState<QuoteMilestone[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const total = scopeTotal(scope);

  useEffect(() => {
    if (lockedProjectId) setProjectId(lockedProjectId);
  }, [lockedProjectId]);

  useEffect(() => {
    nextQuoteNumber().then(setQuoteNumber).catch(() => setQuoteNumber("Q-0001"));
  }, []);

  useEffect(() => {
    if (!project) return;
    const nextScope = defaultScope(project);
    setBillTo({
      company: project.clientName || "",
      contact: "",
      address: "",
      email: project.clientEmail || "",
      phone: "",
    });
    setScope(nextScope);
    setMilestones(defaultMilestones(scopeTotal(nextScope)));
    if (project.crmClientId) {
      fetchClient(project.crmClientId).then((c) => {
        if (!c) return;
        setBillTo({
          company: c.company || project.clientName,
          contact: c.contactName,
          address: c.address,
          email: c.email || project.clientEmail,
          phone: c.phone,
        });
      }).catch(() => undefined);
    }
  }, [projectId]);

  function patchScope(id: string, patch: Partial<QuoteScopeItem>) {
    setScope((rows) => {
      const next = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
      setMilestones((ms) => applyMilestonePercents(ms, scopeTotal(next)));
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!project) return;
    setError("");
    setSaving(true);
    try {
      const quote = buildQuotation({
        quoteNumber,
        validityDays: Number(validityDays) || 30,
        billTo,
        scope,
        milestones,
      });
      const issued = await issueQuotation(project.id, quote, issuer);
      if (!lockedProjectId) {
        setProjectId("");
        setBillTo(emptyBill);
        setScope([]);
        setMilestones([]);
      }
      const n = await nextQuoteNumber();
      setQuoteNumber(n);
      await onCreated(issued);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue quotation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      {!compact && <h2 className="font-serif text-2xl font-semibold">Issue quotation</h2>}
      {!compact && (
      <p className="mt-1 text-sm text-slate-500 max-w-2xl">
        Generates a PDF in your Q-0001 format and attaches it to the project. The client sees it when they sign in. No payment on this document.
      </p>
      )}
      <form onSubmit={onSubmit} className={`space-y-4 max-w-3xl ${compact ? "" : "mt-4"}`}>
        <div className="grid sm:grid-cols-3 gap-3">
          {!lockedProjectId && (
          <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} className="px-3.5 py-2.5 bg-white border border-black/15 text-sm sm:col-span-1">
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          )}
          <input required value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)} placeholder="Q-0001" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
          <input required value={validityDays} onChange={(e) => setValidityDays(e.target.value)} placeholder="Validity (days)" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bill to</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input required value={billTo.company} onChange={(e) => setBillTo({ ...billTo, company: e.target.value })} placeholder="Company" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
          <input value={billTo.contact} onChange={(e) => setBillTo({ ...billTo, contact: e.target.value })} placeholder="Contact person" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
          <input value={billTo.address} onChange={(e) => setBillTo({ ...billTo, address: e.target.value })} placeholder="Address" className="sm:col-span-2 px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
          <input required type="email" value={billTo.email} onChange={(e) => setBillTo({ ...billTo, email: e.target.value })} placeholder="Email" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
          <input value={billTo.phone} onChange={(e) => setBillTo({ ...billTo, phone: e.target.value })} placeholder="Phone" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Scope of work</p>
          <button
            type="button"
            onClick={() => setScope((rows) => [...rows, { id: newId(), description: "", details: "", amount: 0 }])}
            className="text-xs font-semibold underline underline-offset-4"
          >
            Add line
          </button>
        </div>
        {scope.map((row) => (
          <div key={row.id} className="grid sm:grid-cols-12 gap-2">
            <input value={row.description} onChange={(e) => patchScope(row.id, { description: e.target.value })} placeholder="Description" className="sm:col-span-3 px-3 py-2 bg-white border border-black/15 text-sm" />
            <input value={row.details} onChange={(e) => patchScope(row.id, { details: e.target.value })} placeholder="Details" className="sm:col-span-6 px-3 py-2 bg-white border border-black/15 text-sm" />
            <input
              type="number"
              min={0}
              step="0.01"
              value={row.amount || ""}
              onChange={(e) => patchScope(row.id, { amount: Number(e.target.value) || 0 })}
              placeholder="Amount"
              className="sm:col-span-3 px-3 py-2 bg-white border border-black/15 text-sm"
            />
          </div>
        ))}
        <p className="text-sm text-right">
          Total contract value <span className="font-semibold">{formatPeso(total)}</span>
        </p>

        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Payment schedule</p>
        {milestones.map((row) => (
          <div key={row.id} className="grid sm:grid-cols-12 gap-2">
            <input
              value={row.title}
              onChange={(e) => setMilestones((ms) => ms.map((m) => (m.id === row.id ? { ...m, title: e.target.value } : m)))}
              placeholder="Milestone"
              className="sm:col-span-7 px-3 py-2 bg-white border border-black/15 text-sm"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={row.percent}
              onChange={(e) => {
                const percent = Number(e.target.value) || 0;
                setMilestones((ms) => applyMilestonePercents(ms.map((m) => (m.id === row.id ? { ...m, percent } : m)), total));
              }}
              placeholder="%"
              className="sm:col-span-2 px-3 py-2 bg-white border border-black/15 text-sm"
            />
            <input readOnly value={formatPeso(row.amount)} className="sm:col-span-3 px-3 py-2 bg-[var(--page-panel)] border border-black/10 text-sm" />
          </div>
        ))}

        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={saving || !projectId} className="rounded-full bg-black text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
          {saving ? "Generating PDF…" : "Generate PDF"}
        </button>
      </form>
    </section>
  );
}
