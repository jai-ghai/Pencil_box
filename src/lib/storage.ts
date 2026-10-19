import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 5 * 1024 * 1024;

/** Detect the real image type from magic bytes; never trust the client's filename or MIME. */
export function sniffImage(buf: Buffer): "jpg" | "png" | "webp" | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

/**
 * Save a product image and return its public URL.
 * - With CLOUDINARY_URL set (cloudinary://KEY:SECRET@CLOUD_NAME): uploads to Cloudinary (use this on Vercel).
 * - Otherwise writes to public/uploads (fine for dev or a shop-run server; NOT persistent on Vercel).
 */
export async function saveProductImage(buf: Buffer): Promise<string> {
  if (buf.length > MAX_BYTES) throw new Error("Image is larger than 5 MB");
  const ext = sniffImage(buf);
  if (!ext) throw new Error("Only JPG, PNG or WebP images are allowed");

  const cld = process.env.CLOUDINARY_URL;
  if (cld) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(cld);
    if (!m) throw new Error("CLOUDINARY_URL is malformed");
    const [, key, secret, cloud] = m;
    const timestamp = String(Math.floor(Date.now() / 1000));
    const folder = "pencilbox";
    const signature = crypto.createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array(buf)]), `upload.${ext}`);
    form.set("api_key", key);
    form.set("timestamp", timestamp);
    form.set("folder", folder);
    form.set("signature", signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form });
    if (!res.ok) throw new Error("Image upload failed");
    return ((await res.json()) as { secure_url: string }).secure_url;
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(dir, name), buf);
  return `/uploads/${name}`;
}

/** The Cloudinary public id inside one of our image links ("pencilbox/abc123"), or null for any other link. */
export function cloudinaryPublicId(url: string): string | null {
  const m = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(pencilbox\/[A-Za-z0-9_-]+)\.[a-z]+$/.exec(url);
  return m ? m[1] : null;
}

/**
 * Delete a product image from where it is stored: Cloudinary (our "pencilbox" folder) or public/uploads on the server.
 * Links that are not ours are left alone. Never throws, so a failed clean-up cannot block saving a product.
 */
export async function deleteProductImage(url: string): Promise<boolean> {
  try {
    const local = /^\/uploads\/([a-f0-9]{24}\.(?:jpg|png|webp))$/.exec(url);
    if (local) {
      await fs.unlink(path.join(process.cwd(), "public", "uploads", local[1]));
      return true;
    }
    const publicId = cloudinaryPublicId(url);
    const cld = process.env.CLOUDINARY_URL;
    const m = cld && /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(cld);
    if (!publicId || !m) return false;
    const [, key, secret, cloud] = m;
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto.createHash("sha1").update(`invalidate=true&public_id=${publicId}&timestamp=${timestamp}${secret}`).digest("hex");
    const form = new FormData();
    form.set("public_id", publicId);
    form.set("invalidate", "true");
    form.set("api_key", key);
    form.set("timestamp", timestamp);
    form.set("signature", signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, { method: "POST", body: form });
    return res.ok && ((await res.json()) as { result?: string }).result === "ok";
  } catch {
    return false;
  }
}
