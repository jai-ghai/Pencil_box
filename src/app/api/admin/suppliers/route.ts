import { z } from "zod";
import { route, OWNER, HttpError } from "@/lib/api";
import { Supplier } from "@/lib/models";
import { escapeRegex } from "@/lib/search";

export const GET = route(OWNER, async () => ({ suppliers: await Supplier.find().sort({ name: 1 }).lean() }));

const body = z.object({ name: z.string().min(1).max(80), phone: z.string().max(20).optional(), notes: z.string().max(500).optional() });

export const POST = route(OWNER, async (req) => {
  const data = body.parse(await req.json());
  if (await Supplier.findOne({ name: new RegExp(`^${escapeRegex(data.name)}$`, "i") })) throw new HttpError(409, "Supplier already exists");
  return { supplier: await Supplier.create(data) };
});
