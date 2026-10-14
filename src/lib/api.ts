import { NextResponse, connection } from "next/server";
import { ZodError } from "zod";
import { connectDb } from "./db";
import { getSession, type Role, type Session } from "./auth";
import { SaleError } from "./sales";
import { CatalogError } from "./catalog";
import { allow, clientKey } from "./ratelimit";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Ctx = { params: Promise<Record<string, string>> };

/**
 * Wrap a route handler: connect DB, require a signed-in user with one of `roles`,
 * and turn known errors into clean JSON. Unknown errors are logged without request
 * bodies (no PII) and returned as a generic 500.
 */
export function route(
  roles: Role[],
  fn: (req: Request, session: Session, ctx: Ctx) => Promise<Response | object>,
) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    await connection(); // per-request only; kept outside try/catch so Next can abort build-time prerendering
    try {
      const session = await getSession();
      if (!session) throw new HttpError(401, "Not signed in");
      if (!roles.includes(session.role)) throw new HttpError(403, "Not allowed");
      await connectDb();
      const out = await fn(req, session, ctx);
      return out instanceof Response ? out : NextResponse.json(out);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof SaleError || e instanceof CatalogError) return NextResponse.json({ error: e.message }, { status: 400 });
      if (e instanceof ZodError) return NextResponse.json({ error: "Invalid input", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
      console.error("API error:", e instanceof Error ? e.message : "unknown");
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export const OWNER: Role[] = ["owner"];
export const STAFF: Role[] = ["owner", "cashier"];

/**
 * Wrapper for the public (no login) storefront endpoints: per-IP rate limit, DB connection,
 * clean errors. These endpoints must only ever return allow-listed customer-safe data.
 */
export function publicRoute(opts: { bucket: string; limit: number; windowMs?: number }, fn: (req: Request) => Promise<Response | object>) {
  return async (req: Request): Promise<Response> => {
    await connection();
    try {
      if (!allow(clientKey(req, opts.bucket), opts.limit, opts.windowMs ?? 60_000)) {
        return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
      }
      await connectDb();
      const out = await fn(req);
      return out instanceof Response ? out : NextResponse.json(out);
    } catch (e) {
      if (e instanceof SaleError) return NextResponse.json({ error: e.message }, { status: 400 });
      if (e instanceof ZodError) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      console.error("Store API error:", e instanceof Error ? e.message : "unknown");
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
