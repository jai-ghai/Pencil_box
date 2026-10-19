import { z } from "zod";
import { HttpError, publicRoute } from "@/lib/api";
import { ItemRequest } from "@/lib/models";
import { saveProductImage } from "@/lib/storage";

const MAX_PHOTO = 3 * 1024 * 1024;
const fields = z.object({
  name: z.string().trim().min(2).max(120),
  note: z.string().trim().max(300).optional(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/).optional(),
});

/**
 * A visitor asks for an item the shop does not stock (name, optional note, photo and phone number).
 * Rate limited per visitor; nothing is returned except "ok". Needs no login.
 */
export const POST = publicRoute({ bucket: "store-request", limit: 4 }, async (req) => {
  const form = await req.formData();
  if (String(form.get("website") ?? "")) return { ok: true }; // hidden trap field: bots fill it, people never see it
  const text = (k: string) => String(form.get(k) ?? "").trim() || undefined;
  const input = fields.parse({ name: text("name"), note: text("note"), phone: text("phone") });

  let imageUrl: string | undefined;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PHOTO) throw new HttpError(400, "The photo is larger than 3 MB");
    try {
      imageUrl = await saveProductImage(Buffer.from(await file.arrayBuffer()));
    } catch {
      throw new HttpError(400, "Please use a JPG, PNG or WebP photo");
    }
  }
  if ((await ItemRequest.countDocuments({ status: "new" })) >= 500) throw new HttpError(429, "Too many open requests. Please visit the shop.");
  await ItemRequest.create({ ...input, imageUrl });
  return { ok: true };
});
