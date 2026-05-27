// Shared response helpers for the /api/v1/* public REST API.
// All endpoints emit the same envelope:
//
//   { success: true,  data: ..., meta?: {...} }
//   { success: false, error: "...", code?: "..." }
//
// CORS is wide-open for GET (the API is documented as public read-only)
// but restricted for any future mutating verbs.

import { NextResponse } from 'next/server';

export interface ApiMeta {
  page?: number;
  page_size?: number;
  total?: number;
  has_more?: boolean;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function ok<T>(data: T, meta?: ApiMeta, init?: ResponseInit): Response {
  return NextResponse.json(
    { success: true, data, ...(meta ? { meta } : {}) },
    { ...init, headers: { ...CORS_HEADERS, ...(init?.headers ?? {}) } },
  );
}

export function fail(status: number, message: string, code?: string, details?: unknown): Response {
  return NextResponse.json(
    { success: false, error: message, ...(code ? { code } : {}), ...(details ? { details } : {}) },
    { status, headers: CORS_HEADERS },
  );
}

export function preflight(): Response {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Parse ?page= and ?limit= safely. Clamp limit to a sane ceiling so a
// caller can't ask for 100k rows and OOM the server.
export function parsePagination(
  url: URL,
  defaultLimit = 25,
  maxLimit = 100,
): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const requested = Number.parseInt(url.searchParams.get('limit') ?? `${defaultLimit}`, 10);
  const limit = Math.max(
    1,
    Math.min(maxLimit, Number.isFinite(requested) ? requested : defaultLimit),
  );
  return { page, limit, offset: (page - 1) * limit };
}
