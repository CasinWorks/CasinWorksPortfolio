import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePageMeta } from "../hooks/usePageMeta";
import { SITE } from "../site";
import {
  SLOT_HOURS,
  durationFits,
  formatConsultWhen,
  formatSlotHour,
  isPastSlot,
  isWeekday,
  manilaDateIso,
  monthGrid,
  slotStart,
  slotsOverlap,
} from "../portal/booking";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type BusySlot = { startsAt: string; hours: number };

/** Public book flow — calendar, concerns, email, then PayMongo. Register after payment. */
export default function BookConsultationPage() {
  usePageMeta({
    title: `Book a consultation — ${SITE.name}`,
    description:
      "Choose a weekday slot, share what you want to discuss, and settle the exploratory hour. Create a portal account after payment.",
    path: "/book",
  });

  const [searchParams] = useSearchParams();
  const todayIso = manilaDateIso();
  const todayParts = todayIso.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: todayParts[0], month: todayParts[1] - 1 });
  const [dateIso, setDateIso] = useState("");
  const [hour, setHour] = useState<number | null>(null);
  const [hours, setHours] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/book-availability", { headers: { Accept: "application/json" } })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as { ok?: boolean; busy?: BusySlot[] } | null;
        if (!cancelled && json?.ok && Array.isArray(json.busy)) setBusySlots(json.busy);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const paid = searchParams.get("paid");
    if (paid === "0") {
      setNotice("Checkout was cancelled. Your details are still here — pick a time when you are ready.");
    }
  }, [searchParams]);

  const cells = monthGrid(cursor.year, cursor.month);
  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const feePhp = hours * SITE.exploratoryConsultationHourlyRatePhp;

  function takenOn(day: string, startHour: number, duration: number) {
    const start = slotStart(day, startHour).toISOString();
    return busySlots.some((b) => slotsOverlap(start, duration, b.startsAt, b.hours));
  }

  const openHours = dateIso
    ? SLOT_HOURS.filter(
        (h) => durationFits(h, hours) && !isPastSlot(dateIso, h) && !takenOn(dateIso, h, hours),
      )
    : [];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dateIso || hour == null) return;
    setError("");
    setNotice("");
    setSending(true);
    try {
      const startsAt = slotStart(dateIso, hour).toISOString();
      if (takenOn(dateIso, hour, hours)) throw new Error("That slot was just taken. Pick another time.");
      const res = await fetch("/api/book-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          notes,
          startsAt,
          hours,
          website: "",
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        checkoutUrl?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok || !json.checkoutUrl) {
        throw new Error(json?.error || "Could not start checkout.");
      }
      window.location.assign(json.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[#1a1a1a]">
      <header className="border-b border-black/10 px-[var(--page-gutter)] py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Link to="/" className="flex flex-col leading-tight hover:opacity-70 transition-opacity">
            <span className="text-lg font-semibold tracking-tight">{SITE.brand}</span>
            <span className="text-xs text-current/55">Independent Engineering</span>
          </Link>
          <Link
            to="/portal/sign-in"
            className="text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-black transition-colors"
          >
            Client portal
          </Link>
        </div>
      </header>

      <main className="px-[var(--page-gutter)] py-12 sm:py-16">
        <form onSubmit={onSubmit} className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Consultation</p>
          <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
            Book an hour, <span className="italic text-slate-400">on the calendar.</span>
          </h1>
          <p className="mt-3 max-w-xl text-slate-600">
            Choose a weekday slot, tell us what is on your mind, and leave your email. Exploratory consultation is ₱
            {SITE.exploratoryConsultationHourlyRatePhp.toLocaleString("en-US")} per hour — settled when you book. You can
            create a portal account after payment.
          </p>
          {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
          {notice && <p className="mt-4 text-sm text-slate-700">{notice}</p>}

          <div className="mt-10 grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7">
              <div className="flex items-center justify-between mb-4">
                <p className="font-serif text-2xl font-semibold">{monthLabel}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() =>
                      setCursor((c) =>
                        c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 },
                      )
                    }
                    className="size-9 inline-flex items-center justify-center rounded-full border border-black/15"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() =>
                      setCursor((c) =>
                        c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 },
                      )
                    }
                    className="size-9 inline-flex items-center justify-center rounded-full border border-black/15"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center py-1">
                    <span className="sm:hidden">{d.slice(0, 1)}</span>
                    <span className="hidden sm:inline">{d}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} className="aspect-square" />;
                  const weekend = !isWeekday(day);
                  const past = day < todayIso;
                  const selected = dateIso === day;
                  const hasSlot = !weekend && !past;
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!hasSlot}
                      onClick={() => {
                        setDateIso(day);
                        setHour(null);
                      }}
                      className={`min-h-10 sm:min-h-0 aspect-square rounded-full text-sm font-medium ${
                        selected
                          ? "bg-black text-white"
                          : hasSlot
                            ? "hover:bg-black/10"
                            : "text-slate-300 cursor-default"
                      }`}
                    >
                      {Number(day.slice(-2))}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Duration</p>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setHours(n);
                        setHour(null);
                      }}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                        hours === n ? "bg-black text-white" : "border border-black/15"
                      }`}
                    >
                      {n} hr{n === 1 ? "" : "s"}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {dateIso && hour != null
                    ? formatConsultWhen(slotStart(dateIso, hour).toISOString())
                    : `₱${feePhp.toLocaleString("en-US")} for ${hours} hour${hours === 1 ? "" : "s"}`}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {dateIso ? `Times · ${dateIso}` : "Pick a weekday"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 min-h-[2.5rem]">
                  {!dateIso && <p className="text-sm text-slate-500">Select a date on the calendar.</p>}
                  {dateIso && openHours.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No open times that day for {hours} hour{hours === 1 ? "" : "s"}.
                    </p>
                  )}
                  {openHours.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHour(h)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                        hour === h ? "bg-black text-white" : "border border-black/15"
                      }`}
                    >
                      {formatSlotHour(h)}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  What do you want to talk about?
                </span>
                <textarea
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="Scope, constraints, concerns, timing — whatever is on your mind."
                  className="mt-2 w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-2 w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm"
                />
              </label>

              {/* Honeypot */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
                value=""
                readOnly
              />

              <button
                type="submit"
                disabled={sending || hour == null || !dateIso || !notes.trim() || !email.trim()}
                className="rounded-full bg-black text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {sending ? "Opening checkout…" : `Continue to payment · ₱${feePhp.toLocaleString("en-US")}`}
              </button>
              <p className="text-xs text-slate-500 leading-relaxed">
                After payment you can create a free portal account with the same email to follow the engagement.
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
