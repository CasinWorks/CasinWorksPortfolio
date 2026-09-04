import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import { ACCOUNT_PRIVACY_URL, ACCOUNT_STORED_DATA_NOTICE } from "../api";
import { usePortalAuth } from "../auth";

function workspaceLabel(role: string | undefined) {
  if (role === "admin") return "Admin";
  if (role === "subcontractor") return "Subcontractor";
  return "Client";
}

export function AccountScreen() {
  usePageMeta({
    title: `Account — Portal | ${SITE.name}`,
    path: "/portal/account",
    noIndex: true,
  });
  const { profile, logout, deleteAccount } = usePortalAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function onSignOut() {
    await logout();
    navigate("/portal/sign-in", { replace: true });
  }

  async function onDelete(e: FormEvent) {
    e.preventDefault();
    setError("");
    setWorking(true);
    try {
      await deleteAccount(password);
      navigate("/portal/sign-in", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the account.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="max-w-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Account</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight">Your account.</h1>

      <dl className="mt-8 divide-y divide-black/10 border-y border-black/10">
        <div className="py-4 flex justify-between gap-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Email</dt>
          <dd className="text-sm font-medium text-right break-all">{profile?.email || "—"}</dd>
        </div>
        <div className="py-4 flex justify-between gap-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Name</dt>
          <dd className="text-sm font-medium text-right">{profile?.displayName || "—"}</dd>
        </div>
        <div className="py-4 flex justify-between gap-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace</dt>
          <dd className="text-sm font-medium text-right">{workspaceLabel(profile?.role)}</dd>
        </div>
      </dl>

      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">What is stored</p>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">{ACCOUNT_STORED_DATA_NOTICE}</p>
      <a href={ACCOUNT_PRIVACY_URL} className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
        Read the privacy policy
      </a>

      <button
        type="button"
        onClick={() => void onSignOut()}
        className="mt-8 w-full rounded-full border border-black/15 py-3.5 text-sm font-semibold"
      >
        Sign out
      </button>

      <div className="mt-12 pt-8 border-t border-black/10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-800">Delete account</p>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Deleting your account removes your profile, your consultation requests, and any subcontractor applications,
          and signs you out everywhere. This cannot be undone.
        </p>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Quotations, purchase orders, invoices, and remittances already issued for an engagement are kept by CasinWorks
          as business and tax records.
        </p>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          disabled={working}
          onClick={() => {
            setError("");
            setPassword("");
            setConfirmOpen(true);
          }}
          className="mt-6 w-full rounded-full bg-red-800 text-white py-3.5 text-sm font-semibold disabled:opacity-50"
        >
          {working ? "Deleting…" : "Delete my account"}
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cancel account deletion"
            onClick={() => !working && setConfirmOpen(false)}
          />
          <form
            onSubmit={onDelete}
            className="relative w-full max-w-md bg-[var(--page-cream)] border border-black/10 p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Confirm</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Delete your account.</h2>
            <p className="mt-3 text-sm text-slate-600">
              Enter your password to confirm. Your profile, consultation requests, and applications are removed for
              good.
            </p>
            <input
              required
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-5 w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm focus:outline-none focus:border-black"
            />
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={working}
                onClick={() => setConfirmOpen(false)}
                className="rounded-full border border-black/15 py-3 text-sm font-semibold"
              >
                Keep it
              </button>
              <button
                type="submit"
                disabled={working || !password}
                className="rounded-full bg-red-800 text-white py-3 text-sm font-semibold disabled:opacity-50"
              >
                {working ? "Deleting…" : "Delete"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
