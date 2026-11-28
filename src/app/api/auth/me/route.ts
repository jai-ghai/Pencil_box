import { NextResponse, connection } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models";
import { effectivePerms, normalizeRole } from "@/lib/permissions";

/**
 * Who is signed in. Logged-out visitors get 200 and null, so the shop does not
 * log a 401 in the browser console on every page.
 */
export async function GET() {
  await connection();
  try {
    const session = await getSession();
    if (!session) return NextResponse.json(null);
    await connectDb();
    const user = await User.findById(session.uid).lean();
    const role = normalizeRole(user?.role);
    if (!user || !user.active || !role) return NextResponse.json(null);
    if ((user.sessionVersion ?? 0) !== (session.sv ?? 0)) return NextResponse.json(null);
    return NextResponse.json({ username: user.username, role, permissions: effectivePerms(role, user.permissions) });
  } catch {
    return NextResponse.json(null);
  }
}
