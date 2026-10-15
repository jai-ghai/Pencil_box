import { route, STAFF } from "@/lib/api";

/** Who am I and what may I open? The admin screens use this to hide pages the person has no access to. */
export const GET = route(STAFF, async (_req, actor) => ({ username: actor.username, role: actor.role, permissions: actor.permissions }));
