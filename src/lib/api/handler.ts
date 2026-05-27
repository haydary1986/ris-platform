// Common wrapper for /api/v1/* routes — rate-limits, catches errors,
// and adds the X-RateLimit-* headers everyone expects to see.
// Keeps the per-route files tiny.

import { fail, preflight } from './response';
import { checkRateLimit, ipFromRequest } from './rate-limit';

type Handler = (request: Request) => Promise<Response>;

export function publicApi(handler: Handler) {
  const GET = async (request: Request): Promise<Response> => {
    const decision = checkRateLimit(ipFromRequest(request));
    if (!decision.allowed) {
      const res = fail(429, 'Rate limit exceeded. Try again later.', 'rate_limited');
      res.headers.set('Retry-After', String(Math.ceil((decision.resetAt - Date.now()) / 1000)));
      res.headers.set('X-RateLimit-Limit', '100');
      res.headers.set('X-RateLimit-Remaining', '0');
      res.headers.set('X-RateLimit-Reset', String(Math.floor(decision.resetAt / 1000)));
      return res;
    }

    try {
      const res = await handler(request);
      res.headers.set('X-RateLimit-Limit', '100');
      res.headers.set('X-RateLimit-Remaining', String(decision.remaining));
      res.headers.set('X-RateLimit-Reset', String(Math.floor(decision.resetAt / 1000)));
      return res;
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error';
      return fail(500, 'Internal server error', 'internal_error', detail);
    }
  };

  return { GET, OPTIONS: async (): Promise<Response> => preflight() };
}
