/**
 * Tiny in-memory sliding-window limiter for the public (no-login) endpoints.
 * Fine for one server; move to a shared store (e.g. Redis) if you run several instances.
 */
const hits = new Map<string, number[]>();

export function allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k); // keep memory bounded
  return true;
}

export const clientKey = (req: Request, bucket: string) => `${bucket}|${(req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim()}`;
