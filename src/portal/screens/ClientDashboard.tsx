import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import { fetchAllProjects, fetchProjectsForClient } from "../api";
import { usePortalAuth } from "../auth";
import type { Project } from "../types";
import { StatusPill, projectLabel } from "./ui";

export function ClientDashboard() {
  usePageMeta({
    title: `Projects — Portal | ${SITE.name}`,
    path: "/portal/dashboard",
    noIndex: true,
  });
  const { profile } = usePortalAuth();
  const isAdmin = profile?.role === "admin";
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    const load = isAdmin ? fetchAllProjects() : fetchProjectsForClient(profile);
    load.then(setProjects).catch((e) => setError(e instanceof Error ? e.message : "Could not load projects."));
  }, [profile, isAdmin]);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {isAdmin ? "Studio desk" : "Client workspace"}
      </p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
        {isAdmin ? (
          <>
            Open a project, <span className="italic text-slate-400">work the hole.</span>
          </>
        ) : (
          <>
            The work, <span className="italic text-slate-400">in progress.</span>
          </>
        )}
      </h1>
      <p className="mt-3 max-w-xl text-slate-600">
        {isAdmin
          ? "Each card is an engagement. Open it to see the current milestone — issue a quotation, log a consult, or mark the hole done from there."
          : "Project cards, milestones, and documents — not a purchased product marketplace. CasinWorks confirms remittances by hand."}
      </p>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <div className="mt-10">
        {projects.length === 0 && (
          <p className="py-10 text-slate-500 border-y border-black/10">
            {isAdmin ? (
              <>
                No projects yet. Add a company under{" "}
                <Link to="/portal/admin/clients" className="underline underline-offset-2">
                  Clients
                </Link>
                , then start a project from their page.
              </>
            ) : (
              "No projects assigned yet. CasinWorks will attach an engagement when work starts."
            )}
          </p>
        )}
        {projects.map((p) => (
          <div
            key={p.id}
            className="full-bleed-row grid lg:grid-cols-12 gap-4 py-8 group border-y border-black/10 -mt-px first:mt-0"
          >
            <Link to={`/portal/projects/${p.id}`} className="lg:col-span-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {p.clientName || p.clientEmail || p.referenceCode} · {projectLabel(p.status)}
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight group-hover:text-slate-700">{p.name}</h2>
              {isAdmin && p.currentHoleTitle ? (
                <p className="mt-2 text-slate-600">
                  Now: <span className="font-medium text-black">{p.currentHoleTitle}</span>
                </p>
              ) : (
                p.tagline && <p className="mt-2 text-slate-600">{p.tagline}</p>
              )}
            </Link>
            <div className="lg:col-span-5 flex flex-col justify-center gap-3">
              <Link to={`/portal/projects/${p.id}`}>
                <div className="h-1.5 w-full bg-black/10 overflow-hidden">
                  <div className="h-full bg-black" style={{ width: `${Math.min(100, p.progressPercentage || 0)}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                  <span>{p.progressPercentage || 0}% complete</span>
                  <span className="inline-flex items-center gap-1 text-black font-medium">
                    {isAdmin ? "Open project" : "Open course"} <ArrowRight className="size-4" aria-hidden />
                  </span>
                </div>
              </Link>
              {!isAdmin && (
                <Link
                  to={`/portal/projects/${p.id}/documents`}
                  className="text-xs font-semibold underline underline-offset-4 w-fit"
                >
                  View records
                </Link>
              )}
              {p.budget && <StatusPill>{p.budget}</StatusPill>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
