import { useEffect, useState } from "react";
import { Copy, Link2, Mail } from "lucide-react";
import { ensureProjectShare, projectShareUrl } from "../api";
import type { Project } from "../types";

export function ShareLinkCard({ project }: { project: Project }) {
  const [url, setUrl] = useState(project.shareToken ? projectShareUrl(project.shareToken) : "");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(!project.shareToken);

  useEffect(() => {
    let live = true;
    ensureProjectShare(project.id)
      .then((token) => {
        if (live) {
          setUrl(projectShareUrl(token));
          setBusy(false);
        }
      })
      .catch((err) => {
        if (live) {
          setBusy(false);
          setError(err instanceof Error ? err.message : "Could not create share link. Republish Firestore rules for projectShares.");
        }
      });
    return () => {
      live = false;
    };
  }, [project.id]);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Select the link and copy it yourself.");
    }
  }

  const mailHref = url
    ? `mailto:${encodeURIComponent(project.clientEmail)}?subject=${encodeURIComponent(
        `Progress on ${project.name}`,
      )}&body=${encodeURIComponent(
        `Hello,\n\nHere is your CasinWorks project invite. Sign in (or create an account) with ${project.clientEmail} to open it. Nothing is shown until you log in.\n\n${url}\n\nThank you,\nCasinWorks`,
      )}`
    : "";

  return (
    <div className="mt-6 max-w-xl border border-black/10 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Client invite</p>
      <h3 className="mt-1 font-serif text-xl font-semibold">Send them a login link.</h3>
      <p className="mt-1 text-sm text-slate-600">
        The project stays private until they sign in with {project.clientEmail || "the invited email"}. The link does not show names, files, or the course to anyone else.
      </p>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input readOnly value={busy ? "Preparing link…" : url} className="min-w-0 w-full flex-1 px-3 py-2.5 bg-[var(--page-panel)] border border-black/15 text-sm truncate" />
        <button type="button" disabled={!url || busy} onClick={() => void copy()} className="rounded-full bg-black text-white px-4 py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0">
          <Copy className="size-3.5" aria-hidden />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {project.clientEmail && (
          <a href={mailHref} className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5">
            <Mail className="size-3.5" aria-hidden />
            Email client
          </a>
        )}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5">
            <Link2 className="size-3.5" aria-hidden />
            Open invite
          </a>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
