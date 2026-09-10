import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import {
  applicationStatusLabel,
  createGig,
  deleteGig,
  fetchAllProjects,
  fetchDocuments,
  listenAllApplications,
  listenAllGigs,
  listenConsultations,
  listenThreads,
  setConsultationStatus,
  statusLabel,
  threadHasUnread,
  updateApplicationStatus,
  updateDocumentStatus,
  updateGig,
} from "../api";
import { usePortalAuth } from "../auth";
import { formatConsultWhen } from "../booking";
import type { ConsultationBooking, Gig, GigApplication, MessageThread, ProjectDocument, WorkType } from "../types";

export function AdminScreen() {
  usePageMeta({
    title: `Admin — Portal | ${SITE.name}`,
    path: "/portal/admin",
    noIndex: true,
  });
  const { profile, firebaseUser } = usePortalAuth();
  const [pending, setPending] = useState<ProjectDocument[]>([]);
  const [apps, setApps] = useState<GigApplication[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [consults, setConsults] = useState<ConsultationBooking[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState("");
  const [editingGig, setEditingGig] = useState<Gig | null>(null);
  const [posting, setPosting] = useState(false);
  const [appNotes, setAppNotes] = useState<Record<string, string>>({});

  async function reload() {
    const list = await fetchAllProjects();
    const docs = (await Promise.all(list.map((p) => fetchDocuments(p.id)))).flat();
    setPending(docs.filter((d) => d.status === "pending_review"));
  }

  useEffect(() => {
    reload().catch(() => undefined);
  }, []);

  useEffect(() => {
    return listenAllGigs(setGigs, (message) => setMsg(message));
  }, []);

  useEffect(() => {
    return listenAllApplications(setApps, (message) => setMsg(message));
  }, []);

  useEffect(() => {
    if (!profile) return;
    return listenConsultations(
      { role: profile.role, uid: profile.uid, email: profile.email },
      setConsults,
    );
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    return listenThreads({ role: profile.role, uid: profile.uid, email: profile.email }, setThreads);
  }, [profile]);

  const unanswered = threads.filter((t) => threadHasUnread(t, "admin"));

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
        <h2 className="font-serif text-2xl font-semibold">Client messages</h2>
        <p className="mt-1 text-sm text-slate-500">
          Clients who wrote and are still waiting on a reply. Everything else is in{" "}
          <Link to="/portal/messages" className="underline underline-offset-2">
            Messages
          </Link>
          .
        </p>
        <div className="mt-4 divide-y divide-black/10 border-y border-black/10">
          {unanswered.length === 0 && <p className="py-6 text-slate-500">Nobody is waiting on a reply.</p>}
          {unanswered.map((t) => (
            <Link
              key={t.id}
              to={`/portal/messages/${t.id}`}
              className="py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-[var(--page-panel)]/80"
            >
              <div className="min-w-0">
                <div className="font-semibold">{t.clientName || t.clientEmail}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {t.clientEmail}
                  {t.projectName ? ` · ${t.projectName}` : ""}
                </div>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{t.lastMessagePreview}</p>
              </div>
              <span className="text-xs font-semibold shrink-0">Reply →</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl font-semibold">Consultation requests</h2>
        <p className="mt-1 text-sm text-slate-500">
          Clients book from{" "}
          <Link to="/portal/book" className="underline underline-offset-2">
            Calendar
          </Link>
          . Confirm creates a Google Meet invite on your calendar.
        </p>
        <div className="mt-4 divide-y divide-black/10 border-y border-black/10">
          {consults.filter((c) => c.status === "requested").length === 0 && (
            <p className="py-6 text-slate-500">No open requests.</p>
          )}
          {consults
            .filter((c) => c.status === "requested")
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
            .map((c) => (
              <div key={c.id} className="py-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{formatConsultWhen(c.startsAt)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {c.clientName}
                    {c.company ? ` · ${c.company}` : ""} · {c.hours} hr{c.hours === 1 ? "" : "s"}
                  </div>
                  {c.notes && <p className="mt-1 text-sm text-slate-600">{c.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={async () => {
                      setBusyId(c.id);
                      setMsg("");
                      try {
                        const idToken = await firebaseUser?.getIdToken();
                        if (!idToken) throw new Error("Sign in again.");
                        await setConsultationStatus(c.id, "confirmed", idToken);
                        setMsg("Consultation confirmed — Meet invite sent.");
                      } catch (e) {
                        setMsg(e instanceof Error ? e.message : "Could not confirm.");
                      } finally {
                        setBusyId("");
                      }
                    }}
                    className="rounded-full bg-black text-white px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    {busyId === c.id ? "…" : "Confirm + Meet"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={async () => {
                      setBusyId(c.id);
                      setMsg("");
                      try {
                        const idToken = await firebaseUser?.getIdToken();
                        if (!idToken) throw new Error("Sign in again.");
                        await setConsultationStatus(c.id, "cancelled", idToken);
                        setMsg("Consultation cancelled.");
                      } catch (e) {
                        setMsg(e instanceof Error ? e.message : "Could not cancel.");
                      } finally {
                        setBusyId("");
                      }
                    }}
                    className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
        </div>
      </section>

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

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Gig board</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold">Postings.</h2>
        <p className="mt-1 text-sm text-slate-500">Edit or remove a role. Closed postings leave the public board.</p>
        <div className="mt-4 divide-y divide-black/10 border-y border-black/10">
          {gigs.length === 0 && <p className="py-6 text-slate-500">No postings yet.</p>}
          {gigs.map((gig) => (
            <div key={gig.id} className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{gig.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {gig.status === "open" ? "Open" : "Closed"}
                    {gig.discipline ? ` · ${gig.discipline}` : ""}
                    {gig.location ? ` · ${gig.location}` : ""}
                    {gig.rate ? ` · ${gig.rate}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setPosting(false);
                      setEditingGig(gig);
                    }}
                    className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busyId === gig.id}
                    onClick={async () => {
                      setBusyId(gig.id);
                      try {
                        await updateGig(gig.id, { status: gig.status === "open" ? "closed" : "open" });
                        await reload();
                        setMsg(gig.status === "open" ? "Posting closed." : "Posting reopened.");
                      } catch (e) {
                        setMsg(e instanceof Error ? e.message : "Could not update posting.");
                      } finally {
                        setBusyId("");
                      }
                    }}
                    className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    {gig.status === "open" ? "Close" : "Reopen"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === gig.id}
                    onClick={async () => {
                      if (!window.confirm(`Delete “${gig.title}”? Applications for this posting are removed too.`)) return;
                      setBusyId(gig.id);
                      try {
                        await deleteGig(gig.id);
                        if (editingGig?.id === gig.id) setEditingGig(null);
                        await reload();
                        setMsg("Posting deleted.");
                      } catch (e) {
                        setMsg(e instanceof Error ? e.message : "Could not delete posting.");
                      } finally {
                        setBusyId("");
                      }
                    }}
                    className="rounded-full border border-red-200 text-red-800 px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {editingGig?.id === gig.id && (
                <div key={editingGig.id} className="mt-4">
                  <GigForm
                    postedBy={profile?.displayName ?? SITE.brand}
                    gig={editingGig}
                    onCancel={() => setEditingGig(null)}
                    onSaved={async () => {
                      setEditingGig(null);
                      setMsg("Posting updated.");
                      await reload();
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingGig(null);
            setPosting((v) => !v);
          }}
          className="mt-4 rounded-full bg-black text-white px-5 py-2.5 text-sm font-semibold"
        >
          {posting ? "Cancel new posting" : "New posting"}
        </button>
        {posting && (
          <div className="mt-4">
            <GigForm
              postedBy={profile?.displayName ?? SITE.brand}
              onCancel={() => setPosting(false)}
              onSaved={async () => {
                setPosting(false);
                setMsg("Gig posted.");
                await reload();
              }}
            />
          </div>
        )}
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Gig applications</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold">Who applied.</h2>
        <p className="mt-1 text-sm text-slate-500">
          Update status so the applicant sees progress on the gig board. An optional note is shown to them.
        </p>
        <div className="mt-4 divide-y divide-black/10 border-y border-black/10">
          {apps.length === 0 && <p className="py-6 text-slate-500">No applications yet.</p>}
          {apps.map((app) => {
            const gig = gigs.find((g) => g.id === app.gigId);
            const note = appNotes[app.id] ?? app.statusNote ?? "";
            return (
              <div key={app.id} className="py-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{app.applicantName || app.applicantEmail}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {gig?.title || "Gig"} · {applicationStatusLabel(app.status)}
                      {app.applicantEmail ? ` · ${app.applicantEmail}` : ""}
                    </div>
                    {app.statement ? <p className="mt-2 text-sm text-slate-600">{app.statement}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {app.cvUrl ? (
                      <a
                        href={app.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-black text-white px-4 py-1.5 text-xs font-semibold"
                      >
                        CV{app.cvName ? ` · ${app.cvName}` : ""}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">No CV</span>
                    )}
                    {app.portfolioUrl ? (
                      <a
                        href={app.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-semibold"
                      >
                        Portfolio{app.portfolioName ? ` · ${app.portfolioName}` : ""}
                      </a>
                    ) : null}
                  </div>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setAppNotes((cur) => ({ ...cur, [app.id]: e.target.value }))}
                  placeholder="Note for the applicant — next step, timing, why…"
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm focus:outline-none focus:border-black"
                />
                <div className="flex flex-wrap gap-2">
                  {(["pending", "reviewing", "accepted", "rejected"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busyId === app.id}
                      onClick={async () => {
                        setBusyId(app.id);
                        try {
                          await updateApplicationStatus(app.id, status, appNotes[app.id] ?? app.statusNote);
                          await reload();
                          setMsg(`Marked ${applicationStatusLabel(status).toLowerCase()}.`);
                        } catch (e) {
                          setMsg(e instanceof Error ? e.message : "Could not update application.");
                        } finally {
                          setBusyId("");
                        }
                      }}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                        app.status === status
                          ? "bg-black text-white"
                          : "border border-black/15"
                      }`}
                    >
                      {applicationStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function GigForm({
  postedBy,
  gig,
  onSaved,
  onCancel,
}: {
  postedBy: string;
  gig?: Gig;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(gig?.title ?? "");
  const [description, setDescription] = useState(gig?.description ?? "");
  const [discipline, setDiscipline] = useState(gig?.discipline ?? "");
  const [location, setLocation] = useState(gig?.location ?? "Remote");
  const [rate, setRate] = useState(gig?.rate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const workType: WorkType = location.toLowerCase().includes("remote") ? "Remote" : "Hybrid";
      const payload = {
        title: title.trim(),
        description: description.trim(),
        postedBy: gig?.postedBy || postedBy,
        status: gig?.status ?? ("open" as const),
        discipline: discipline.trim() || undefined,
        location: location.trim() || undefined,
        workType,
        rate: rate.trim() || undefined,
      };
      if (gig) await updateGig(gig.id, payload);
      else await createGig(payload);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save posting.");
    } finally {
      setSaving(false);
    }
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
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="rounded-full bg-black text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
          {saving ? "Saving…" : gig ? "Save posting" : "Publish"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-black/15 px-6 py-2.5 text-sm font-semibold">
          Cancel
        </button>
      </div>
    </form>
  );
}
