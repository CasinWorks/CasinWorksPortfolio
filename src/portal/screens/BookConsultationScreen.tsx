import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import {
  createConsultation,
  listenConsultations,
  startConsultationCheckout,
  updateConsultationStatus,
} from "../api";
import { usePortalAuth } from "../auth";
import {
  CONSULT_TZ,
  SLOT_HOURS,
  activeBookings,
  consultationIcs,
  downloadIcs,
  durationFits,
  formatConsultWhen,
  formatSlotHour,
  googleCalendarUrl,
  isPastSlot,
  isWeekday,
  manilaDateIso,
  monthGrid,
  slotStart,
  slotsOverlap,
} from "../booking";
import type { ConsultationBooking } from "../types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function manilaDayKey(startsAt: string) {
  return new Date(startsAt).toLocaleDateString("en-CA", { timeZone: CONSULT_TZ });
}

function paymentLabel(row: ConsultationBooking) {
  if (row.paymentStatus === "paid") return "paid";
  if (row.paymentStatus === "waived") return "waived";
  if (row.paymentStatus === "pending") return "unpaid";
  return "";
}

export function BookConsultationScreen() {
  const { profile } = usePortalAuth();
  const isAdmin = profile?.role === "admin";

  if (isAdmin) return <AdminConsultationCalendar />;
  return <ClientBookConsultation />;
}

/** Admin: calendar of meetings — who, when, how many — not a self-booking form. */
function AdminConsultationCalendar() {
  usePageMeta({
    title: `Consultation calendar — Portal | ${SITE.name}`,
    path: "/portal/book",
    noIndex: true,
  });

  const todayIso = manilaDateIso();
  const todayParts = todayIso.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: todayParts[0], month: todayParts[1] - 1 });
  const [dateIso, setDateIso] = useState(todayIso);
  const [rows, setRows] = useState<ConsultationBooking[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => listenConsultations(setRows, setError), []);

  const active = useMemo(
    () =>
      rows
        .filter((r) => r.status === "requested" || r.status === "confirmed")
        .slice()
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [rows],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, ConsultationBooking[]>();
    for (const row of active) {
      const key = manilaDayKey(row.startsAt);
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    }
    return map;
  }, [active]);

  const dayRows = byDay.get(dateIso) ?? [];
  const unpaidCount = active.filter((r) => r.paymentStatus === "pending").length;
  const toConfirm = active.filter((r) => r.status === "requested").length;
  const confirmedCount = active.filter((r) => r.status === "confirmed").length;

  const cells = monthGrid(cursor.year, cursor.month);
  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  async function setStatus(id: string, status: "confirmed" | "cancelled") {
    setError("");
    setBusyId(id);
    try {
      await updateConsultationStatus(id, status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update booking.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Consultation</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
        Your meeting <span className="italic text-slate-400">calendar.</span>
      </h1>
      <p className="mt-3 max-w-xl text-slate-600">
        See who booked which hour. Confirm or cancel requests — clients book themselves on the public calendar or in
        their portal.
      </p>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
        <span>
          <span className="font-semibold text-black">{active.length}</span> upcoming
        </span>
        <span>
          <span className="font-semibold text-black">{toConfirm}</span> to confirm
        </span>
        <span>
          <span className="font-semibold text-black">{confirmedCount}</span> confirmed
        </span>
        <span>
          <span className="font-semibold text-black">{unpaidCount}</span> unpaid
        </span>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

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
              const count = byDay.get(day)?.length ?? 0;
              const selected = dateIso === day;
              const isToday = day === todayIso;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setDateIso(day)}
                  className={`min-h-12 sm:min-h-0 aspect-square rounded-2xl text-sm font-medium flex flex-col items-center justify-center gap-0.5 ${
                    selected
                      ? "bg-black text-white"
                      : weekend
                        ? "text-slate-300"
                        : count > 0
                          ? "bg-black/[0.06] hover:bg-black/10"
                          : "hover:bg-black/5 text-slate-700"
                  } ${isToday && !selected ? "ring-1 ring-black/25" : ""}`}
                >
                  <span>{Number(day.slice(-2))}</span>
                  {count > 0 ? (
                    <span className={`text-[10px] font-semibold ${selected ? "text-white/80" : "text-slate-500"}`}>
                      {count} mtg{count === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {dateIso ? `Meetings · ${dateIso}` : "Pick a day"}
          </p>
          <div className="mt-3 divide-y divide-black/10 border-y border-black/10">
            {dayRows.length === 0 && (
              <p className="py-6 text-sm text-slate-500">No meetings this day.</p>
            )}
            {dayRows.map((row) => (
              <div key={row.id} className="py-4">
                <p className="font-semibold">{formatConsultWhen(row.startsAt)}</p>
                <p className="mt-0.5 text-sm text-slate-700">
                  {row.clientName || "Client"}
                  {row.company ? ` · ${row.company}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {row.clientEmail} · {row.hours} hr{row.hours === 1 ? "" : "s"} · {row.status}
                  {paymentLabel(row) ? ` · ${paymentLabel(row)}` : ""}
                  {row.amountPhp != null ? ` · ₱${row.amountPhp.toLocaleString("en-US")}` : ""}
                </p>
                {row.notes ? <p className="mt-2 text-sm text-slate-600">{row.notes}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadIcs("casinworks-consultation.ics", consultationIcs(row))}
                    className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold"
                  >
                    Save to calendar
                  </button>
                  <a
                    href={googleCalendarUrl(row)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold"
                  >
                    Google
                  </a>
                  {row.status === "requested" && (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void setStatus(row.id, "confirmed")}
                      className="rounded-full bg-black text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  )}
                  {row.status !== "cancelled" && (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void setStatus(row.id, "cancelled")}
                      className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="font-serif text-2xl font-semibold">All upcoming</h2>
        <div className="mt-4 divide-y divide-black/10 border-y border-black/10">
          {active.length === 0 && <p className="py-6 text-slate-500">No active consultations.</p>}
          {active.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                setDateIso(manilaDayKey(row.startsAt));
                const d = new Date(row.startsAt);
                const parts = d
                  .toLocaleDateString("en-CA", { timeZone: CONSULT_TZ })
                  .split("-")
                  .map(Number);
                setCursor({ year: parts[0], month: parts[1] - 1 });
              }}
              className="w-full py-4 flex flex-wrap items-start justify-between gap-3 text-left hover:bg-black/[0.02]"
            >
              <div>
                <div className="font-semibold">{formatConsultWhen(row.startsAt)}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {row.clientName}
                  {row.company ? ` · ${row.company}` : ""} · {row.clientEmail} · {row.hours} hr
                  {row.hours === 1 ? "" : "s"} · {row.status}
                  {paymentLabel(row) ? ` · ${paymentLabel(row)}` : ""}
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500">View day →</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Client: book + pay for their own exploratory consultation. */
function ClientBookConsultation() {
  usePageMeta({
    title: `Book a consultation — Portal | ${SITE.name}`,
    path: "/portal/book",
    noIndex: true,
  });
  const { profile, firebaseUser } = usePortalAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const todayIso = manilaDateIso();
  const todayParts = todayIso.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: todayParts[0], month: todayParts[1] - 1 });
  const [dateIso, setDateIso] = useState("");
  const [hour, setHour] = useState<number | null>(null);
  const [hours, setHours] = useState(1);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ConsultationBooking[]>([]);
  const [busySlots, setBusySlots] = useState<{ startsAt: string; hours: number }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [justBooked, setJustBooked] = useState<ConsultationBooking | null>(null);
  const [payNotice, setPayNotice] = useState("");

  useEffect(() => listenConsultations(setRows, setError), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/book-availability", { headers: { Accept: "application/json" } })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          busy?: { startsAt: string; hours: number }[];
        } | null;
        if (!cancelled && json?.ok && Array.isArray(json.busy)) setBusySlots(json.busy);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const paid = searchParams.get("paid");
    if (paid !== "1" && paid !== "0") return;
    const consultationId = (searchParams.get("c") ?? "").trim();

    if (paid === "1") {
      const q = new URLSearchParams();
      q.set("paid", "1");
      if (consultationId) q.set("c", consultationId);
      q.set("from", "portal");
      window.location.replace(`/book/confirmed?${q.toString()}`);
      return;
    }

    setPayNotice(
      "Payment was cancelled. Your slot is still held — tap Pay to finish, or cancel the request.",
    );
    const next = new URLSearchParams(searchParams);
    next.delete("paid");
    next.delete("c");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const live = useMemo(() => {
    if (busySlots.length > 0) {
      return busySlots.map((b, i) => ({
        id: `busy-${i}`,
        clientUid: "",
        clientEmail: "",
        clientName: "",
        startsAt: b.startsAt,
        hours: b.hours,
        status: "requested" as const,
      }));
    }
    return activeBookings(rows);
  }, [rows, busySlots]);

  const mine = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            r.clientUid === profile?.uid ||
            (!!profile?.email && r.clientEmail?.toLowerCase() === profile.email.toLowerCase()),
        )
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [rows, profile?.uid, profile?.email],
  );

  const cells = monthGrid(cursor.year, cursor.month);
  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const feePhp = hours * SITE.exploratoryConsultationHourlyRatePhp;

  function takenOn(day: string, startHour: number, duration: number) {
    const start = slotStart(day, startHour).toISOString();
    return live.some((b) => slotsOverlap(start, duration, b.startsAt, b.hours));
  }

  const openHours = dateIso
    ? SLOT_HOURS.filter(
        (h) => durationFits(h, hours) && !isPastSlot(dateIso, h) && !takenOn(dateIso, h, hours),
      )
    : [];

  async function payForConsultation(consultationId: string, bookingHours: number) {
    const idToken = await firebaseUser?.getIdToken();
    if (!idToken) throw new Error("Sign in again to pay.");
    const checkout = await startConsultationCheckout({
      consultationId,
      hours: bookingHours,
      idToken,
    });
    window.location.assign(checkout.checkoutUrl);
  }

  async function requestSlot() {
    if (!profile || !dateIso || hour == null) return;
    setError("");
    setPayNotice("");
    setBusy(true);
    try {
      const startsAt = slotStart(dateIso, hour).toISOString();
      if (takenOn(dateIso, hour, hours)) throw new Error("That slot was just taken. Pick another time.");
      const id = await createConsultation({
        clientUid: profile.uid,
        clientEmail: profile.email,
        clientName: profile.displayName || profile.email,
        company: profile.company,
        startsAt,
        hours,
        notes,
        amountPhp: feePhp,
      });
      const booked: ConsultationBooking = {
        id,
        clientUid: profile.uid,
        clientEmail: profile.email,
        clientName: profile.displayName || profile.email,
        company: profile.company,
        startsAt,
        hours,
        notes: notes.trim() || undefined,
        status: "requested",
        paymentStatus: "pending",
        amountPhp: feePhp,
      };
      setJustBooked(booked);
      setHour(null);
      setNotes("");
      await payForConsultation(id, hours);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not book that slot.");
      setBusy(false);
    }
  }

  async function resumePay(row: ConsultationBooking) {
    setError("");
    setBusy(true);
    try {
      await payForConsultation(row.id, row.hours);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment.");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Consultation</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
        Book an hour, <span className="italic text-slate-400">on the calendar.</span>
      </h1>
      <p className="mt-3 max-w-xl text-slate-600">
        Exploratory consultation is ₱{SITE.exploratoryConsultationHourlyRatePhp.toLocaleString("en-US")} per hour.
        Weekdays, Manila time. Morning 9–11, afternoon 1–4. You’ll pay securely with PayMongo, then CasinWorks confirms
        the slot.
      </p>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {payNotice && <p className="mt-4 text-sm text-slate-700">{payNotice}</p>}

      {justBooked && (
        <div className="mt-8 border border-black/10 bg-white px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Requested</p>
          <p className="mt-1 font-serif text-2xl font-semibold">{formatConsultWhen(justBooked.startsAt)}</p>
          <p className="mt-1 text-sm text-slate-600">
            {justBooked.hours} hour{justBooked.hours === 1 ? "" : "s"} · ₱
            {(justBooked.amountPhp ?? feePhp).toLocaleString("en-US")} · redirecting to PayMongo…
          </p>
        </div>
      )}

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
                    setJustBooked(null);
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

        <div className="lg:col-span-5">
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
          <p className="mt-2 text-sm text-slate-600">Estimated fee: ₱{feePhp.toLocaleString("en-US")}</p>

          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {dateIso ? `Times · ${dateIso}` : "Pick a weekday"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 min-h-[2.5rem]">
            {!dateIso && <p className="text-sm text-slate-500 lg:hidden">Select a date on the calendar.</p>}
            {!dateIso && <p className="text-sm text-slate-500 hidden lg:block">Select a date on the left.</p>}
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

          <label className="mt-6 block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What you want to cover"
              className="mt-2 w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm"
            />
          </label>

          <button
            type="button"
            disabled={busy || hour == null || !dateIso}
            onClick={() => void requestSlot()}
            className="mt-5 rounded-full bg-black text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Starting payment…" : `Pay ₱${feePhp.toLocaleString("en-US")} & request`}
          </button>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="font-serif text-2xl font-semibold">Your bookings</h2>
        <div className="mt-4 divide-y divide-black/10 border-y border-black/10">
          {mine.length === 0 && <p className="py-6 text-slate-500">Nothing booked yet.</p>}
          {mine.map((row) => (
            <div key={row.id} className="py-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{formatConsultWhen(row.startsAt)}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {row.hours} hr{row.hours === 1 ? "" : "s"} · {row.status}
                  {paymentLabel(row) ? ` · ${paymentLabel(row)}` : ""}
                  {row.amountPhp != null ? ` · ₱${row.amountPhp.toLocaleString("en-US")}` : ""}
                </div>
                {row.notes && <p className="mt-1 text-sm text-slate-600">{row.notes}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {row.status !== "cancelled" && (
                  <>
                    <button
                      type="button"
                      onClick={() => downloadIcs("casinworks-consultation.ics", consultationIcs(row))}
                      className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-semibold"
                    >
                      Save to calendar
                    </button>
                    <a
                      href={googleCalendarUrl(row)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-semibold"
                    >
                      Google
                    </a>
                  </>
                )}
                {row.status === "requested" && row.paymentStatus === "pending" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void resumePay(row)}
                    className="rounded-full bg-black text-white px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    Pay
                  </button>
                )}
                {row.status === "requested" && (
                  <button
                    type="button"
                    onClick={() => void updateConsultationStatus(row.id, "cancelled")}
                    className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
