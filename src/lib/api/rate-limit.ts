// Token-bucket rate limiter for the public API.
// In-memory only — adequate for a single-instance deployment on Coolify.
// If we ever fan out to multiple instances behind a load balancer this
// must move to Redis (or Supabase using an upsert + window function).
//
// Limit: 100 requests per minute per IP. Slightly above what a casual
// scraper would do but well under what a real integration needs.

interface Bucket {
  tokens: number;
  refilledAt: number;
}

const RATE = 100; // requests
const WINDOW_MS = 60_000; // per 60 seconds
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000; // soft cap to bound memory in case of attack

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(ip: string): RateLimitDecision {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now - b.refilledAt >= WINDOW_MS) {
    b = { tokens: RATE, refilledAt: now };
    buckets.set(ip, b);
    // Drop oldest entries if we're flooded — naive eviction but enough
    // for our scale and faster than a real LRU.
    if (buckets.size > MAX_BUCKETS) {
      const firstKey = buckets.keys().next().value;
      if (typeof firstKey === 'string') buckets.delete(firstKey);
    }
  }

  if (b.tokens <= 0) {
    return { allowed: false, remaining: 0, resetAt: b.refilledAt + WINDOW_MS };
  }

  b.tokens -= 1;
  return { allowed: true, remaining: b.tokens, resetAt: b.refilledAt + WINDOW_MS };
}

// Derive a client IP from the request. Honours common proxy headers
// because Coolify sits behind nginx/traefik in most setups.
export function ipFromRequest(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? 'unknown';
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
