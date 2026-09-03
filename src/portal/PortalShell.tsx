import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { SITE } from "../site";
import { usePortalAuth } from "./auth";

export function PortalShell() {
  const { profile, logout } = usePortalAuth();
  const isAdmin = profile?.role === "admin";
  const showClient = isAdmin || profile?.role === "client";
  const showGigs = isAdmin || profile?.role === "subcontractor";

  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a]">
      <header className="border-b border-black/10 bg-[var(--page-cream)] sticky top-0 z-40">
        <div className="max-w-[var(--page-max)] mx-auto px-[var(--page-gutter)] py-4 flex flex-wrap items-center justify-between gap-4">
          <Link to="/portal" className="flex flex-col leading-tight">
            <span className="text-lg font-semibold tracking-tight">{SITE.brand}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Client portal</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-medium">
            {showClient && (
              <NavLink
                to="/portal/dashboard"
                className={({ isActive }) => (isActive ? "text-black" : "text-slate-500 hover:text-black")}
              >
                Projects
              </NavLink>
            )}
            {showClient && (
              <NavLink
                to="/portal/book"
                className={({ isActive }) => (isActive ? "text-black" : "text-slate-500 hover:text-black")}
              >
                Book
              </NavLink>
            )}
            {showGigs && (
              <NavLink
                to="/portal/gigs"
                className={({ isActive }) => (isActive ? "text-black" : "text-slate-500 hover:text-black")}
              >
                Gig board
              </NavLink>
            )}
            {isAdmin && (
              <NavLink
                to="/portal/admin/users"
                className={({ isActive }) => (isActive ? "text-black" : "text-slate-500 hover:text-black")}
              >
                Users
              </NavLink>
            )}
            {isAdmin && (
              <NavLink
                to="/portal/admin/clients"
                className={({ isActive }) => (isActive ? "text-black" : "text-slate-500 hover:text-black")}
              >
                Clients
              </NavLink>
            )}
            {isAdmin && (
              <NavLink
                to="/portal/admin"
                className={({ isActive }) => (isActive ? "text-black" : "text-slate-500 hover:text-black")}
              >
                Admin
              </NavLink>
            )}
            <Link to="/" className="text-slate-500 hover:text-black">
              Site
            </Link>
            <Link
              to="/portal/sign-in"
              onClick={() => {
                void logout();
              }}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-black"
            >
              <LogOut className="size-3.5" aria-hidden />
              Sign out
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-[var(--page-max)] mx-auto px-[var(--page-gutter)] py-10 sm:py-14">
        <Outlet />
      </main>
    </div>
  );
}

export function RequireAuth() {
  const { configured, loading, profile } = usePortalAuth();
  if (!configured) {
    return (
      <div className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a] px-[var(--page-gutter)] py-24">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4">Portal</p>
        <h1 className="font-serif text-4xl font-semibold italic">Firebase is not configured.</h1>
        <p className="mt-4 max-w-xl text-slate-600">
          Add FIREBASE_* keys on the server (Vercel / .env.local), then reload.
        </p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--page-cream)] text-slate-500 px-[var(--page-gutter)] py-24">
        Loading portal…
      </div>
    );
  }
  if (!profile) return <Navigate to="/portal/sign-in" replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { profile } = usePortalAuth();
  if (profile?.role === "subcontractor") return <Navigate to="/portal/gigs" replace />;
  return <Navigate to="/portal/dashboard" replace />;
}

export function RequireAdmin() {
  const { profile } = usePortalAuth();
  if (profile?.role !== "admin") return <Navigate to="/portal" replace />;
  return <Outlet />;
}

export function RequireClientArea() {
  const { profile } = usePortalAuth();
  if (profile?.role === "subcontractor") return <Navigate to="/portal/gigs" replace />;
  return <Outlet />;
}

export function RequireGigArea() {
  const { profile } = usePortalAuth();
  if (profile?.role === "client") return <Navigate to="/portal/dashboard" replace />;
  return <Outlet />;
}
