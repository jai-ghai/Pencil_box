/**
 * POST /api/admin/buy-list/purchase
 * Called from the Buy list admin page (src/app/admin/requests/page.tsx) when recording a purchase.
 * Body: { buyDate: "YYYY-MM-DD", supplierName?, lines: [{ name, qty, cost, price, requestId?, variantId?, imageUrl? }] }
 * No prior route served dated buy-list → purchase; Purchases page only takes existing variantIds.
 */
import { route, can } from "@/lib/api";
import { buyListPurchaseBody, purchaseBuyList } from "@/lib/buy-list";

export const POST = route(can("purchases"), async (req, actor) => {
  const body = buyListPurchaseBody.parse(await req.json());
  return purchaseBuyList(body, actor.username);
});
