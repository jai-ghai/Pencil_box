import { route, can, HttpError } from "@/lib/api";
import { saveProductImage } from "@/lib/storage";

export const POST = route(can("products"), async (req) => {
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
