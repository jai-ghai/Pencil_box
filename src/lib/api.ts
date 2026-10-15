import { NextResponse, connection } from "next/server";
import { ZodError } from "zod";
import { connectDb } from "./db";
import { getSession } from "./auth";
import { AppError } from "./errors";
import { SaleError } from "./sales";
import { CatalogError } from "./catalog";
import { allow, clientKey } from "./ratelimit";
import { User } from "./models";
import { effectivePerms, normalizeRole, type Perm, type Role } from "./permissions";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Ctx = { params: Promise<Record<string, string>> };

/** Who is making the request, as read from the database just now (not from the cookie). */
export interface Actor {
  uid: string;
  username: string;
  role: Role;
  permissions: Perm[];
}

/** A list of allowed roles, or roles plus one specific permission the person must have been given. */
export type Access = Role[] | { roles?: Role[]; perm?: Perm };

export const STAFF: Role[] = ["superadmin", "admin", "cashier"];
export const ADMINS: Role[] = ["superadmin", "admin"];
export const SUPER: Role[] = ["superadmin"];
/** Admins who have been given this permission (the super admin always has every permission). */
export const can = (perm: Perm): Access => ({ roles: ADMINS, perm });

/**
 * Wrap a route handler: connect DB, check the signed-in user (role and permission, read fresh from the database),
 * and turn known errors into clean JSON. Unknown errors are logged without request bodies (no personal data)
 * and returned as a generic 500.
 */
export function route(access: Access, fn: (req: Request, actor: Actor, ctx: Ctx) => Promise<Response | object>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    await connection(); // per-request only; kept outside try/catch so Next can abort build-time prerendering
    try {
      const session = await getSession();
      if (!session) throw new HttpError(401, "Not signed in");
      await connectDb();
      const user = await User.findById(session.uid).lean();
      const role = normalizeRole(user?.role);
      if (!user || !user.active || !role) throw new HttpError(401, "Not signed in");
      const { roles, perm } = Array.isArray(access) ? { roles: access, perm: undefined } : access;
      const permissions = effectivePerms(role, user.permissions);
      if (roles && !roles.includes(role)) throw new HttpError(403, "Not allowed");
      if (perm && !permissions.includes(perm)) throw new HttpError(403, "You do not have access to this");
      const out = await fn(req, { uid: String(user._id), username: user.username, role, permissions }, ctx);
      return out instanceof Response ? out : NextResponse.json(out);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof SaleError || e instanceof CatalogError) return NextResponse.json({ error: e.message }, { status: 400 });
      if (e instanceof ZodError) return NextResponse.json({ error: "Invalid input", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
      console.error("API error:", e instanceof Error ? e.message : "unknown");
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

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
