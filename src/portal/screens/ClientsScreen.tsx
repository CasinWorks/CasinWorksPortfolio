import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import { createClient, fetchAllClients } from "../api";
import type { Client } from "../types";
import { StaggerItem, StaggerList } from "../motion";

export function ClientsScreen() {
  usePageMeta({
    title: `Clients — Portal | ${SITE.name}`,
    path: "/portal/admin/clients",
    noIndex: true,
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function reload() {
    setClients(await fetchAllClients());
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : "Could not load clients."));
  }, []);

  return (
    <div className="space-y-12">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Admin</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight">
          Clients.
        </h1>
        <p className="mt-3 text-slate-600 max-w-xl">
          Add the company first, or convert a registered account from{" "}
          <Link to="/portal/admin/users" className="underline underline-offset-2">
            Users
          </Link>
          . Then open the client and create a project.
        </p>
        {msg && <p className="mt-4 text-sm bg-black text-white px-3 py-2">{msg}</p>}
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      </div>

      <AddClientForm
        onCreated={async (name) => {
          await reload();
          setMsg(`${name} added.`);
        }}
      />

      <section>
        <h2 className="font-serif text-2xl font-semibold">Directory</h2>
        {clients.length === 0 && <p className="mt-4 py-6 text-slate-500 border-y border-black/10 max-w-3xl">No clients yet. Add one above.</p>}
        {clients.length > 0 && (
        <StaggerList className="mt-4 divide-y divide-black/10 border-y border-black/10 max-w-3xl">
          {clients.map((c) => (
            <StaggerItem key={c.id}>
              <Link to={`/portal/admin/clients/${c.id}`} className="py-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2 sm:gap-3 hover:bg-[var(--page-panel)]/80 min-h-12">
                <div>
                  <div className="font-semibold">{c.company || c.contactName}</div>
                  <div className="text-xs text-slate-500">
                    {c.contactName}
                    {c.email ? ` · ${c.email}` : ""}
                  </div>
                </div>
                <span className="text-xs font-semibold">Open →</span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
        )}
      </section>
    </div>
  );
}

function AddClientForm({ onCreated }: { onCreated: (name: string) => Promise<void> }) {
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createClient({ company, contactName, email, phone, address });
      const name = company.trim() || contactName.trim();
      setCompany("");
      setContactName("");
      setEmail("");
      setPhone("");
      setAddress("");
      await onCreated(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add client.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="font-serif text-2xl font-semibold">New client</h2>
      <form onSubmit={onSubmit} className="mt-4 grid sm:grid-cols-2 gap-3 max-w-2xl">
        <input required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <input required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact person" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="sm:col-span-2 px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        {error && <p className="sm:col-span-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={saving} className="rounded-full bg-black text-white text-sm font-semibold py-2.5 disabled:opacity-50">
          Add client
        </button>
      </form>
    </section>
  );
}
