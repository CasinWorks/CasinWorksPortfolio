import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { docTypeName } from "../api";
import type { ProjectDocument } from "../types";
import { StaggerItem, StaggerList } from "../motion";

export function ProjectRecordsList({
  projectId,
  documents,
}: {
  projectId: string;
  documents: ProjectDocument[];
}) {
  if (documents.length === 0) {
    return <p className="text-sm text-slate-500">No files on this project yet.</p>;
  }

  return (
    <StaggerList className="divide-y divide-black/10 border-y border-black/10">
      {documents.map((d) => (
        <StaggerItem key={d.id} className="py-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2">
          <Link to={`/portal/projects/${projectId}/documents/${d.id}`} className="min-w-0">
            <div className="text-sm font-semibold">{d.title}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {docTypeName(d.type)} · {d.date}
              {d.fileName ? ` · ${d.fileName}` : ""}
            </div>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/portal/projects/${projectId}/documents/${d.id}`}
              className="rounded-full border border-black/15 px-3 py-1 text-[11px] font-semibold"
            >
              View
            </Link>
            {d.fileUrl && (
              <a
                href={d.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-black text-white px-3 py-1 text-[11px] font-semibold"
              >
                Open file
                <Download className="size-3" aria-hidden />
              </a>
            )}
          </div>
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
