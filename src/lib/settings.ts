import { Setting } from "./models";

/** Where /q sends people. A page on this site ("/", "/?cat=pens") or a full https link. */
export function validQrTarget(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim();
  if (!v || v.length > 500 || /\s/.test(v)) return null;
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** The public address of the website, used to build the QR link. Empty until the owner sets it. */
export function validOrigin(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const u = new URL(input.trim());
    return u.protocol === "https:" || (u.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname)) ? u.origin : null;
  } catch {
    return null;
  }
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await Setting.findById(key).lean();
  return row && row.value !== undefined && row.value !== null ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await Setting.updateOne({ _id: key }, { $set: { value } }, { upsert: true });
}

export const getQrTarget = async (): Promise<string> => validQrTarget(await getSetting<string>("qrTarget", "/")) ?? "/";
