"use client";

/** Browser-only helpers for the QR generator: SVG to PNG, download, print. */

function sized(svg: string, width: number, height: number): string {
  return svg.replace("<svg ", `<svg width="${width}" height="${height}" `);
}

export function svgToPngBlob(svg: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([sized(svg, width, height)], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Could not make the image"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not make the PNG"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not draw the image"));
    };
    img.src = url;
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const downloadSvg = (svg: string, filename: string) => downloadBlob(new Blob([svg], { type: "image/svg+xml" }), filename);

/** Open a print dialog for an SVG sized to the page (A4 by default). Returns false if the browser blocked the window. */
export function printSvg(svg: string, title: string, size: { widthMm: number; heightMm: number } = { widthMm: 210, heightMm: 297 }): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/[<>&]/g, "")}</title><style>@page{size:${size.widthMm}mm ${size.heightMm}mm;margin:0}html,body{margin:0;background:#fff}svg{width:${size.widthMm}mm;height:${size.heightMm}mm;display:block}</style></head><body>${svg}</body></html>`,
  );
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
  return true;
}
