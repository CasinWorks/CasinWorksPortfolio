import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import { createEngagement, fetchClient, fetchProjectsForCrmClient, updateClient } from "../api";
import type { Client, Project } from "../types";
import { projectLabel } from "./ui";

export function ClientDetailScreen() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  usePageMeta({
    title: client ? `${client.company} — Portal | ${SITE.name}` : `Client — Portal | ${SITE.name}`,
    path: `/portal/admin/clients/${clientId ?? ""}`,
    noIndex: true,
  });

  async function reload() {
    if (!clientId) return;
    const [c, list] = await Promise.all([fetchClient(clientId), fetchProjectsForCrmClient(clientId)]);
    setClient(c);
    setProjects(list);
    if (!c) setError("Client not found.");
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : "Could not load client."));
  }, [clientId]);

  if (error && !client) return <p className="text-red-700">{error}</p>;
  if (!client) return <p className="text-slate-500">Loading client…</p>;

  return (
    <div className="space-y-12">
      <div>
        <Link to="/portal/admin/clients" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          ← Clients
        </Link>
        <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight">{client.company}</h1>
        <p className="mt-2 text-slate-600">
          {client.contactName} · {client.email}
          {client.phone ? ` · ${client.phone}` : ""}
        </p>
        {client.address && <p className="mt-1 text-sm text-slate-500">{client.address}</p>}
        {msg && <p className="mt-4 text-sm bg-black text-white px-3 py-2">{msg}</p>}
      </div>

      <CreateProjectForClient
        client={client}
        onCreated={async (projectId, name) => {
          setMsg(`${name} started on Consultation.`);
          navigate(`/portal/projects/${projectId}`);
        }}
      />

      <section>
        <h2 className="font-serif text-2xl font-semibold">Projects</h2>
        <div className="mt-4 divide-y divide-black/10 border-y border-black/10 max-w-3xl">
          {projects.length === 0 && <p className="py-6 text-slate-500">No projects yet. Create one above.</p>}
          {projects.map((p) => (
            <Link key={p.id} to={`/portal/projects/${p.id}`} className="py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-[var(--page-panel)]/80">
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-slate-500">
                  {projectLabel(p.status)} · {p.progressPercentage || 0}% complete
                </div>
              </div>
              <span className="text-xs font-semibold">Open project →</span>
            </Link>
          ))}
        </div>
      </section>

      <EditClient
        client={client}
        onSaved={async () => {
          await reload();
          setMsg("Client updated.");
        }}
      />
    </div>
  );
}

function CreateProjectForClient({
  client,
  onCreated,
}: {
  client: Client;
  onCreated: (projectId: string, name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const projectId = await createEngagement({ client, name, budget });
      await onCreated(projectId, name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="font-serif text-2xl font-semibold">New project</h2>
      <p className="mt-1 text-sm text-slate-500 max-w-2xl">
        Starts on Consultation. Finish that hole, then Demo, Buy-off, Send quotation, PO, and Delivery. The client sees the same course when they sign in with {client.email}.
      </p>
      <form onSubmit={onSubmit} className="mt-4 grid sm:grid-cols-2 gap-3 max-w-2xl">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget (optional)" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        {error && <p className="sm:col-span-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={saving} className="rounded-full bg-black text-white text-sm font-semibold py-2.5 disabled:opacity-50">
          {saving ? "Creating…" : "Create project"}
        </button>
      </form>
    </section>
  );
}

function EditClient({ client, onSaved }: { client: Client; onSaved: () => Promise<void> }) {
  const [company, setCompany] = useState(client.company);
  const [contactName, setContactName] = useState(client.contactName);
  const [email, setEmail] = useState(client.email);
  const [phone, setPhone] = useState(client.phone);
  const [address, setAddress] = useState(client.address);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCompany(client.company);
    setContactName(client.contactName);
    setEmail(client.email);
    setPhone(client.phone);
    setAddress(client.address);
  }, [client]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateClient(client.id, { company, contactName, email, phone, address });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="font-serif text-2xl font-semibold">Client details</h2>
      <form onSubmit={onSubmit} className="mt-4 grid sm:grid-cols-2 gap-3 max-w-2xl">
        <input required value={company} onChange={(e) => setCompany(e.target.value)} className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <input required value={contactName} onChange={(e) => setContactName(e.target.value)} className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="sm:col-span-2 px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        {error && <p className="sm:col-span-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={saving} className="rounded-full border border-black/15 text-sm font-semibold py-2.5 disabled:opacity-50">
          Save details
        </button>
      </form>
    </section>
  );
}
