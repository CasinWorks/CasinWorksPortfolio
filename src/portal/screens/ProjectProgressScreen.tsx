import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, FileText, MessageSquare } from "lucide-react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import { canDeleteProject, deleteProject, ensureThread, fetchDocuments, fetchMilestones, fetchProject, findUserByEmail, PROJECT_DELETE_LOCKED_MESSAGE, threadIdForProject, updateProject } from "../api";
import { attachmentLabel, docsForHole, resolveAttachmentNeed } from "../pipeline";
import { usePortalAuth } from "../auth";
import type { Milestone, Project, ProjectDocument, ProjectStatus } from "../types";
import { CurrentHoleWork } from "./CurrentHoleWork";
import { CourseTemplateBar, MilestoneCourseList } from "./CourseList";
import { FairwayVisual } from "./FairwayVisual";
import { MilestoneManage } from "./MilestoneManage";
import { ProjectRecordsList } from "./ProjectRecordsList";
import { ShareLinkCard } from "./ShareLinkCard";
import { ProgressBar, TimelineDot } from "../motion";
import { StatusPill, projectLabel } from "./ui";

export function ProjectProgressScreen() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { profile } = usePortalAuth();
  const isAdmin = profile?.role === "admin";
  const [view, setView] = useState<"course" | "timeline">("course");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lens, setLens] = useState<"work" | "client">("work");

  usePageMeta({
    title: project ? `${project.name} — Portal | ${SITE.name}` : `Project — Portal | ${SITE.name}`,
    path: `/portal/projects/${projectId ?? ""}`,
    noIndex: true,
  });

  async function reload() {
    if (!projectId) return;
    const [p, m, d] = await Promise.all([
      fetchProject(projectId),
      fetchMilestones(projectId),
      fetchDocuments(projectId),
    ]);
    setProject(p);
    setMilestones(m);
    setDocuments(d);
    if (!p) setError("Project not found.");
    else if (m.length > 0) {
      const cur = m.find((row) => row.status === "current");
      const allDone = m.every((row) => row.status === "done");
      const title = allDone ? "Complete" : cur?.title ?? "";
      const kind = cur?.kind ?? "";
      if (p.currentHoleTitle !== title || p.currentHoleKind !== kind) {
        void updateProject(projectId, { currentHoleTitle: title, currentHoleKind: kind });
        setProject({ ...p, currentHoleTitle: title, currentHoleKind: kind });
      }
    }
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : "Could not load project."));
  }, [projectId]);

  useEffect(() => {
    if (!highlightId || view !== "timeline") return;
    const timer = window.setTimeout(() => {
      document.getElementById(`hole-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [highlightId, view]);

  if (error && !project) return <p className="text-red-700">{error}</p>;
  if (!project) return <p className="text-slate-500">Loading project…</p>;

  const current = milestones.find((m) => m.status === "current");
  const currentIndex = current ? milestones.findIndex((m) => m.id === current.id) : -1;

  const clientFacing = !isAdmin || lens === "client";

  function onSelect(m: Milestone) {
    if (!clientFacing) {
      if (m.status === "current") {
        document.getElementById("current-hole")?.scrollIntoView({ behavior: "smooth", block: "start" });
        setNotice("");
        return;
      }
      setNotice(
        m.status === "done"
          ? `${m.title} is already done.`
          : current
            ? `Finish ${current.title} before ${m.title}.`
            : `${m.title} is not the current hole.`,
      );
      return;
    }
    setView("timeline");
    setHighlightId(m.id);
  }

  return (
    <div>
      <Link to="/portal/dashboard" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        ← Projects
      </Link>

      {isAdmin && (
          <div className="mt-6 inline-flex bg-[var(--page-panel)] p-1 rounded-full border border-black/10 max-w-full">
          {(
            [
              ["work", "Work the hole"],
              ["client", "Client view"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setLens(id);
                setNotice("");
                if (id === "client") setView("course");
              }}
                className={`px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-medium ${
                lens === id ? "bg-black text-white" : "text-slate-500 hover:text-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {isAdmin && lens === "client" && (
        <p className="mt-4 max-w-xl text-sm bg-white border border-black/10 px-3 py-2">
          This is the client’s course — the fairway walks to the current hole. Click a pin to inspect it. Switch back to Work the hole to issue a quotation or mark a milestone done.
        </p>
      )}

      {!clientFacing ? (
        <AdminProjectHeader project={project} current={current} holeNumber={currentIndex + 1} holeCount={milestones.length} />
      ) : (
        <ClientProjectHeader project={project} view={view} />
      )}

      {notice && !clientFacing && <p className="mt-4 text-sm text-slate-600 max-w-2xl">{notice}</p>}

      {!clientFacing && current && (
        <div key={current.id} className="mt-8 max-w-3xl">
          <CurrentHoleWork
            project={project}
            milestone={current}
            milestones={milestones}
            documents={documents}
            issuer={profile?.email ?? "admin"}
            onChanged={reload}
          />
        </div>
      )}

      {!clientFacing && !current && milestones.length > 0 && (
        <p className="mt-8 max-w-2xl text-sm text-slate-600">This course is complete. Open records for the paper trail, or adjust the course below if you need another hole.</p>
      )}

      {!clientFacing && milestones.length === 0 && (
        <p className="mt-8 max-w-2xl text-sm text-slate-600">
          This project has no course yet. Open Save or reuse this course to apply a template, or add holes under Adjust course.
        </p>
      )}

      {clientFacing && (
        <div className="mt-6 flex justify-center">
          <div className="inline-flex bg-[var(--page-panel)] p-1 rounded-full border border-black/10">
            {(
              [
                ["course", "The course"],
                ["timeline", "Where things stand"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`px-3 py-2 sm:py-1 rounded-full text-xs font-medium ${
                  view === id ? "bg-black text-white" : "text-slate-500 hover:text-black"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className={!clientFacing ? "mt-12 max-w-3xl" : ""}>
        {!clientFacing && (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">The course</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold">Milestones</h2>
            <p className="mt-1 text-sm text-slate-600">Drag the grip to reorder. Use the trash icon to delete a hole.</p>
            <CourseTemplateBar projectId={project.id} milestones={milestones} onChanged={reload} />
          </>
        )}

        {clientFacing && view === "course" && (
          <FairwayVisual
            milestones={milestones}
            documents={documents}
            projectId={project.id}
            onSelect={onSelect}
          />
        )}

        {!clientFacing || view === "course" ? (
          <MilestoneCourseList
            projectId={project.id}
            milestones={milestones}
            reorderable={!clientFacing}
            onSelect={onSelect}
            onChanged={reload}
          />
        ) : (
          <div className="mt-8 relative pl-7 max-w-xl">
            <div className="absolute left-[5.5px] top-2 bottom-3 w-px bg-[#DDD6C6]" />
            {milestones.map((m) => (
              <div
                key={m.id}
                id={`hole-${m.id}`}
                className={`relative mb-6 scroll-mt-24 ${highlightId === m.id ? "bg-white border border-black/10 -ml-3 pl-3 pr-3 py-3" : ""}`}
              >
                <TimelineDot
                  status={m.status}
                  className="absolute -left-7 top-1.5 size-3 ring-4 ring-[var(--page-cream)]"
                />
                <div className="text-xs text-slate-500">{m.date}</div>
                <div className="font-semibold mt-0.5">{m.title}</div>
                {attachmentLabel(resolveAttachmentNeed(m.kind, m.attachmentNeed)) && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {attachmentLabel(resolveAttachmentNeed(m.kind, m.attachmentNeed))}
                  </p>
                )}
                {m.description && <p className="text-sm text-slate-500 mt-0.5">{m.description}</p>}
                {docsForHole(m.kind, documents).length > 0 && (
                  <div className="mt-3">
                    <ProjectRecordsList projectId={project.id} documents={docsForHole(m.kind, documents)} />
                  </div>
                )}
                {m.requiresAction && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <StatusPill tone="blocked">Action needed from you</StatusPill>
                    <Link
                      to={`/portal/projects/${project.id}/documents`}
                      className="text-[11.5px] font-medium underline underline-offset-2"
                    >
                      Open records →
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {clientFacing && (
        <section className="mt-10 max-w-xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Your records</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold">Quotations, POs, and files</h2>
              <p className="mt-1 text-sm text-slate-600">Open any attachment on this project. Files are only visible after you sign in.</p>
            </div>
            <Link
              to={`/portal/projects/${project.id}/documents`}
              className="text-xs font-semibold inline-flex items-center gap-1 shrink-0"
            >
              All records <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <ProjectRecordsList projectId={project.id} documents={documents} />
          {documents.some((d) => d.type === "PO" || d.type === "invoice" || d.type === "remittance") && (
            <p className="mt-3 text-xs text-slate-500">
              Upload a purchase order or remittance from{" "}
              <Link to={`/portal/projects/${project.id}/documents`} className="underline underline-offset-2">
                project records
              </Link>
              .
            </p>
          )}
        </section>
      )}

      {!clientFacing && (
      <div className="mt-8 max-w-xl border border-black/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60">
        <div className="flex items-center gap-3">
          <div className="size-8 border border-black/20 flex items-center justify-center font-mono text-xs font-bold">
            <FileText className="size-4" aria-hidden />
          </div>
          <div>
            <div className="text-sm font-semibold">Project records</div>
            <div className="text-xs text-slate-500">Quotes, POs, invoices, consultation notes</div>
          </div>
        </div>
        <Link
          to={`/portal/projects/${project.id}/documents`}
          className="text-xs font-semibold inline-flex items-center gap-1"
        >
          Open <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      )}

      <ProjectThreadCard
        project={project}
        viewerIsAdmin={isAdmin}
        viewerUid={profile?.uid ?? ""}
        onError={setError}
      />

      {isAdmin && !clientFacing && (
        <details className="mt-12 max-w-3xl border-t border-black/10 pt-8">
          <summary className="cursor-pointer text-sm font-semibold">Adjust course</summary>
          <p className="mt-2 text-sm text-slate-500">Load the standard six holes, add extras, or retarget a hole. Day-to-day work stays in the current-hole card.</p>
          <div id="course-admin" className="mt-4">
            <MilestoneManage projectId={project.id} milestones={milestones} onChanged={reload} />
          </div>
        </details>
      )}

      {isAdmin && !clientFacing && (
        <details className="mt-6 max-w-3xl">
          <summary className="cursor-pointer text-sm font-semibold">Project settings</summary>
          <ProjectSettings
            project={project}
            documents={documents}
            milestones={milestones}
            onSaved={reload}
            onDeleted={() => navigate("/portal/dashboard")}
          />
        </details>
      )}
    </div>
  );
}

/**
 * Opens the conversation attached to this project, creating it on first use.
 *
 * The thread id is derived from the project id, so the client and the studio
 * always land in the same one no matter who writes first.
 */
function ProjectThreadCard({
  project,
  viewerIsAdmin,
  viewerUid,
  onError,
}: {
  project: Project;
  viewerIsAdmin: boolean;
  viewerUid: string;
  onError: (message: string) => void;
}) {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);

  async function open() {
    setOpening(true);
    try {
      const id = threadIdForProject(project.id);
      await ensureThread({
        id,
        // An unregistered client has no uid yet; the email keeps the thread
        // reachable for them once they sign up.
        clientUid: viewerIsAdmin ? project.clientId : viewerUid,
        clientEmail: project.clientEmail,
        clientName: project.clientName,
        projectId: project.id,
        projectName: project.name,
        subject: project.name,
        openedBy: viewerIsAdmin ? "admin" : "client",
      });
      navigate(`/portal/messages/${id}`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not open the conversation.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="mt-4 max-w-xl border border-black/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60">
      <div className="flex items-center gap-3">
        <div className="size-8 border border-black/20 flex items-center justify-center">
          <MessageSquare className="size-4" aria-hidden />
        </div>
        <div>
          <div className="text-sm font-semibold">Messages</div>
          <div className="text-xs text-slate-500">
            {viewerIsAdmin ? "Write to the client about this project" : "Ask about this project"}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void open()}
        disabled={opening}
        className="text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
      >
        {opening ? "Opening…" : "Open"} <ArrowRight className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

function AdminProjectHeader({
  project,
  current,
  holeNumber,
  holeCount,
}: {
  project: Project;
  current?: Milestone;
  holeNumber: number;
  holeCount: number;
}) {
  return (
    <div className="mt-6 max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {project.clientName || project.clientEmail} · {projectLabel(project.status)}
      </p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight leading-[1.05]">{project.name}</h1>
      <p className="mt-3 text-slate-600">
        {current
          ? `Current milestone: ${current.title}${holeCount ? ` · Hole ${holeNumber} of ${holeCount}` : ""}.`
          : holeCount
            ? "Course complete."
            : "No course loaded yet."}
      </p>
      <div className="mt-4 max-w-xl">
        <ProgressBar value={project.progressPercentage || 0} />
        <div className="flex justify-between text-sm text-slate-500 mt-1.5">
          <span>{project.progressPercentage || 0}% complete</span>
          {project.budget ? <span>{project.budget}</span> : <span>{project.clientEmail}</span>}
        </div>
      </div>
      <ShareLinkCard project={project} />
    </div>
  );
}

function ClientProjectHeader({
  project,
  view,
}: {
  project: Project;
  view: "course" | "timeline";
}) {
  return (
    <div className="mt-6">
      <p className="text-[13px] text-slate-500">Project progress</p>
      <h1 className="font-serif text-4xl font-semibold tracking-tight leading-[1.05]">
        {view === "course" ? (
          <>
            The <span className="italic font-normal text-slate-400">course,</span> so far.
          </>
        ) : (
          <>
            Where things <span className="italic font-normal text-slate-400">stand.</span>
          </>
        )}
      </h1>
      <p className="mt-2 text-slate-600">
        {view === "course"
          ? "A hole-by-hole view of where things stand. CasinWorks updates this as work moves."
          : "A clear timeline from kickoff to delivery."}
      </p>
      <h2 className="mt-6 font-serif text-2xl font-semibold">{project.name}</h2>
      <p className="text-sm text-slate-500 mt-1">
        {project.timelineStart ? `Started ${project.timelineStart}` : projectLabel(project.status)}
        {project.timelineEnd ? ` · Target finish ${project.timelineEnd}` : ""}
        {` · ${project.progressPercentage || 0}% complete`}
      </p>
      {view === "timeline" && (
        <div className="mt-4 max-w-xl">
          <ProgressBar value={project.progressPercentage || 0} />
          <div className="flex justify-between text-sm text-slate-500 mt-1.5">
            <span>{projectLabel(project.status)}</span>
            <span>{project.progressPercentage || 0}% complete</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectSettings({
  project,
  documents,
  milestones,
  onSaved,
  onDeleted,
}: {
  project: Project;
  documents: ProjectDocument[];
  milestones: Milestone[];
  onSaved: () => Promise<void>;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [email, setEmail] = useState(project.clientEmail);
  const [budget, setBudget] = useState(project.budget ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const deleteLocked = !canDeleteProject(project, documents, milestones);

  useEffect(() => {
    setName(project.name);
    setEmail(project.clientEmail);
    setBudget(project.budget ?? "");
    setStatus(project.status);
  }, [project]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const clientEmail = email.trim().toLowerCase();
      const user = await findUserByEmail(clientEmail);
      await updateProject(project.id, {
        name: name.trim(),
        clientId: user?.uid ?? project.clientId,
        clientEmail,
        clientName: user?.displayName || project.clientName,
        budget: budget.trim(),
        status,
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save project.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (deleteLocked) {
      const typed = window.prompt(
        `“${project.name}” has an invoice or downpayment, so delete is normally locked.\n\nType DELETE to remove this project, its milestones, and its documents anyway.`,
      );
      if (typed !== "DELETE") return;
    } else {
      const ok = window.confirm(`Delete “${project.name}”? Milestones and documents for this project will also be removed.`);
      if (!ok) return;
    }
    setBusyDelete(true);
    setError("");
    try {
      await deleteProject(project.id, { force: deleteLocked });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete project.");
      setBusyDelete(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid sm:grid-cols-2 gap-3 max-w-2xl">
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
      <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Client email" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
      <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget (optional)" className="px-3.5 py-2.5 bg-white border border-black/15 text-sm" />
      <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="px-3.5 py-2.5 bg-white border border-black/15 text-sm">
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="blocked">Blocked</option>
        <option value="complete">Complete</option>
      </select>
      <div className="sm:col-span-2 flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="rounded-full bg-black text-white text-sm font-semibold px-6 py-2.5 disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={busyDelete}
          onClick={() => void onDelete()}
          className="rounded-full border border-black/15 px-6 py-2.5 text-sm font-semibold text-red-800 disabled:opacity-50"
        >
          {deleteLocked ? "Delete project anyway" : "Delete project"}
        </button>
      </div>
      {deleteLocked && (
        <p className="sm:col-span-2 text-sm text-slate-500">
          {PROJECT_DELETE_LOCKED_MESSAGE} You can still remove it: tap Delete project anyway and type DELETE.
        </p>
      )}
      {error && <p className="sm:col-span-2 text-sm text-red-700">{error}</p>}
    </form>
  );
}
