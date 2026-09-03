import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Lock, Mail, Shield } from "lucide-react";
import { SITE } from "../../site";
import { usePageMeta } from "../../hooks/usePageMeta";
import { usePortalAuth } from "../auth";
import type { PortalRole } from "../types";

function safeNext(raw: string | null) {
  if (raw && raw.startsWith("/portal")) return raw;
  return "/portal";
}

export function PortalSignInScreen() {
  usePageMeta({
    title: `Portal sign-in — ${SITE.name}`,
    description: "CasinWorks client and subcontractor portal.",
    path: "/portal/sign-in",
    noIndex: true,
  });

  const { configured, profile, signIn } = usePortalAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextPath = safeNext(params.get("next"));
  const [role, setRole] = useState<Exclude<PortalRole, "admin">>("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  if (profile) return <Navigate to={nextPath} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await signIn(email, password);
      navigate(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a] px-[var(--page-gutter)] py-16 sm:py-24">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between pb-6 border-b border-black/10">
          <Link to="/" className="hover:opacity-70">
            <div className="text-xs font-semibold uppercase tracking-[0.2em]">{SITE.brand}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">Independent Engineering</div>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 border border-black/10 px-2 py-0.5">
            <Shield className="size-3" aria-hidden />
            Encrypted portal
          </span>
        </div>

        <h1 className="mt-8 font-serif text-4xl leading-[1.1] font-semibold tracking-tight">
          Your work, <span className="italic text-slate-500">in one place.</span>
        </h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {SITE.tagline}.
        </p>

        {!configured && (
          <p className="mt-6 text-sm text-red-700">
            Firebase is not configured on the server. The portal cannot sign anyone in until FIREBASE_* keys are set.
          </p>
        )}

        <div className="mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 mb-2">Workspace</p>
          <div className="p-1 bg-[var(--page-panel)] border border-black/10 rounded-full flex">
            <button
              type="button"
              onClick={() => setRole("client")}
              className={`flex-1 py-2 px-3 rounded-full text-xs font-medium ${
                role === "client" ? "bg-black text-white" : "text-slate-600 hover:text-black"
              }`}
            >
              I’m a client
            </button>
            <button
              type="button"
              onClick={() => setRole("subcontractor")}
              className={`flex-1 py-2 px-3 rounded-full text-xs font-medium ${
                role === "subcontractor" ? "bg-black text-white" : "text-slate-600 hover:text-black"
              }`}
            >
              I’m looking for work
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {role === "client"
              ? "Project progress, documents, invoices, and remittances."
              : "Open subcontractor postings and applications."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="portal-email" className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-1.5">
              Email
            </label>
            <div className="relative">
              <input
                id="portal-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm focus:outline-none focus:border-black"
              />
              <Mail className="size-4 text-slate-400 absolute right-3 top-3" aria-hidden />
            </div>
          </div>
          <div>
            <label htmlFor="portal-password" className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="portal-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm focus:outline-none focus:border-black"
              />
              <Lock className="size-4 text-slate-400 absolute right-3 top-3" aria-hidden />
            </div>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={sending || !configured}
            className="w-full py-3.5 px-6 bg-black text-white rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50"
          >
            Continue as {role === "client" ? "client" : "subcontractor"}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </form>

        <p className="mt-8 pt-6 border-t border-black/10 text-sm text-slate-600">
          Need access?{" "}
          <Link to={`/portal/register${params.get("next") ? `?next=${encodeURIComponent(nextPath)}` : ""}`} className="text-black font-medium underline underline-offset-4">
            Register
          </Link>
          {" · "}
          <Link to="/#contact" className="text-black font-medium underline underline-offset-4">
            Contact CasinWorks
          </Link>
        </p>
      </div>
    </div>
  );
}

export function PortalRegisterScreen() {
  usePageMeta({
    title: `Portal register — ${SITE.name}`,
    path: "/portal/register",
    noIndex: true,
  });
  const { configured, profile, register } = usePortalAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const invitedEmail = (params.get("email") ?? "").trim().toLowerCase();
  const nextPath = safeNext(params.get("next"));
  const [role, setRole] = useState<Exclude<PortalRole, "admin">>("client");
  const [displayName, setDisplayName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  if (profile) return <Navigate to={nextPath} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (invitedEmail && email.trim().toLowerCase() !== invitedEmail) {
      setError(`Use ${invitedEmail} so this project attaches to your account.`);
      return;
    }
    setSending(true);
    try {
      await register({
        email: invitedEmail || email,
        password,
        displayName,
        role: invitedEmail ? "client" : role,
        company: role === "client" || invitedEmail ? company : undefined,
      });
      navigate(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a] px-[var(--page-gutter)] py-16 sm:py-24">
      <div className="max-w-md mx-auto">
        <Link to={`/portal/sign-in?next=${encodeURIComponent(nextPath)}`} className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          ← Sign in
        </Link>
        <h1 className="mt-6 font-serif text-4xl font-semibold tracking-tight">
          {invitedEmail ? (
            <>
              Claim <span className="italic text-slate-500">this project.</span>
            </>
          ) : (
            <>
              Request <span className="italic text-slate-500">access.</span>
            </>
          )}
        </h1>
        {invitedEmail && (
          <p className="mt-3 text-sm text-slate-600">
            Register with <span className="font-medium text-black">{invitedEmail}</span> so the course attaches to your account. Then you can follow it in the CasinWorks app.
          </p>
        )}
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {!invitedEmail && (
            <div className="p-1 bg-[var(--page-panel)] border border-black/10 rounded-full flex">
              <button type="button" onClick={() => setRole("client")} className={`flex-1 py-2 rounded-full text-xs font-medium ${role === "client" ? "bg-black text-white" : "text-slate-600"}`}>
                Client
              </button>
              <button type="button" onClick={() => setRole("subcontractor")} className={`flex-1 py-2 rounded-full text-xs font-medium ${role === "subcontractor" ? "bg-black text-white" : "text-slate-600"}`}>
                Subcontractor
              </button>
            </div>
          )}
          <input required placeholder="Full name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm focus:outline-none focus:border-black" />
          {(role === "client" || invitedEmail) && (
            <input
              required
              placeholder="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm focus:outline-none focus:border-black"
            />
          )}
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            readOnly={Boolean(invitedEmail)}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm focus:outline-none focus:border-black read-only:bg-[var(--page-panel)]"
          />
          <input required type="password" minLength={8} placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm focus:outline-none focus:border-black" />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={sending || !configured} className="w-full py-3.5 bg-black text-white rounded-full text-sm font-semibold disabled:opacity-50">
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}
