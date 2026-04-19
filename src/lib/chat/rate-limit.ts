// In-memory rate limiter for the AI chat endpoint. Keyed by user id for
// authenticated requests and by IP for anonymous requests. Resets on
// container restart — that's acceptable given the limits are conservative
// (10/session for anon, 30/day per user) and the intent is to stop trivial
// abuse, not to enforce billing.

interface Bucket {
  count: number;
  windowStart: number;
}

const ANON_LIMIT = 10;
const ANON_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h rolling window
const USER_LIMIT = 30;
const USER_WINDOW_MS = 24 * 60 * 60 * 1000;

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

export function checkChatRateLimit(key: string, isUser: boolean): RateLimitResult {
  const limit = isUser ? USER_LIMIT : ANON_LIMIT;
  const windowMs = isUser ? USER_WINDOW_MS : ANON_WINDOW_MS;
  const now = Date.now();

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, limit, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt: bucket.windowStart + windowMs,
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    limit,
    resetAt: bucket.windowStart + windowMs,
  };
}

export function getClientKey(request: Request, userId: string | null): string {
  if (userId) return `user:${userId}`;
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0]?.trim() : request.headers.get('x-real-ip');
  return `ip:${ip ?? 'unknown'}`;
}
