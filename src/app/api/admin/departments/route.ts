import { z } from "zod";
import { can, route } from "@/lib/api";
import { EMPTY_PREFS, HOME_LINKS, allDepartmentSlugs, normalisePrefs } from "@/lib/departments";
import { getSetting, setSetting } from "@/lib/settings";

const known = new Set(allDepartmentSlugs().concat(HOME_LINKS.map((h) => h.slug)));
const body = z.object({
  hidden: z.array(z.string()).max(80),
  order: z.array(z.string()).max(40),
  images: z.record(z.string(), z.string().max(400)),
});

export const GET = route(can("setup"), async () => normalisePrefs(await getSetting("departments.prefs", EMPTY_PREFS)));

export const PUT = route(can("setup"), async (req) => {
  const parsed = body.parse(await req.json());
  const prefs = normalisePrefs({
    hidden: parsed.hidden.filter((s) => known.has(s)),
    order: parsed.order.filter((s) => known.has(s)),
    images: Object.fromEntries(Object.entries(parsed.images).filter(([key]) => known.has(key))),
  });
  await setSetting("departments.prefs", prefs);
  return prefs;
});
