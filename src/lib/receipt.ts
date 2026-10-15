import { formatIST } from "@/lib/time";

interface ReceiptBill {
  billNo: number;
  at: string;
  total: number;
  discount: number;
  payments: { cash: number; upi: number };
  items: { name: string; qty: number; freeUnits: number; lineTotal: number }[];
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const rs = (paise: number) => (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 });

/** HTML for an 80 mm thermal roll (also fine on 58 mm, it just wraps). No customer details are printed. */
export function receiptHtml(b: ReceiptBill): string {
  const mode = b.payments.upi > 0 && b.payments.cash > 0 ? "Cash + UPI" : b.payments.upi > 0 ? "UPI" : "Cash";
  const rows = b.items
    .map((i) => `<tr><td>${esc(i.name)}<br><small>${i.qty}${i.freeUnits > 0 ? ` (${i.freeUnits} free)` : ""} x</small></td><td class="r">${rs(i.lineTotal)}</td></tr>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Bill ${b.billNo}</title><style>
@page{size:80mm auto;margin:0}
body{font:12px/1.35 monospace;width:72mm;margin:0 auto;padding:4mm 0;color:#000}
h1{font-size:16px;text-align:center;margin:0}
p{margin:2px 0;text-align:center}
table{width:100%;border-collapse:collapse;margin-top:6px}
td{padding:2px 0;vertical-align:top}.r{text-align:right;white-space:nowrap}
hr{border:0;border-top:1px dashed #000;margin:6px 0}
.t td{font-size:14px;font-weight:bold}
</style></head><body>
<h1>Pencil Box</h1><p>Stationery, art and printing</p><hr>
<p>Bill #${b.billNo}</p><p>${esc(formatIST(b.at))}</p><hr>
<table>${rows}</table><hr>
<table class="t">${b.discount > 0 ? `<tr><td>Offers</td><td class="r">-${rs(b.discount)}</td></tr>` : ""}<tr><td>Total</td><td class="r">Rs ${rs(b.total)}</td></tr></table>
<p>Paid by ${mode}</p><hr><p>Thank you. Visit again.</p>
</body></html>`;
}

/** Prints through a hidden frame so no pop-up blocker gets in the way. */
export function printReceipt(b: ReceiptBill) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return frame.remove();
  doc.open();
  doc.write(receiptHtml(b));
  doc.close();
  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 2000);
  };
  setTimeout(go, 150);
}
