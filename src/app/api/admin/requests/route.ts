import { route, can } from "@/lib/api";
import { ItemRequest } from "@/lib/models";

/** All requests, or only open ones (`?open=1` = new + ordered) that still need action. */
export const GET = route(can("products"), async (req) => {
  const open = new URL(req.url).searchParams.get("open") === "1";
  const filter = open ? { status: { $in: ["new", "ordered"] } } : {};
  const requests = await ItemRequest.find(filter).sort({ createdAt: -1 }).limit(300).lean();
  return { requests };
});
