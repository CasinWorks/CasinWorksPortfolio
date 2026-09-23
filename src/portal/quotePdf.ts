import { jsPDF } from "jspdf";
import { formatPesoPdf, formatQuoteDate, scopeTotal } from "./quote";
import type { Quotation } from "./types";

const BLUE: [number, number, number] = [37, 99, 235];
const INK: [number, number, number] = [17, 17, 17];
const MUTED: [number, number, number] = [120, 116, 109];
const RULE: [number, number, number] = [220, 218, 212];
const WASH: [number, number, number] = [245, 244, 241];
const HEADER: [number, number, number] = [23, 23, 23];

/** Helvetica/WinAnsi cannot draw ₱ — it blows up the whole line (spaced letters, ±, clipped). */
export function pdfSafeText(value: string) {
  let out = "";
  for (const ch of String(value ?? "")) {
    const c = ch.codePointAt(0) ?? 0;
    if (c === 0x20b1 || ch === "₱") {
      out += "PHP ";
      continue;
    }
    if (c === 0x00d7) {
      out += "x";
      continue;
    }
    if (c === 0x2013 || c === 0x2014 || c === 0x2212) {
      out += "-";
      continue;
    }
    if (c === 0x2022) {
      out += "-";
      continue;
    }
    if (c === 0x00a0) {
      out += " ";
      continue;
    }
    if (c === 0x2026) {
      out += "...";
      continue;
    }
    // Strip UTF-16 null padding / other control chars that show as gaps between letters.
    if (c === 0 || (c < 32 && c !== 9 && c !== 10 && c !== 13)) continue;
    // Keep printable ASCII + common Latin-1; drop everything else.
    if (c >= 0x20 && c <= 0x7e) {
      out += ch;
      continue;
    }
    if (c >= 0xa0 && c <= 0xff && c !== 0xb1) {
      // Skip ± (often a mangled ₱); keep other Latin-1.
      out += ch;
      continue;
    }
  }
  return out.replace(/[ \t]{2,}/g, " ").trim();
}

export async function quotationPdfBlob(quote: Quotation): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 18;

  const ensure = (need: number) => {
    if (y + need < 280) return;
    doc.addPage();
    y = 18;
  };

  const label = (text: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(pdfSafeText(text).toUpperCase(), margin, y);
    y += 6;
  };

  const write = (text: string | string[], x: number, yy: number, options?: Parameters<jsPDF["text"]>[3]) => {
    if (Array.isArray(text)) {
      doc.text(text.map(pdfSafeText), x, yy, options);
    } else {
      doc.text(pdfSafeText(text), x, yy, options);
    }
  };

  const wrap = (text: string, width: number) => doc.splitTextToSize(pdfSafeText(text), width) as string[];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  write("QUOTATION", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  const metaX = pageW - margin;
  write(`Quote no.  ${quote.quoteNumber}`, metaX, y, { align: "right" });
  y += 5;
  doc.setTextColor(...MUTED);
  write(`Issue date  ${formatQuoteDate(quote.issueDate)}`, metaX, y, { align: "right" });
  y += 5;
  write(
    `Valid until  ${formatQuoteDate(quote.validUntil)}  ·  Validity: ${quote.validityDays} days`,
    metaX,
    y,
    { align: "right" },
  );

  y = 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  write(quote.issuerName, margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  write(`${quote.issuerEmail}  ·  ${quote.issuerPhone}`, margin, y);
  y += 8;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  label("Bill to");
  const bill = [
    quote.billTo.company,
    quote.billTo.contact,
    quote.billTo.address,
    [quote.billTo.email, quote.billTo.phone].filter(Boolean).join("  ·  "),
  ].filter(Boolean);
  const billLines = bill.flatMap((line) => wrap(line, contentW - 10));
  const billH = 8 + billLines.length * 5.2;
  doc.setFillColor(...WASH);
  doc.roundedRect(margin, y, contentW, billH, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  let by = y + 7;
  billLines.forEach((line, i) => {
    doc.setFont("helvetica", i === 0 ? "bold" : "normal");
    doc.setFontSize(i === 0 ? 11 : 9);
    doc.setTextColor(...(i === 0 ? INK : MUTED));
    write(line, margin + 5, by);
    by += 5.2;
  });
  y += billH + 10;

  label("Scope of work");
  drawTableHeader(doc, margin, y, contentW, [
    { label: "DESCRIPTION", w: contentW * 0.28 },
    { label: "DETAILS", w: contentW * 0.48 },
    { label: "AMOUNT", w: contentW * 0.24, align: "right" },
  ]);
  y += 9;
  for (const row of quote.scope) {
    const desc = wrap(row.description || "-", contentW * 0.26);
    const details = wrap(row.details || "-", contentW * 0.46);
    const h = Math.max(8, Math.max(desc.length, details.length) * 5 + 4);
    ensure(h + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    write(desc, margin + 2, y + 5);
    write(details, margin + contentW * 0.28 + 2, y + 5);
    doc.setFont("helvetica", "bold");
    write(formatPesoPdf(row.amount), margin + contentW - 2, y + 5, { align: "right" });
    y += h;
    doc.setDrawColor(...RULE);
    doc.line(margin, y, pageW - margin, y);
  }
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  write("TOTAL CONTRACT VALUE", margin, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  write(formatPesoPdf(scopeTotal(quote.scope)), pageW - margin, y, { align: "right" });
  y += 12;

  ensure(40);
  label("Payment schedule (milestones)");
  drawTableHeader(
    doc,
    margin,
    y,
    contentW,
    [
      { label: "MILESTONE", w: contentW * 0.58 },
      { label: "%", w: contentW * 0.14, align: "right" },
      { label: "AMOUNT", w: contentW * 0.28, align: "right" },
    ],
    WASH,
    INK,
  );
  y += 9;
  for (const row of quote.milestones) {
    ensure(10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const title = wrap(row.title, contentW * 0.56);
    write(title, margin + 2, y + 4);
    write(`${row.percent.toFixed(2)}%`, margin + contentW * 0.72 - 2, y + 4, { align: "right" });
    doc.setFont("helvetica", "bold");
    write(formatPesoPdf(row.amount), margin + contentW - 2, y + 4, { align: "right" });
    y += Math.max(9, title.length * 5 + 3);
    doc.setDrawColor(...RULE);
    doc.line(margin, y, pageW - margin, y);
  }
  y += 12;

  ensure(36);
  label("Payment instructions");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const note = wrap(quote.paymentNote, contentW);
  write(note, margin, y);
  y += note.length * 4.5 + 3;
  const payLines = [
    `Bank: ${quote.bankName}`,
    `Account name: ${quote.accountName}`,
    `Account no.: ${quote.accountNumber}`,
  ];
  const payH = 8 + payLines.length * 5.4;
  ensure(payH + 8);
  doc.setFillColor(...WASH);
  doc.roundedRect(margin, y, contentW, payH, 2, 2, "F");
  let py = y + 7;
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  for (const line of payLines) {
    write(line, margin + 5, py);
    py += 5.4;
  }
  y += payH + 12;

  ensure(20);
  const total = scopeTotal(quote.scope);
  const totals = [
    ["Contract total", formatPesoPdf(total), false],
    ["Withholding tax", quote.withholdingTax, true],
    ["Net amount", formatPesoPdf(total), false],
  ] as const;
  for (const [k, v, italic] of totals) {
    doc.setFont("helvetica", italic ? "italic" : "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    write(k, pageW - margin - 70, y);
    doc.setFont("helvetica", k === "Net amount" ? "bold" : italic ? "italic" : "normal");
    doc.setTextColor(...INK);
    doc.setFontSize(k === "Net amount" ? 12 : 9.5);
    write(v, pageW - margin, y, { align: "right" });
    y += k === "Net amount" ? 8 : 6;
  }
  y += 8;

  ensure(28);
  label("Terms & conditions");
  quote.terms.forEach((term, i) => {
    const lines = wrap(`${i + 1}.  ${term}`, contentW);
    ensure(lines.length * 4.6 + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    write(lines, margin, y);
    y += lines.length * 4.6 + 2;
  });

  y += 10;
  ensure(8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  write(`Prepared by ${quote.issuerName}`, margin, y);

  return doc.output("blob");
}

function drawTableHeader(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  cols: { label: string; w: number; align?: "left" | "right" }[],
  fill: [number, number, number] = HEADER,
  color: [number, number, number] = [255, 255, 255],
) {
  doc.setFillColor(...fill);
  doc.rect(x, y, width, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...color);
  let cx = x;
  for (const col of cols) {
    const tx = col.align === "right" ? cx + col.w - 2 : cx + 2;
    doc.text(col.label, tx, y + 5.3, col.align === "right" ? { align: "right" } : undefined);
    cx += col.w;
  }
}
