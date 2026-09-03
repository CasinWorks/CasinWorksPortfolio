import { SITE } from "../site";

export const CONSULT_TZ = "Asia/Manila";
export const SLOT_HOURS = [9, 10, 11, 13, 14, 15, 16] as const;

export function manilaDateIso(d = new Date()) {
  return d.toLocaleDateString("en-CA", { timeZone: CONSULT_TZ });
}

export function slotStart(dateIso: string, hour: number) {
  return new Date(`${dateIso}T${String(hour).padStart(2, "0")}:00:00+08:00`);
}

export function slotEnd(dateIso: string, hour: number, hours: number) {
  return new Date(slotStart(dateIso, hour).getTime() + hours * 60 * 60 * 1000);
}

export function isWeekday(dateIso: string) {
  const day = slotStart(dateIso, 12).getUTCDay();
  return day >= 1 && day <= 5;
}

export function isPastSlot(dateIso: string, hour: number) {
  return slotStart(dateIso, hour).getTime() <= Date.now();
}

export function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const startPad = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatConsultWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: CONSULT_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function icsStamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function consultationIcs(input: { startsAt: string; hours: number; name?: string }) {
  const start = new Date(input.startsAt);
  const end = new Date(start.getTime() + input.hours * 60 * 60 * 1000);
  const summary = "CasinWorks consultation";
  const desc = `${input.hours} hour${input.hours === 1 ? "" : "s"} with ${SITE.fullName}.`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CasinWorks//Consultation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${desc.replace(/\n/g, "\\n")}`,
    `LOCATION:Video call — CasinWorks`,
    `ORGANIZER;CN=${SITE.fullName}:MAILTO:${SITE.email}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function googleCalendarUrl(input: { startsAt: string; hours: number }) {
  const start = new Date(input.startsAt);
  const end = new Date(start.getTime() + input.hours * 60 * 60 * 1000);
  const dates = `${icsStamp(start)}/${icsStamp(end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "CasinWorks consultation",
    dates,
    details: `${input.hours} hour${input.hours === 1 ? "" : "s"} with ${SITE.fullName}.`,
    location: "Video call — CasinWorks",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function slotsOverlap(aStart: string, aHours: number, bStart: string, bHours: number) {
  const a0 = new Date(aStart).getTime();
  const a1 = a0 + aHours * 60 * 60 * 1000;
  const b0 = new Date(bStart).getTime();
  const b1 = b0 + bHours * 60 * 60 * 1000;
  return a0 < b1 && b0 < a1;
}

export function durationFits(startHour: number, hours: number) {
  const needed: number[] = [];
  for (let i = 0; i < hours; i++) needed.push(startHour + i);
  return needed.every((h) => (SLOT_HOURS as readonly number[]).includes(h));
}

export function formatSlotHour(hour: number) {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:00 ${ampm}`;
}

export function manilaParts(iso: string) {
  const d = new Date(iso);
  return {
    dateIso: d.toLocaleDateString("en-CA", { timeZone: CONSULT_TZ }),
    hour: Number(d.toLocaleString("en-GB", { timeZone: CONSULT_TZ, hour: "2-digit", hour12: false })),
  };
}

export function activeBookings<T extends { status: string }>(rows: T[]) {
  return rows.filter((r) => r.status === "requested" || r.status === "confirmed");
}
