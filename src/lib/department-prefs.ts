import { connectDb } from "./db";
import { EMPTY_PREFS, normalisePrefs, type DepartmentPrefs } from "./departments";
import { getSetting } from "./settings";

/** Saved hide / order / photo overrides. Safe during a build, when the database is not opened. */
export async function loadDepartmentPrefs(): Promise<DepartmentPrefs> {
  if (!process.env.MONGODB_URI || process.env.NEXT_PHASE === "phase-production-build") return EMPTY_PREFS;
  try {
    await connectDb();
    return normalisePrefs(await getSetting("departments.prefs", EMPTY_PREFS));
  } catch {
    return EMPTY_PREFS;
  }
}
