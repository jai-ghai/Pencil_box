import bcrypt from "bcryptjs";
import { z } from "zod";
import { route, SUPER } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { AuditLog, User } from "@/lib/models";
import { audit } from "@/lib/audit";
import { cleanPerms, DEFAULT_ADMIN_PERMS, normalizeRole } from "@/lib/permissions";

export const passwordSchema = z.string().min(10, "Use at least 10 characters").max(100);

export const publicUser = (u: { _id: unknown; username: string; role: unknown; permissions?: string[]; active: boolean; createdAt?: Date }) => ({
  id: String(u._id),
  username: u.username,
  role: normalizeRole(u.role) ?? "cashier",
  permissions: u.permissions ?? [],
  active: u.active,
  createdAt: u.createdAt,
});

/** Users and the activity log. Super admin only. */
export const GET = route(SUPER, async () => {
  const [users, log] = await Promise.all([User.find().sort({ createdAt: 1 }).lean(), AuditLog.find().sort({ at: -1 }).limit(60).lean()]);
  return {
    users: users.map(publicUser),
    log: log.map((l) => ({ id: String(l._id), at: l.at, by: l.by, action: l.action, summary: l.summary })),
  };
});

const createBody = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, "Username: 3 to 30 letters, numbers, dot, dash or underscore"),
  password: passwordSchema,
  role: z.enum(["superadmin", "admin", "cashier"]),
  permissions: z.array(z.string()).max(50).optional(),
});

export const POST = route(SUPER, async (req, actor) => {
  const b = createBody.parse(await req.json());
  if (b.password.toLowerCase().includes(b.username)) throw new AppError("The password must not contain the username");
  if (await User.findOne({ username: b.username })) throw new AppError("That username is already taken", 409);
  const permissions = b.role === "admin" ? cleanPerms(b.permissions ?? DEFAULT_ADMIN_PERMS) : [];
  const user = await User.create({ username: b.username, role: b.role, permissions, passwordHash: await bcrypt.hash(b.password, 11), active: true });
  await audit(actor.username, "user.create", "user", `Created ${b.role} "${b.username}"`, { entityId: String(user._id), meta: { role: b.role, permissions } });
  return { user: publicUser(user) };
});
