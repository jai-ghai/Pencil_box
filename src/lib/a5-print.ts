"use client";

import QRCode from "qrcode";
import { a5BillHtml, upiPayLink, type A5BillInput, type BillTone } from "./a5-bill";
import { billPdfName, buildA5Pdf } from "./a5-pdf";
import { REVIEW_URL } from "./shop";

async function qr(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 280, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } });
}

async function loadUpiId(): Promise<string> {
  try {
    const res = await fetch("/api/admin/bill-profile");
    if (!res.ok) return "";
    const data = (await res.json()) as { upiId?: unknown };
    return typeof data.upiId === "string" ? data.upiId.trim() : "";
  } catch {
    return "";
  }
}

export async function renderA5Html(bill: A5BillInput, upiId = "", tone: BillTone = "colour"): Promise<string> {
  const reviewQr = await qr(REVIEW_URL);
  const id = upiId.trim();
  const upiQr = id ? await qr(upiPayLink(id, bill.total, bill.billNo)) : "";
  return a5BillHtml(bill, { reviewQr, upiQr, upiId: id, tone });
}

function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return frame.remove();
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 2000);
  }, 200);
}

/** Save a real PDF. A blob download works in Android Chrome. */
export function savePdfFile(bytes: Uint8Array, filename: string) {
  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function printA5Bill(bill: A5BillInput, tone: BillTone = "colour") {
  printHtml(await renderA5Html(bill, await loadUpiId(), tone));
}

export async function downloadA5Bill(bill: A5BillInput, tone: BillTone = "colour") {
  const bytes = await buildA5Pdf(bill, await loadUpiId(), tone);
  savePdfFile(bytes, billPdfName(bill.billNo, tone));
}

/** Share the PDF (WhatsApp appears in the Android share sheet). Downloads the file when sharing files is unavailable. */
export async function shareA5Bill(bill: A5BillInput, tone: BillTone = "colour") {
  const bytes = await buildA5Pdf(bill, await loadUpiId(), tone);
  const name = billPdfName(bill.billNo, tone);
  const file = new File([new Uint8Array(bytes)], name, { type: "application/pdf" });
  try {
    if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name, text: "Pencil Box Stationery bill" });
      return;
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
  }
  savePdfFile(bytes, name);
}
