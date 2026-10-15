import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models";
import { setSessionCookie } from "@/lib/auth";
import { normalizeRole } from "@/lib/permissions";

const body = z.object({ username: z.string().min(1).max(50), password: z.string().min(1).max(200) });

// Small in-memory throttle: 6 failures per 15 min per username+ip. Fine for a single shop server;
// move to a shared store if this ever runs on multiple instances.
const fails = new Map<string, { n: number; until: number }>();
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter username and password" }, { status: 400 });
  const { username, password } = parsed.data;

  const key = `${username.toLowerCase()}|${req.headers.get("x-forwarded-for") ?? "local"}`;
  const f = fails.get(key);
  if (f && f.n >= 6 && Date.now() < f.until) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });

  await connectDb();
  const user = await User.findOne({ username: username.toLowerCase(), active: true });
  // always run a compare so timing doesn't reveal whether the user exists
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    fails.set(key, { n: (f && Date.now() < f.until ? f.n : 0) + 1, until: Date.now() + 15 * 60_000 });
    return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
  }
  fails.delete(key);
  const role = normalizeRole(user.role) ?? "cashier"; // old accounts called "owner" are now super admins
  await setSessionCookie({ uid: String(user._id), username: user.username, role });
  return NextResponse.json({ ok: true, role });
}
