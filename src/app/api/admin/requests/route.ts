import { route, can } from "@/lib/api";
import { ItemRequest } from "@/lib/models";

export const GET = route(can("products"), async () => {
  const requests = await ItemRequest.find({}).sort({ createdAt: -1 }).limit(300).lean();
  return { requests };
});
