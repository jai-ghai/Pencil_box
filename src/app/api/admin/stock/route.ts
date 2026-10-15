import { z } from "zod";
import { route, can, HttpError } from "@/lib/api";
import { StockMovement, Variant } from "@/lib/models";
import { adjustStock } from "@/lib/stock";
import { toPaise } from "@/lib/catalog";

const body = z.discriminatedUnion("mode", [
  // buying stock: counted in packs (boxes) or loose pieces
  z.object({ mode: z.literal("PURCHASE"), variantId: z.string().length(24), packs: z.number().int().min(0).default(0), pieces: z.number().int().min(0).default(0), costPerPiece: z.number().min(0).optional(), note: z.string().max(200).optional() }),
  // stock-take: set to what you physically counted
  z.object({ mode: z.literal("COUNT"), variantId: z.string().length(24), counted: z.number().int().min(0), note: z.string().max(200).optional() }),
  z.object({ mode: z.enum(["DAMAGE", "RETURN"]), variantId: z.string().length(24), qty: z.number().int().min(1), note: z.string().max(200).optional() }),
]);

export const POST = route(can("stock"), async (req, session) => {
  const b = body.parse(await req.json());
  const variant = await Variant.findById(b.variantId);
  if (!variant) throw new HttpError(404, "Item not found");
  const by = session.username;

  if (b.mode === "PURCHASE") {
    const qty = b.packs * variant.packSize + b.pieces;
    if (qty < 1) throw new HttpError(400, "Enter how many packs or pieces you bought");
    const unitCost = b.costPerPiece !== undefined ? toPaise(b.costPerPiece) : variant.costPrice;
    await adjustStock({ variantId: b.variantId, type: "PURCHASE", qty, unitCost, note: b.note, by });
    if (b.costPerPiece !== undefined) await Variant.updateOne({ _id: b.variantId }, { costPrice: unitCost });
  } else if (b.mode === "COUNT") {
    const delta = b.counted - variant.stockOnHand;
    if (delta === 0) return { ok: true, stockOnHand: variant.stockOnHand, unchanged: true };
    await adjustStock({ variantId: b.variantId, type: "ADJUSTMENT", qty: delta, note: b.note ?? `stock count: was ${variant.stockOnHand}`, by });
  } else if (b.mode === "DAMAGE") {
    await adjustStock({ variantId: b.variantId, type: "DAMAGE", qty: -b.qty, note: b.note, by });
  } else {
    await adjustStock({ variantId: b.variantId, type: "RETURN", qty: b.qty, note: b.note, by });
  }
  const fresh = await Variant.findById(b.variantId).lean();
  return { ok: true, stockOnHand: fresh?.stockOnHand };
});

/** Recent ledger rows for one variant: ?variantId=... */
export const GET = route(can("stock"), async (req) => {
  const variantId = new URL(req.url).searchParams.get("variantId");
  if (!variantId || !/^[a-f0-9]{24}$/.test(variantId)) throw new HttpError(400, "variantId required");
  return { movements: await StockMovement.find({ variantId }).sort({ at: -1 }).limit(50).lean() };
});
