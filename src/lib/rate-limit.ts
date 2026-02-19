/**
 * In-memory rate limiter for auth endpoints. Use a shared store (e.g. Redis) in production for multi-instance.
 */

const store = new Map<string, { count: number; resetAt: number }>();

const PRUNE_INTERVAL_MS = 60_000;
let lastPrune = Date.now();

function prune() {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, v] of store.entries()) {
    if (v.resetAt < now) store.delete(key);
  }
}

/**
 * Returns true if the request is allowed, false if rate limited.
 * @param key - Identifier (e.g. IP or email)
 * @param limit - Max requests per window
 * @param windowMs - Window in milliseconds
 */
export function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  prune();
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}

/** Get client identifier from request (IP or fallback). */
export function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
