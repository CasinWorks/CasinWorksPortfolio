import { useState } from "react";
import { Sparkles, Undo2, X } from "lucide-react";

export type HelpMeWriteRole = "admin" | "client";

export type HelpMeWriteContext = {
  role: HelpMeWriteRole;
  projectName?: string;
  clientName?: string;
  recentMessages?: Array<{ role: HelpMeWriteRole; body: string }>;
  getIdToken: () => Promise<string | undefined>;
};

const ADMIN_CHIPS = [
  { label: "Progress update", prompt: "Write a short progress update for the client." },
  { label: "Next steps", prompt: "Write a brief note about next steps and what we need from them." },
  { label: "Clarify timing", prompt: "Ask politely about timing or a decision we are waiting on." },
] as const;

const CLIENT_CHIPS = [
  { label: "Ask a question", prompt: "Write a clear question about the project." },
  { label: "Confirm received", prompt: "Confirm we received their update and thank them briefly." },
  { label: "Request change", prompt: "Request a change or clarification politely." },
] as const;

type Props = {
  value: string;
  onChange: (next: string) => void;
  context: HelpMeWriteContext;
};

/**
 * Gmail-style Help me write bar for portal composers.
 * Fills the textarea only — posting / email notify stays with the parent form.
 */
export function HelpMeWrite({ value, onChange, context }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [undoText, setUndoText] = useState<string | null>(null);

  const chips = context.role === "admin" ? ADMIN_CHIPS : CLIENT_CHIPS;

  async function generate(instruction: string) {
    const trimmed = instruction.trim();
    if (!trimmed && !value.trim()) {
      setError("Describe what to write, or start a draft first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const idToken = await context.getIdToken();
      if (!idToken) throw new Error("Sign in again to use Help me write.");

      const res = await fetch("/api/help-me-write", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          prompt: trimmed || "Polish this into a clear portal update.",
          draft: value,
          role: context.role,
          projectName: context.projectName,
          clientName: context.clientName,
          recentMessages: context.recentMessages?.slice(-8),
        }),
      });

      const data = (await res.json().catch(() => null)) as { ok?: boolean; text?: string; error?: string } | null;
      if (!res.ok || !data?.ok || !data.text) {
        throw new Error(data?.error || "Could not generate a draft.");
      }

      setUndoText(value);
      onChange(data.text);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a draft.");
    } finally {
      setBusy(false);
    }
  }

  function undo() {
    if (undoText === null) return;
    onChange(undoText);
    setUndoText(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setError("");
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-black/30 transition-colors"
          aria-expanded={open}
        >
          <Sparkles className="size-3.5" aria-hidden />
          Help me write
        </button>
        {undoText !== null && (
          <button
            type="button"
            onClick={undo}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-black/30"
          >
            <Undo2 className="size-3.5" aria-hidden />
            Undo
          </button>
        )}
      </div>

      {open && (
        <div className="border border-black/10 bg-[var(--page-panel)] p-3 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                disabled={busy}
                onClick={() => void generate(chip.prompt)}
                className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-black/25 disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-stretch">
            <div className="relative min-w-0 flex-1">
              <Sparkles className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void generate(prompt);
                  }
                }}
                disabled={busy}
                maxLength={800}
                placeholder={
                  value.trim()
                    ? "Formalize this… shorter… add next steps…"
                    : "Short progress update for the client…"
                }
                className="w-full border border-black/15 bg-white py-2 pl-9 pr-3 text-sm disabled:opacity-60"
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void generate(prompt)}
              className="shrink-0 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Writing…" : "Generate"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError("");
              }}
              className="shrink-0 rounded-full border border-black/15 px-2.5 text-slate-500 hover:text-black"
              aria-label="Close Help me write"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      )}
    </div>
  );
}
