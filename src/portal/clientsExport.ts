import type { Client } from "./types";

/** Brevo contact-import columns + CasinWorks extras. EMAIL is required by Brevo. */
const HEADERS = [
  "EMAIL",
  "FIRSTNAME",
  "LASTNAME",
  "CONTACT_NAME",
  "COMPANY",
  "SMS",
  "ADDRESS",
  "NOTES",
  "PORTAL_LINKED",
  "CLIENT_ID",
] as const;

function splitName(contactName: string): { first: string; last: string } {
  const parts = contactName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function csvCell(value: string) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function clientsToBrevoCsv(clients: Client[]): string {
  const lines = [HEADERS.join(",")];
  for (const c of clients) {
    const email = c.email.trim().toLowerCase();
    if (!email) continue;
    const { first, last } = splitName(c.contactName);
    lines.push(
      [
        email,
        first,
        last,
        c.contactName.trim(),
        c.company.trim(),
        c.phone.trim(),
        c.address.trim(),
        (c.notes ?? "").trim(),
        c.authUid ? "yes" : "no",
        c.id,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadClientsBrevoCsv(clients: Client[]) {
  const withEmail = clients.filter((c) => c.email.trim());
  if (withEmail.length === 0) {
    throw new Error("No clients with an email to export.");
  }
  const csv = clientsToBrevoCsv(withEmail);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `casinworks-clients-brevo-${stamp}.csv`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return withEmail.length;
}
