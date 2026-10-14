import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * First gate for staff areas. Route handlers re-check the role themselves (see lib/api.ts),
 * so this is defence in depth, not the only check.
 */
export async function proxy(req: NextRequest) {
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (!session) {
    if (isApi) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (session.role !== "owner") {
      return isApi ? NextResponse.json({ error: "Owner only" }, { status: 403 }) : NextResponse.redirect(new URL("/pos", req.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/pos/:path*", "/api/admin/:path*", "/api/pos/:path*"] };
