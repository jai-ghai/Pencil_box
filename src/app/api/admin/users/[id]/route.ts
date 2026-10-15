import bcrypt from "bcryptjs";
import { z } from "zod";
import { route, SUPER } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { User } from "@/lib/models";
import { audit } from "@/lib/audit";
import { cleanPerms } from "@/lib/permissions";
import { passwordSchema, publicUser } from "../route";

const body = z.object({
  role: z.enum(["superadmin", "admin", "cashier"]).optional(),
  permissions: z.array(z.string()).max(50).optional(),
  active: z.boolean().optional(),
  password: passwordSchema.optional(),
});

/** Change someone's role, page permissions or password, or switch them off. Users are never deleted, only switched off. */
export const PATCH = route(SUPER, async (req, actor, ctx) => {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/.test(id)) throw new AppError("Bad id");
  const b = body.parse(await req.json());
  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404);
  const isSelf = String(user._id) === actor.uid;
  if (isSelf && (b.role !== undefined || b.active === false)) throw new AppError("You cannot change your own role or switch yourself off");

  const becomesSuper = (b.role ?? user.role) === "superadmin" && (b.active ?? user.active);
  if (!becomesSuper && user.role === "superadmin" && user.active) {
    const others = await User.countDocuments({ role: "superadmin", active: true, _id: { $ne: user._id } });
    if (others === 0) throw new AppError("There must always be at least one active super admin");
  }

  const changes: string[] = [];
  if (b.role !== undefined && b.role !== user.role) {
    changes.push(`role ${user.role} -> ${b.role}`);
    user.role = b.role;
  }
  if (b.permissions !== undefined) {
    user.permissions = user.role === "admin" ? cleanPerms(b.permissions) : [];
    changes.push("permissions changed");
  }
  if (b.role !== undefined && b.role !== "admin") user.permissions = [];
  if (b.active !== undefined && b.active !== user.active) {
    user.active = b.active;
    changes.push(b.active ? "switched on" : "switched off");
  }
  if (b.password !== undefined) {
    if (b.password.toLowerCase().includes(user.username)) throw new AppError("The password must not contain the username");
    user.passwordHash = await bcrypt.hash(b.password, 11);
    changes.push("password reset");
  }
  if (!changes.length) return { user: publicUser(user) };
  await user.save();
  await audit(actor.username, "user.update", "user", `"${user.username}": ${changes.join(", ")}`, { entityId: id, meta: { permissions: user.permissions } });
  return { user: publicUser(user) };
});
