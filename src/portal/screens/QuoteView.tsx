import { ArrowLeft, Download } from "lucide-react";
import { formatPeso, formatQuoteDate, scopeTotal } from "../quote";
import type { Project, Quotation } from "../types";

export function QuoteView({
  project,
  quote,
  fileUrl,
  onBack,
}: {
  project: Project;
  quote: Quotation;
  fileUrl?: string;
  onBack: () => void;
}) {
  const total = scopeTotal(quote.scope);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <ArrowLeft className="size-4" aria-hidden /> Documents
        </button>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-black text-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
          >
            Download PDF
            <Download className="size-3.5" aria-hidden />
          </a>
        )}
      </div>
      <p className="mt-6 text-[13px] text-slate-500">{project.name}</p>

      <article className="mt-4 max-w-3xl bg-white border border-black/10 px-4 py-6 sm:px-10 sm:py-8 text-[#111]">
        <div className="flex flex-wrap justify-between gap-4">
          <p className="text-[11px] font-bold tracking-[0.14em] text-blue-600">QUOTATION</p>
          <div className="text-right text-[13px] space-y-1">
            <p>
              Quote no. <span className="font-semibold">{quote.quoteNumber}</span>
            </p>
            <p className="text-slate-500">Issue date {formatQuoteDate(quote.issueDate)}</p>
            <p className="text-slate-500">
              Valid until {formatQuoteDate(quote.validUntil)} · Validity: {quote.validityDays} days
            </p>
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{quote.issuerName}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {quote.issuerEmail} · {quote.issuerPhone}
        </p>
        <hr className="mt-6 border-black/10" />

        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Bill to</p>
        <div className="mt-2 rounded-lg bg-[#f5f4f1] px-4 py-4 text-sm">
          <p className="font-semibold">{quote.billTo.company}</p>
          {quote.billTo.contact && <p className="mt-1">{quote.billTo.contact}</p>}
          {quote.billTo.address && <p className="mt-1 text-slate-600">{quote.billTo.address}</p>}
          <p className="mt-1 text-slate-600">
            {[quote.billTo.email, quote.billTo.phone].filter(Boolean).join(" · ")}
          </p>
        </div>

        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Scope of work</p>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="bg-[#171717] text-white text-[11px] uppercase tracking-wider">
              <th className="text-left font-medium px-3 py-2">Description</th>
              <th className="text-left font-medium px-3 py-2">Details</th>
              <th className="text-right font-medium px-3 py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.scope.map((row) => (
              <tr key={row.id} className="border-b border-black/10">
                <td className="px-3 py-3 align-top">{row.description}</td>
                <td className="px-3 py-3 align-top text-slate-600">{row.details}</td>
                <td className="px-3 py-3 align-top text-right font-medium tabular-nums">{formatPeso(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-baseline justify-between text-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500">Total contract value</span>
          <span className="text-lg font-semibold tabular-nums">{formatPeso(total)}</span>
        </div>

        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Payment schedule (milestones)</p>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="bg-[#f5f4f1] text-[11px] uppercase tracking-wider text-slate-600">
              <th className="text-left font-medium px-3 py-2">Milestone</th>
              <th className="text-right font-medium px-3 py-2">%</th>
              <th className="text-right font-medium px-3 py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.milestones.map((row) => (
              <tr key={row.id} className="border-b border-black/10">
                <td className="px-3 py-3">{row.title}</td>
                <td className="px-3 py-3 text-right tabular-nums">{row.percent.toFixed(2)}%</td>
                <td className="px-3 py-3 text-right font-medium tabular-nums">{formatPeso(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Payment instructions</p>
        <p className="mt-2 text-sm text-slate-600">{quote.paymentNote}</p>
        <div className="mt-2 rounded-lg bg-[#f5f4f1] px-4 py-4 text-sm space-y-1">
          <p>Bank: {quote.bankName}</p>
          <p>Account name: {quote.accountName}</p>
          <p>Account no.: {quote.accountNumber}</p>
        </div>

        <dl className="mt-8 ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-slate-500">Contract total</dt>
            <dd className="tabular-nums">{formatPeso(total)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-slate-500">Withholding tax</dt>
            <dd className="italic">{quote.withholdingTax}</dd>
          </div>
          <div className="flex justify-between gap-6 font-semibold">
            <dt>Net amount</dt>
            <dd className="tabular-nums">{formatPeso(total)}</dd>
          </div>
        </dl>

        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Terms & conditions</p>
        <ol className="mt-2 list-decimal pl-5 space-y-2 text-sm text-slate-700">
          {quote.terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ol>
        <p className="mt-8 text-xs text-slate-400">Prepared by {quote.issuerName}</p>
      </article>
    </div>
  );
}
