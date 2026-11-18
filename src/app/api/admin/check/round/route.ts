import { route, can } from "@/lib/api";
import { setSetting } from "@/lib/settings";

/**
 * Start a fresh check round: every item needs ticking again. Items already crossed stay on the buy list
 * (they are still missing until bought), only the "done in this round" marks start over.
 */
export const POST = route(can("check"), async () => {
  const roundStart = new Date().toISOString();
  await setSetting("checkRoundStart", roundStart);
  return { roundStart };
});
