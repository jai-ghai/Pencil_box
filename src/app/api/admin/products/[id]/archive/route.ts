import { z } from "zod";
import { route, can } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { Product, Variant } from "@/lib/models";

const body = z.object({ archived: z.boolean() });

/**
 * Archive (hide) or restore a product. Archived products disappear from the website and the billing screen,
 * but past bills, stock history and reports keep working. Needs the "Archive and restore products" permission.
 */
export const POST = route(can("products:delete"), async (req, actor, ctx) => {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/.test(id)) throw new AppError("Bad id");
  const { archived } = body.parse(await req.json());
  const product = await Product.findByIdAndUpdate(id, { active: !archived }, { returnDocument: "after" });
  if (!product) throw new AppError("Product not found", 404);
  await Variant.updateMany({ productId: id }, { active: !archived });
  await audit(actor.username, archived ? "product.archive" : "product.restore", "product", `${archived ? "Archived" : "Restored"} "${product.name_en}"`, { entityId: id });
  return { ok: true, archived };
});
