import { NextResponse, connection } from "next/server";
import { connectDb } from "@/lib/db";
import { QrScan } from "@/lib/models";
import { allow, clientKey } from "@/lib/ratelimit";
import { istDate } from "@/lib/reports";
import { getQrTarget } from "@/lib/settings";

/**
 * The short, permanent address printed in the QR codes (yourdomain/q?src=front).
 * It does NOT point at a fixed page: the owner chooses where it goes in the QR generator (the homepage by default),
 * so a printed QR can be pointed somewhere new later without reprinting. Each scan is counted per placement.
 * Always a temporary (307) redirect, never cached, and it falls back to the homepage if anything goes wrong.
 */
export async function GET(req: Request) {
  await connection();
  const src = new URL(req.url).searchParams.get("src") ?? "";
  const tag = /^[a-z0-9_-]{1,20}$/i.test(src) ? src.toLowerCase() : "";
  let target = "/";
  try {
    await connectDb();
    target = await getQrTarget();
    if (tag && allow(clientKey(req, "qr-scan"), 120, 60_000)) {
      const day = istDate(new Date());
      await QrScan.updateOne({ _id: `${tag}|${day}` }, { $inc: { count: 1 }, $setOnInsert: { src: tag, day } }, { upsert: true });
    }
  } catch {
    /* a database problem must never break a printed QR: go to the homepage */
  }
  const to = target.startsWith("/") ? new URL(target, req.url) : new URL(target);
  if (target.startsWith("/") && tag && !to.searchParams.has("src")) to.searchParams.set("src", tag);
  const res = NextResponse.redirect(to, 307);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
