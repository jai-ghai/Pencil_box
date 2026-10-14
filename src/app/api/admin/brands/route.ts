import { z } from "zod";
import { route, OWNER, STAFF, HttpError } from "@/lib/api";
import { Brand } from "@/lib/models";

export const GET = route(STAFF, async () => ({ brands: await Brand.find().sort({ name: 1 }).lean() }));

const body = z.object({ name: z.string().min(1).max(60), logoUrl: z.string().max(300).optional(), website: z.string().max(200).optional() });

export const POST = route(OWNER, async (req) => {
  const data = body.parse(await req.json());
  if (await Brand.findOne({ name: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })) throw new HttpError(409, "Brand already exists");
  return { brand: await Brand.create(data) };
});
