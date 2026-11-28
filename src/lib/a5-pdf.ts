import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import QRCode from "qrcode";
import { paymentLabel, upiPayLink, type A5BillInput, type BillTone } from "./a5-bill";
import { rupeesInWords } from "./money-words";
import { ADDRESS_LINE, PHONE_DISPLAY, REVIEW_URL, SHOP_NAME, SITE } from "./shop";
import { formatIST } from "./time";

const A5: [number, number] = [419.53, 595.28];
const NAVY = rgb(21 / 255, 58 / 255, 122 / 255);
const INK = rgb(0.07, 0.07, 0.07);
const MUTED = rgb(0.28, 0.28, 0.28);

export function billPdfName(billNo: number, tone: BillTone = "colour"): string {
  return tone === "bw" ? `PencilBox-Bill-${billNo}-BW.pdf` : `PencilBox-Bill-${billNo}.pdf`;
}

const rs = (paise: number) =>
  `Rs ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** Helvetica only covers WinAnsi. Strip anything else (the rupee sign becomes Rs). */
function ascii(value: string): string {
  return value
    .replace(/₹/g, "Rs ")
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

async function pngBytes(text: string): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(text, { margin: 1, width: 280, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } });
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function wrap(text: string, font: PDFFont, size: number, max: number): string[] {
  const words = ascii(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= max) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

/** A5 cash memo as a real PDF. No GSTIN and no tax lines. */
export async function buildA5Pdf(bill: A5BillInput, upiId = "", tone: BillTone = "colour"): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Bill ${bill.billNo}`);
  doc.setAuthor(SHOP_NAME);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const review = await doc.embedPng(await pngBytes(REVIEW_URL));
  const upi = upiId.trim();
  const upiImage = upi ? await doc.embedPng(await pngBytes(upiPayLink(upi, bill.total, bill.billNo))) : null;

  let page = doc.addPage(A5);
  const width = A5[0];
  const height = A5[1];
  const left = 28;
  const right = width - 28;
  let y = height - 36;

  const newPage = () => {
    page = doc.addPage(A5);
    y = height - 36;
  };
  const need = (space: number) => {
    if (y < 36 + space) newPage();
  };
  const text = (value: string, x: number, size: number, opts?: { font?: PDFFont; color?: ReturnType<typeof rgb> }) => {
    const safe = ascii(value);
    if (!safe) return;
    page.drawText(safe, { x, y, size, font: opts?.font ?? font, color: opts?.color ?? INK });
  };

  const ink = tone === "bw" ? INK : NAVY;
  const rule = tone === "bw" ? INK : NAVY;
  if (tone !== "bw") page.drawRectangle({ x: 0, y: height - 10, width, height: 10, color: rgb(236 / 255, 194 / 255, 51 / 255) });
  text("Bill", left, 22, { font: bold, color: ink });
  y -= 16;
  text("CASH MEMO", left, 10, { font: bold, color: ink });
  y -= 16;
  text(SHOP_NAME, left, 11, { font: bold });
  y -= 13;
  for (const line of [ADDRESS_LINE, `${PHONE_DISPLAY}  ·  ${SITE.replace(/^https:\/\//, "")}`]) {
    text(line, left, 9, { color: MUTED });
    y -= 12;
  }
  y -= 4;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: tone === "bw" ? 0.8 : 1.5, color: rule });
  y -= 16;
  text(`No. ${bill.billNo}`, left, 11, { font: bold });
  const when = ascii(formatIST(bill.at));
  text(when, right - font.widthOfTextAtSize(when, 10), 10, { color: MUTED });
  y -= 14;
  const who = [bill.customerName?.trim(), bill.customerPhone?.trim()].filter(Boolean).join(" · ");
  if (who) {
    text(who, left, 10);
    y -= 14;
  }
  y -= 4;

  const colQty = 250;
  const colRate = 300;
  const colAmt = right;
  const drawHead = () => {
    need(18);
    text("ITEM", left, 8, { font: bold, color: MUTED });
    text("QTY", colQty, 8, { font: bold, color: MUTED });
    text("RATE", colRate, 8, { font: bold, color: MUTED });
    const amt = "AMOUNT";
    text(amt, colAmt - bold.widthOfTextAtSize(amt, 8), 8, { font: bold, color: MUTED });
    y -= 6;
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.6, color: rgb(0.75, 0.75, 0.75) });
    y -= 14;
  };
  drawHead();

  for (const item of bill.items) {
    const lines = wrap(item.name, font, 10, 200);
    need(lines.length * 12 + (item.freeUnits ? 12 : 0) + 6);
    lines.forEach((line, i) => {
      text(line, left, 10);
      if (i === 0) {
        text(String(item.qty), colQty, 10);
        const rate = ascii(rs(item.unitPrice));
        const amount = ascii(rs(item.lineTotal));
        text(rate, colRate, 10);
        text(amount, colAmt - font.widthOfTextAtSize(amount, 10), 10);
      }
      y -= 12;
    });
    if (item.freeUnits) {
      text(`${item.freeUnits} free`, left, 8, { color: MUTED });
      y -= 11;
    }
    y -= 2;
  }

  y -= 4;
  need(78);
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.6, color: rgb(0.75, 0.75, 0.75) });
  y -= 16;
  const row = (label: string, value: string, strong = false) => {
    const face = strong ? bold : font;
    const size = strong ? 13 : 10;
    const shown = ascii(value);
    text(label, left, size, { font: face });
    text(shown, right - face.widthOfTextAtSize(shown, size), size, { font: face });
    y -= strong ? 18 : 14;
  };
  row("Subtotal", rs(bill.subtotal));
  if (bill.discount > 0) row("Discount", `- ${rs(bill.discount)}`);
  row("Total", rs(bill.total), true);
  row("Paid by", paymentLabel(bill.payments));
  const words = wrap(rupeesInWords(bill.total), font, 10, right - left);
  for (const line of words) {
    need(14);
    text(line, left, 10);
    y -= 13;
  }

  const qrSize = 78;
  const qrBlock = 78 + 28 + (upiImage ? 0 : 0);
  need(qrBlock + 36);
  y -= 10;
  text("Thank you! Visit again", left, 13, { font: bold });
  y -= 16;
  const drawQr = (image: PDFImage, caption: string, x: number) => {
    page.drawImage(image, { x, y: y - qrSize, width: qrSize, height: qrSize });
    const cap = ascii(caption).slice(0, 28);
    if (cap) page.drawText(cap, { x, y: y - qrSize - 12, size: 8, font, color: MUTED });
  };
  let qx = right - qrSize;
  drawQr(review, "Review us on Google", qx);
  if (upiImage) {
    qx -= qrSize + 12;
    drawQr(upiImage, upi, qx);
  }

  return doc.save();
}
