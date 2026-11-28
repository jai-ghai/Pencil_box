import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { activeProductExists, retiredProductSlug, shelfExists } from "@/lib/retired-product";

const NOT_FOUND_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Page not found</title></head><body><h1>Page not found</h1><p>That address is not on Pencil Box.</p></body></html>`;

function notFound() {
  return new NextResponse(NOT_FOUND_HTML, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
}

/** Real 404s and 301s for shop URLs. The page shell streams as 200 before notFound() can run. */
async function publicCatalogGate(req: NextRequest) {
  const pathname = req.nextUrl.pathname.replace(/\/$/, "") || "/";
  const product = /^\/p\/([^/]+)$/.exec(pathname);
  const shelf = /^\/c\/([^/]+)$/.exec(pathname);
  try {
    if (product) {
      const slug = decodeURIComponent(product[1]);
      const live = await activeProductExists(slug);
      if (live === true || live === null) return NextResponse.next();
      const next = await retiredProductSlug(slug);
      if (next) return NextResponse.redirect(new URL(`/p/${next}`, req.url), 301);
      return notFound();
    }
    if (shelf) {
      const slug = decodeURIComponent(shelf[1]);
      const known = await shelfExists(slug);
      if (known === false) return notFound();
    }
  } catch {
    return NextResponse.next();
  }
  return NextResponse.next();
}

/**
 * First gate for staff areas. Route handlers re-check the role and the exact permission against the database
 * (see lib/api.ts), so this is defence in depth, not the only check.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/p/") || pathname.startsWith("/c/")) return publicCatalogGate(req);
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const isApi = pathname.startsWith("/api/");

  if (!session) {
    if (isApi) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  const adminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin") || pathname.startsWith("/qr-generator");
  if (adminArea && session.role === "cashier") {
    return isApi ? NextResponse.json({ error: "Not allowed" }, { status: 403 }) : NextResponse.redirect(new URL("/pos", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/pos/:path*", "/qr-generator/:path*", "/api/admin/:path*", "/api/pos/:path*", "/p/:path*", "/c/:path*"] };
