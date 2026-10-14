import { NextResponse } from "next/server";

/**
 * Short, permanent address for the printed QR codes (yourdomain/q?src=front). It redirects to the shop page and keeps
 * the ?src= tag. Temporary (307) on purpose, so the destination can change later without reprinting any QR.
 */
export function GET(req: Request) {
  const src = new URL(req.url).searchParams.get("src") ?? "";
  const to = new URL("/", req.url);
  if (/^[a-z0-9_-]{1,20}$/i.test(src)) to.searchParams.set("src", src);
  return NextResponse.redirect(to, 307);
}
