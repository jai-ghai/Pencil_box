import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "pb_session";
const SESSION_HOURS = 12;

export type Role = "owner" | "cashier";
export interface Session {
  uid: string;
  username: string;
  role: Role;
}

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function createSessionToken(s: Session): Promise<string> {
  return new SignJWT({ username: s.username, role: s.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.uid)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || (payload.role !== "owner" && payload.role !== "cashier")) return null;
    return { uid: payload.sub, username: String(payload.username), role: payload.role };
  } catch {
    return null;
  }
}

export async function setSessionCookie(s: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(s), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}
