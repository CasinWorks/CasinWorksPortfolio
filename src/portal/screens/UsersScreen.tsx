import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import { convertUserToClient, fetchAllClients, fetchAllPortalUsers } from "../api";
import type { Client, PortalUser } from "../types";

export function UsersScreen() {
  usePageMeta({
    title: `Users — Portal | ${SITE.name}`,
    path: "/portal/admin/users",
    noIndex: true,
  });
  const navigate = useNavigate();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function reload() {
    const [list, directory] = await Promise.all([fetchAllPortalUsers(), fetchAllClients()]);
    setUsers(list);
    setClients(directory);
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : "Could not load users."));
  }, []);

  const byEmail = new Map<string, Client>(clients.map((c) => [c.email.toLowerCase(), c]));

  async function convert(user: PortalUser) {
    setBusy(user.uid);
    setError("");
    try {
      const id = await convertUserToClient(user);
      await reload();
      navigate(`/portal/admin/clients/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this account as a client.");
    } finally {
      setBusy("");
    }
  }

  const accounts = users.filter((u) => u.role !== "admin");

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Admin</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight">Registered accounts</h1>
      <p className="mt-3 text-slate-600 max-w-xl">
        People who created a portal login. Convert one when they become your client — that adds them to{" "}
        <Link to="/portal/admin/clients" className="underline underline-offset-2">
          Clients
        </Link>{" "}
        so you can start a project.
      </p>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <section className="mt-10 divide-y divide-black/10 border-y border-black/10 max-w-3xl">
        {accounts.length === 0 && <p className="py-6 text-slate-500">No registrations yet.</p>}
        {accounts.map((u) => {
          const client = byEmail.get(u.email.toLowerCase());
          return (
            <div key={u.uid} className="py-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{u.displayName || u.email}</div>
                <div className="text-sm text-slate-700 mt-0.5">{u.company || "Company not set"}</div>
                <div className="text-xs text-slate-500 mt-0.5 break-words">
                  {u.email}
                  {` · ${u.role === "subcontractor" ? "Subcontractor" : "Client account"}`}
                </div>
              </div>
              {client ? (
                <Link
                  to={`/portal/admin/clients/${client.id}`}
                  className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-semibold"
                >
                  Already a client →
                </Link>
              ) : u.role === "client" ? (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void convert(u)}
                  className="rounded-full bg-black text-white px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {busy === u.uid ? "Adding…" : "Add as client"}
                </button>
              ) : (
                <span className="text-xs text-slate-400">Not a client account</span>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
