import { z } from "zod";
import { route, can } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { syncSearchText } from "@/lib/catalog";
import { Brand, Product } from "@/lib/models";

const body = z.object({ name: z.string().trim().min(1).max(60) });
const okId = (id: string) => {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new AppError("Bad id");
  return id;
};

/** Rename a brand. Every product of the brand picks up the new spelling in search at once. */
export const PATCH = route(can("setup"), async (req, actor, ctx) => {
  const id = okId((await ctx.params).id);
  const { name } = body.parse(await req.json());
  const clash = await Brand.findOne({ _id: { $ne: id }, name }).collation({ locale: "en", strength: 2 }); // same name in any letter case
  if (clash) throw new AppError(`"${clash.name}" already exists. Open the product and pick that brand instead.`, 409);
  const before = await Brand.findById(id);
  if (!before) throw new AppError("Brand not found", 404);
  await Brand.updateOne({ _id: id }, { name });
  for (const p of await Product.find({ brandId: id }, { _id: 1 }).lean()) await syncSearchText(String(p._id));
  await audit(actor.username, "brand.edit", "brand", `Renamed brand "${before.name}" to "${name}"`, { entityId: id });
  return { ok: true };
});

/** Delete a brand nobody uses. A brand that still has products is refused, so no product is left without its brand by accident. */
export const DELETE = route(can("products:delete"), async (_req, actor, ctx) => {
  const id = okId((await ctx.params).id);
  const brand = await Brand.findById(id);
  if (!brand) throw new AppError("Brand not found", 404);
  const used = await Product.countDocuments({ brandId: id });
  if (used > 0) throw new AppError(`${used} product${used === 1 ? "" : "s"} still use "${brand.name}". Change their brand first.`, 409);
  await Brand.deleteOne({ _id: id });
  await audit(actor.username, "brand.delete", "brand", `Deleted brand "${brand.name}"`, { entityId: id });
  return { ok: true };
});
