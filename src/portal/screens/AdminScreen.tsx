import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import { createGig, fetchAllProjects, fetchDocuments, statusLabel, updateDocumentStatus } from "../api";
import { usePortalAuth } from "../auth";
import type { ProjectDocument } from "../types";

export function AdminScreen() {
  usePageMeta({
    title: `Admin — Portal | ${SITE.name}`,
    path: "/portal/admin",
    noIndex: true,
  });
  const { profile } = usePortalAuth();
  const [pending, setPending] = useState<ProjectDocument[]>([]);
  const [msg, setMsg] = useState("");

  async function reload() {
    const list = await fetchAllProjects();
    const docs = (await Promise.all(list.map((p) => fetchDocuments(p.id)))).flat();
    setPending(docs.filter((d) => d.status === "pending_review"));
  }

  useEffect(() => {
    reload().catch(() => undefined);
  }, []);

  return (
    <div className="space-y-12 max-w-3xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Admin</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight">
          Inbox, <span className="italic text-slate-400">not a toolbox.</span>
        </h1>
        <p className="mt-3 text-slate-600">
          Day-to-day work lives on the project. Open a project from{" "}
          <Link to="/portal/dashboard" className="underline underline-offset-2">
            Projects
          </Link>
          , see the current milestone, and issue the quotation or log the hole from there. Add companies under{" "}
          <Link to="/portal/admin/clients" className="underline underline-offset-2">
            Clients
          </Link>
          . Convert a registration from{" "}
          <Link to="/portal/admin/users" className="underline underline-offset-2">
            Users
          </Link>
          .
        </p>
        {msg && <p className="mt-4 text-sm bg-black text-white px-3 py-2">{msg}</p>}
      </div>

      <section>
        <h2 className="font-serif text-2xl font-semibold">Waiting on you</h2>
        <p className="mt-1 text-sm text-slate-500">Purchase orders and remittances the client uploaded.</p>
        <div className="mt-4 divide-y divide-black/10 border-y border-black/10">
          {pending.length === 0 && <p className="py-6 text-slate-500">Nothing waiting.</p>}
          {pending.map((d) => (
            <div key={d.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{d.title}</div>
                <div className="text-xs text-slate-500">
                  {d.type} · {statusLabel(d.status)} · {d.date}
                </div>
              </div>
              <div className="flex gap-2">
                {d.fileUrl && (
                  <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                    File
                  </a>
                )}
                <Link to={`/portal/projects/${d.projectId}`} className="text-xs underline">
                  Project
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await updateDocumentStatus(d.id, "confirmed");
                    await reload();
                    setMsg("Marked confirmed.");
                  }}
                  className="rounded-full bg-black text-white px-4 py-1.5 text-xs font-semibold"
                >
                  Confirm
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <details>
        <summary className="cursor-pointer font-serif text-2xl font-semibold">Post a gig</summary>
        <div className="mt-4">
          <PostGigForm
            postedBy={profile?.displayName ?? SITE.brand}
            onCreated={() => setMsg("Gig posted.")}
          />
        </div>
      </details>
    </div>
  );
}

function PostGigForm({ postedBy, onCreated }: { postedBy: string; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [location, setLocation] = useState("Remote");
  const [rate, setRate] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await createGig({
      title,
      description,
      status: "open",
      postedBy,
      discipline: discipline || undefined,
      location,
      workType: location.toLowerCase().includes("remote") ? "Remote" : "Hybrid",
      rate: rate || undefined,
    });
    setTitle("");
    setDescription("");
    setDiscipline("");
    setRate("");
    onCreated();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-2xl">
      <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
      <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={4} className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
      <div className="grid sm:grid-cols-3 gap-3">
        <input value={discipline} onChange={(e) => setDiscipline(e.target.value)} placeholder="Discipline" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
        <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Rate" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
      </div>
      <button type="submit" className="rounded-full bg-black text-white px-6 py-2.5 text-sm font-semibold">
        Publish
      </button>
    </form>
  );
}
