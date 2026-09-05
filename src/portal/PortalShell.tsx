import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { SITE } from "../site";
import { usePortalAuth } from "./auth";
import { AnimatedOutlet } from "./motion";
import { useUnreadThreadCount } from "./unread";

type PortalLink = { to: string; label: string; badge?: number };

export function PortalShell() {
  const { profile, logout } = usePortalAuth();
  const location = useLocation();
  const isAdmin = profile?.role === "admin";
  const showClient = isAdmin || profile?.role === "client";
  const showGigs = isAdmin || profile?.role === "subcontractor";
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = useUnreadThreadCount();

  const candidates: (PortalLink | null)[] = [
    showClient ? { to: "/portal/dashboard", label: "Projects" } : null,
    showClient ? { to: "/portal/book", label: "Book" } : null,
    { to: "/portal/messages", label: "Messages", badge: unread },
    showGigs ? { to: "/portal/gigs", label: "Gig board" } : null,
    isAdmin ? { to: "/portal/admin/users", label: "Users" } : null,
    isAdmin ? { to: "/portal/admin/clients", label: "Clients" } : null,
    isAdmin ? { to: "/portal/admin", label: "Admin" } : null,
    { to: "/portal/account", label: "Account" },
  ];
  const links = candidates.filter((row): row is PortalLink => Boolean(row));

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  function linkClass(isActive: boolean) {
    return isActive ? "text-black" : "text-slate-500 hover:text-black";
  }

  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a]">
      <header className="border-b border-black/10 bg-[var(--page-cream)] sticky top-0 z-40">
        <div className="max-w-[var(--page-max)] mx-auto px-[var(--page-gutter)] py-3 sm:py-4 flex items-center justify-between gap-3">
          <Link to="/portal" className="flex flex-col leading-tight min-w-0">
            <span className="text-lg font-semibold tracking-tight truncate">{SITE.brand}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Client portal</span>
          </Link>
          <nav className="hidden md:flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-medium">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `inline-flex items-center gap-1.5 ${linkClass(isActive)}`}
              >
                {l.label}
                {l.badge ? <UnreadBadge count={l.badge} /> : null}
              </NavLink>
            ))}
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
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center size-11 rounded-full border border-black/15"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="portal-mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div id="portal-mobile-nav" className="md:hidden fixed inset-0 z-30">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-x-0 top-0 bg-[var(--page-cream)] border-b border-black/10 pt-[4.75rem] pb-6 px-[var(--page-gutter)]">
            <nav className="flex flex-col border border-black/10 bg-white">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `min-h-12 px-4 flex items-center gap-2 text-[15px] font-medium border-b border-black/10 ${linkClass(isActive)}`
                  }
                >
                  {l.label}
                  {l.badge ? <UnreadBadge count={l.badge} /> : null}
                </NavLink>
              ))}
              <Link to="/" className="min-h-12 px-4 flex items-center text-[15px] font-medium text-slate-500 border-b border-black/10">
                Site
              </Link>
              <Link
                to="/portal/sign-in"
                onClick={() => {
                  void logout();
                }}
                className="min-h-12 px-4 inline-flex items-center gap-1.5 text-[15px] font-medium text-slate-500"
              >
                <LogOut className="size-3.5" aria-hidden />
                Sign out
              </Link>
            </nav>
          </div>
        </div>
      )}

      <main className="max-w-[var(--page-max)] mx-auto px-[var(--page-gutter)] py-8 sm:py-14 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <AnimatedOutlet />
      </main>
    </div>
  );
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span
      className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-black px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
      aria-label={`${count} unread ${count === 1 ? "conversation" : "conversations"}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function RequireAuth() {
  const { configured, loading, profile } = usePortalAuth();
  if (!configured) {
    return (
      <div className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a] px-[var(--page-gutter)] py-16 sm:py-24">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4">Portal</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold italic">Firebase is not configured.</h1>
        <p className="mt-4 max-w-xl text-slate-600">
          Add FIREBASE_* keys on the server (Vercel / .env.local), then reload.
        </p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--page-cream)] text-slate-500 px-[var(--page-gutter)] py-16 sm:py-24">
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
