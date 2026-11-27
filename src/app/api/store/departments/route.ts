import { publicRoute } from "@/lib/api";
import { EMPTY_PREFS, normalisePrefs } from "@/lib/departments";
import { getSetting } from "@/lib/settings";

/** Public read of hide / order / photo overrides. Defaults if nothing is saved. */
export const GET = publicRoute({ bucket: "departments", limit: 60 }, async () => {
  try {
    return normalisePrefs(await getSetting("departments.prefs", EMPTY_PREFS));
  } catch {
    return EMPTY_PREFS;
  }
});
