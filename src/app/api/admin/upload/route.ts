import { route, ADMINS, HttpError } from "@/lib/api";
import { saveProductImage } from "@/lib/storage";

/** Product photos and daybook photos share this endpoint. Needs products or daybook permission. */
export const POST = route(ADMINS, async (req, actor) => {
  if (!actor.permissions.includes("products") && !actor.permissions.includes("daybook")) {
    throw new HttpError(403, "You do not have access to this");
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file");
  if (file.size > 5 * 1024 * 1024) throw new HttpError(400, "Image is larger than 5 MB");
  try {
    return { url: await saveProductImage(Buffer.from(await file.arrayBuffer())) };
  } catch (e) {
    throw new HttpError(400, e instanceof Error ? e.message : "Upload failed");
  }
});
