import { z } from "zod";
import { route, can, HttpError } from "@/lib/api";
import { ItemRequest, REQUEST_STATUSES } from "@/lib/models";
import { removeUnusedImages } from "@/lib/catalog";

const idOf = async (ctx: { params: Promise<Record<string, string>> }) => {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/.test(id)) throw new HttpError(400, "Bad id");
  return id;
};

export const PATCH = route(can("products"), async (req, _s, ctx) => {
  const { status } = z.object({ status: z.enum(REQUEST_STATUSES) }).parse(await req.json());
  const doc = await ItemRequest.findByIdAndUpdate(await idOf(ctx), { status }, { returnDocument: "after" }).lean();
  if (!doc) throw new HttpError(404, "Not found");
  return { request: doc };
});

/** Deleting removes the request, the phone number and the customer's photo (from Cloudinary or the server). */
export const DELETE = route(can("products"), async (_req, _s, ctx) => {
  const doc = await ItemRequest.findByIdAndDelete(await idOf(ctx)).lean();
  if (!doc) throw new HttpError(404, "Not found");
  if (doc.imageUrl) await removeUnusedImages([doc.imageUrl]);
  return { ok: true };
});
