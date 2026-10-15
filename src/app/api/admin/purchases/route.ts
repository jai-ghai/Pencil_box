import { route, can } from "@/lib/api";
import { Purchase } from "@/lib/models";

export const GET = route(can("purchases"), async () => ({
  purchases: await Purchase.find().sort({ date: -1 }).limit(100).populate("supplierId", "name").lean(),
}));
