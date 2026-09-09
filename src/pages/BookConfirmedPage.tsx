import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { SITE } from "../site";
import { formatConsultWhen } from "../portal/booking";
import { FadeSwap, PageFade } from "../portal/motion";

type ConfirmState =
  | { status: "loading" }
  | { status: "paid"; startsAt?: string; hours?: number; amountPhp?: number; email?: string }
  | { status: "pending"; startsAt?: string; hours?: number; amountPhp?: number; email?: string }
  | { status: "failed"; message: string };

/**
 * /book/confirmed — post-PayMongo landing for guest and portal checkouts.
 */
export default function BookConfirmedPage() {
  const [params] = useSearchParams();
  const paidFlag = params.get("paid");
  const consultationId = (params.get("c") ?? "").trim();
  const emailParam = (params.get("email") ?? "").trim().toLowerCase();
  const fromPortal = params.get("from") === "portal";
  const [state, setState] = useState<ConfirmState>({ status: "loading" });

  usePageMeta({
    title: `Booking confirmed — ${SITE.name}`,
    path: "/book/confirmed",
    noIndex: true,
  });

  useEffect(() => {
    if (paidFlag === "0") return;
    if (!consultationId) {
      setState({ status: "failed", message: "Missing booking reference." });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/book-confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consultationId }),
        });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          paymentStatus?: string;
          startsAt?: string;
          hours?: number;
          amountPhp?: number;
          email?: string;
        } | null;
        if (cancelled) return;
        if (!res.ok || !json?.ok) {
          setState({
            status: "failed",
            message: json?.error || "Could not confirm this booking.",
          });
          return;
        }
        const detail = {
          startsAt: json.startsAt,
          hours: json.hours,
          amountPhp: json.amountPhp,
          email: json.email || emailParam || undefined,
        };
        if (json.paymentStatus === "paid") {
          setState({ status: "paid", ...detail });
        } else {
          setState({ status: "pending", ...detail });
        }
      } catch {
        if (!cancelled) {
          setState({
            status: "failed",
            message: "Could not reach the confirmation service. Refresh this page in a moment.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paidFlag, consultationId, emailParam]);

  const registerHref = useMemo(() => {
    const q = new URLSearchParams();
    const email = (state.status === "paid" || state.status === "pending" ? state.email : "") || emailParam;
    if (email) q.set("email", email);
    q.set("next", "/portal/book");
    q.set("from", "book");
    return `/portal/register?${q.toString()}`;
  }, [state, emailParam]);

  if (paidFlag === "0") {
    return (
      <ConfirmedShell swapKey="cancelled">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Checkout</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight leading-snug">
          Payment was <span className="italic text-slate-500">cancelled.</span>
        </h1>
        <p className="mt-4 text-slate-600 leading-relaxed">
          Your slot may still be held. Return to the calendar to finish payment, or pick another time.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={fromPortal ? "/portal/book" : "/book"}
            className="rounded-full bg-black text-white px-5 py-2.5 text-sm font-semibold"
          >
            {fromPortal ? "Back to portal booking" : "Back to calendar"}
          </Link>
        </div>
      </ConfirmedShell>
    );
  }

  if (state.status === "loading") {
    return (
      <ConfirmedShell swapKey="loading">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Almost there</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight leading-snug">
          Confirming your <span className="italic text-slate-500">payment…</span>
        </h1>
        <p className="mt-4 text-slate-600 leading-relaxed">Checking PayMongo and updating your booking.</p>
      </ConfirmedShell>
    );
  }

  if (state.status === "failed") {
    return (
      <ConfirmedShell swapKey="failed">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Booking</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight leading-snug">
          We could not confirm <span className="italic text-slate-500">just yet.</span>
        </h1>
        <p className="mt-4 text-slate-600 leading-relaxed">{state.message}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={fromPortal ? "/portal/book" : "/book"} className="rounded-full bg-black text-white px-5 py-2.5 text-sm font-semibold">
            Return to booking
          </Link>
        </div>
      </ConfirmedShell>
    );
  }

  const when = state.startsAt ? formatConsultWhen(state.startsAt) : null;
  const hours = state.hours && state.hours >= 1 ? state.hours : null;
  const amount = state.amountPhp != null ? state.amountPhp : null;
  const confirmed = state.status === "paid";

  return (
    <ConfirmedShell swapKey={confirmed ? "paid" : "pending"}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {confirmed ? "Booking confirmed" : "Payment received"}
      </p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight leading-snug">
        {confirmed ? (
          <>
            You are on the <span className="italic text-slate-500">calendar.</span>
          </>
        ) : (
          <>
            Payment is still <span className="italic text-slate-500">settling.</span>
          </>
        )}
      </h1>
      <p className="mt-4 text-slate-600 leading-relaxed">
        {confirmed
          ? "CasinWorks has your request. The hour will be confirmed by hand — keep an eye on email for the next step."
          : "PayMongo accepted the checkout. Refresh this page in a moment if the status has not flipped to paid yet."}
      </p>

      {(when || hours || amount != null) && (
        <div className="mt-8 border border-black/10 bg-white px-5 py-5">
          {when ? <p className="font-serif text-2xl font-semibold tracking-tight">{when}</p> : null}
          <p className="mt-1 text-sm text-slate-600">
            {[
              hours ? `${hours} hour${hours === 1 ? "" : "s"}` : null,
              confirmed ? "paid" : "pending",
              amount != null ? `₱${amount.toLocaleString("en-US")}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {state.email ? <p className="mt-2 text-sm text-slate-500">{state.email}</p> : null}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {fromPortal ? (
          <Link to="/portal/book" className="rounded-full bg-black text-white px-5 py-2.5 text-sm font-semibold">
            View my bookings
          </Link>
        ) : (
          <>
            <Link to={registerHref} className="rounded-full bg-black text-white px-5 py-2.5 text-sm font-semibold">
              Create a free portal account
            </Link>
            <Link
              to={`/portal/sign-in?next=${encodeURIComponent("/portal/book")}`}
              className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold"
            >
              Already registered? Sign in
            </Link>
          </>
        )}
      </div>

      <Link to="/" className="mt-10 inline-block text-sm text-slate-500 underline underline-offset-4 hover:text-black">
        ← Back to CasinWorks
      </Link>
    </ConfirmedShell>
  );
}

function ConfirmedShell({ children, swapKey }: { children: ReactNode; swapKey: string }) {
  return (
    <PageFade className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a] px-[var(--page-gutter)] py-24">
      <FadeSwap swapKey={swapKey} className="max-w-lg mx-auto">
        {children}
      </FadeSwap>
    </PageFade>
  );
}

/** Legacy success URL from earlier checkouts. */
export function BookCompleteRedirect() {
  const [params] = useSearchParams();
  const qs = params.toString();
  return <Navigate to={qs ? `/book/confirmed?${qs}` : "/book/confirmed"} replace />;
}
