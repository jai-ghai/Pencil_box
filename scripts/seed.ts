/**
 * Creates the owner + cashier logins only. Safe to re-run (existing users are kept).  npm run seed
 */
import crypto from "node:crypto";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

dotenv.config({ path: ".env" });
const { User } = await import("../src/lib/models/index");

const uri = process.env.MONGODB_URI;
if (!uri || uri.startsWith("YOUR_")) throw new Error("Set MONGODB_URI in .env first");
await mongoose.connect(uri);

/* ----- staff logins ----- */
async function ensureUser(username: string, role: "superadmin" | "admin" | "cashier", envPw?: string) {
  if (await User.findOne({ username })) return console.log(`user "${username}" already exists, left unchanged`);
  const pw = envPw || crypto.randomBytes(9).toString("base64url");
  await User.create({ username, role, passwordHash: await bcrypt.hash(pw, 11) });
  if (envPw) console.log(`created ${role} login  username: ${username}  (password from your .env)`);
  else console.log(`created ${role} login  username: ${username}  password: ${pw}   <- save it now, it is not stored anywhere`);
}
await ensureUser("owner", "superadmin", process.env.SEED_OWNER_PASSWORD);
await ensureUser("cashier", "cashier", process.env.SEED_CASHIER_PASSWORD);

console.log("done. Next: npm run import:stock -- --replace  (loads the real stock)");
await mongoose.disconnect();
