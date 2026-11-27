import { rupeesInWords } from "./money-words";
import { ADDRESS_LINE, PHONE_DISPLAY, REVIEW_URL, SHOP_NAME, SITE } from "./shop";
import { formatIST } from "./time";

/**
 * A simple cash memo. The shop is not GST registered: no GSTIN, no tax lines,
 * and the title is never "Tax Invoice". The setting key `bill.gstin` is unused.
 */
export interface A5Line {
  name: string;
  qty: number;
  freeUnits?: number;
  unitPrice: number;
  lineTotal: number;
}

export interface A5BillInput {
  billNo: number;
  at: string;
  customerName?: string;
  customerPhone?: string;
  items: A5Line[];
  subtotal: number;
  discount: number;
  total: number;
  payments: { cash: number; upi: number; card?: number };
}

export function paymentLabel(payments: { cash: number; upi: number; card?: number }): string {
  const parts = [
    payments.cash > 0 ? "Cash" : "",
    payments.upi > 0 ? "UPI" : "",
    (payments.card ?? 0) > 0 ? "Card" : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" + ") : "Cash";
}

/** UPI deep link. Only call this when the owner has saved a real UPI ID. */
export function upiPayLink(upiId: string, totalPaise: number, billNo: number): string {
  const params = new URLSearchParams({
    pa: upiId.trim(),
    pn: SHOP_NAME,
    am: (totalPaise / 100).toFixed(2),
    cu: "INR",
    tn: `Bill ${billNo}`,
  });
  return `upi://pay?${params.toString()}`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const rs = (paise: number) => (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 });

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#153a7a"/><rect x="16" y="30" width="32" height="22" rx="4" fill="#ecc233"/><rect x="20" y="14" width="6" height="22" rx="2" fill="#e23b3b"/><rect x="29" y="10" width="6" height="26" rx="2" fill="#2f6fed"/><rect x="38" y="16" width="6" height="20" rx="2" fill="#1f9d55"/></svg>`;

export function a5BillHtml(bill: A5BillInput, opts: { reviewQr: string; upiQr?: string; upiId?: string }): string {
  const rows = bill.items
    .map(
      (i) => `<tr>
        <td>${esc(i.name)}${i.freeUnits ? `<div class="muted">${i.freeUnits} free</div>` : ""}</td>
        <td class="n">${i.qty}</td>
        <td class="n">${rs(i.unitPrice)}</td>
        <td class="n">${rs(i.lineTotal)}</td>
      </tr>`,
    )
    .join("");
  const who = [bill.customerName?.trim(), bill.customerPhone?.trim()].filter(Boolean).join(" · ");
  const upiBlock =
    opts.upiQr && opts.upiId
      ? `<div class="qr"><img src="${opts.upiQr}" alt="UPI payment QR" width="108" height="108"><div>Pay ${esc(opts.upiId)}</div></div>`
      : "";
  const site = SITE.replace(/^https:\/\//, "");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Bill ${bill.billNo}</title>
<style>
  @page { size: A5 portrait; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; color: #111; }
  body { font: 12px/1.35 "Segoe UI", system-ui, sans-serif; }
  .sheet { width: 148mm; min-height: 194mm; margin: 0 auto; padding: 8mm; }
  header { display: flex; gap: 10px; align-items: center; border-bottom: 3px solid #153a7a; padding-bottom: 8px; }
  h1 { font-size: 22px; line-height: 1; margin: 0; letter-spacing: 0.04em; }
  .kind { margin: 2px 0 0; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #153a7a; font-weight: 700; }
  .shop { font-size: 11px; margin: 2px 0; }
  .meta { display: flex; justify-content: space-between; gap: 12px; margin: 10px 0; }
  .meta p { margin: 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 4px 0; vertical-align: top; border-bottom: 1px solid #ddd; }
  th { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: #333; }
  .n { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .muted { color: #444; font-size: 10px; }
  .totals { margin-top: 8px; width: 100%; }
  .totals td { border: 0; padding: 2px 0; }
  .grand td { font-size: 16px; font-weight: 800; border-top: 2px solid #111; padding-top: 6px; }
  .words { margin: 8px 0 0; font-size: 12px; }
  footer { margin-top: 16px; display: flex; justify-content: space-between; gap: 12px; align-items: flex-end; }
  .thanks { font-size: 14px; font-weight: 700; margin: 0 0 4px; }
  .qr { text-align: center; font-size: 10px; }
  .qr img { display: block; margin: 0 auto 2px; }
  @media print { .sheet { width: auto; min-height: auto; padding: 0; } }
</style></head><body><article class="sheet">
<header>${MARK}<div>
  <h1>Bill</h1>
  <p class="kind">Cash Memo</p>
  <p class="shop"><strong>${esc(SHOP_NAME)}</strong><br>${esc(ADDRESS_LINE)}<br>${esc(PHONE_DISPLAY)} · ${esc(site)}</p>
</div></header>
<div class="meta">
  <div><p><strong>No. ${bill.billNo}</strong></p>${who ? `<p>${esc(who)}</p>` : ""}</div>
  <p>${esc(formatIST(bill.at))}</p>
</div>
<table>
  <thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Rate</th><th class="n">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<table class="totals">
  <tr><td>Subtotal</td><td class="n">₹${rs(bill.subtotal)}</td></tr>
  ${bill.discount > 0 ? `<tr><td>Discount</td><td class="n">−₹${rs(bill.discount)}</td></tr>` : ""}
  <tr class="grand"><td>Total</td><td class="n">₹${rs(bill.total)}</td></tr>
  <tr><td>Paid by</td><td class="n">${esc(paymentLabel(bill.payments))}</td></tr>
</table>
<p class="words">${esc(rupeesInWords(bill.total))}</p>
<footer>
  <div>
    <p class="thanks">Thank you! Visit again</p>
    <p class="muted">Prices are as billed.</p>
  </div>
  <div style="display:flex;gap:12px">
    ${upiBlock}
    <div class="qr"><img src="${opts.reviewQr}" alt="Google review QR" width="108" height="108"><div>Review us on Google</div></div>
  </div>
</footer>
</article></body></html>`;
}

export { REVIEW_URL };
