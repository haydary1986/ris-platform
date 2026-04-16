// Task 105 — Scopus import (server-side, Author ID based).
//
// Why server-side: SCOPUS_API_KEY must never reach the browser. The user
// supplies their Scopus Author ID (a numeric string), the route fetches the
// author's documents via Elsevier's Search API, and feeds them through the
// merge RPC. RLS ensures the caller can only write to their own row.
//
// Required env: SCOPUS_API_KEY (Elsevier Developer Portal).
// FIX-28's tenacity-style retry lives in the Python pipelines (Phase 15);
// this endpoint is a one-shot user trigger, so we accept a single 429 +
// surface a friendly error rather than retry on the request thread.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPUS_SEARCH = 'https://api.elsevier.com/content/search/scopus';
const PAGE_SIZE = 25;

const inputSchema = z.object({
  scopus_author_id: z.string().regex(/^\d{6,15}$/),
});

interface ScopusEntry {
  'dc:title'?: string;
  'dc:description'?: string;
  'prism:publicationName'?: string;
  'prism:doi'?: string;
  'prism:coverDate'?: string;
  'prism:url'?: string;
  'citedby-count'?: string;
  subtype?: string;
  openaccess?: '0' | '1' | string;
}

interface ScopusSearchResponse {
  'search-results'?: {
    'opensearch:totalResults'?: string;
    entry?: ScopusEntry[];
  };
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.SCOPUS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'scopus_not_configured' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: ownerRow } = await supabase.from('researchers_owner').select('id').maybeSingle();
  if (!ownerRow?.id) return NextResponse.json({ error: 'no_profile' }, { status: 422 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const all: ScopusEntry[] = [];
  let start = 0;
  // Cap to one user-triggered hit at 4 pages (= 100 docs) to keep response time
  // sane and stay within free Scopus quotas. Heavy authors should use the
  // Python pipeline which handles batching + retries (Phase 15 / FIX-28).
  for (let page = 0; page < 4; page++) {
    const url = new URL(SCOPUS_SEARCH);
    url.searchParams.set('query', `AU-ID(${parsed.data.scopus_author_id})`);
    url.searchParams.set('count', String(PAGE_SIZE));
    url.searchParams.set('start', String(start));

    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'X-ELS-APIKey': apiKey },
      cache: 'no-store',
    });
    if (res.status === 429) {
      return NextResponse.json({ error: 'scopus_rate_limited' }, { status: 503 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'scopus_failed', status: res.status }, { status: 502 });
    }
    const json = (await res.json()) as ScopusSearchResponse;
    const entries = json['search-results']?.entry ?? [];
    if (entries.length === 0) break;
    all.push(...entries);
    if (entries.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  const items = all.map((e) => ({
    title: e['dc:title'] ?? null,
    abstract: e['dc:description'] ?? null,
    journal_name: e['prism:publicationName'] ?? null,
    doi: e['prism:doi'] ?? null,
    publication_year: e['prism:coverDate']?.slice(0, 4)
      ? Number(e['prism:coverDate']!.slice(0, 4))
      : null,
    url: e['prism:url'] ?? null,
    scopus_citations: e['citedby-count'] ? Number(e['citedby-count']) : 0,
    is_open_access: e.openaccess === '1',
  }));

  const { data, error } = await supabase.rpc('update_researcher_publications_scopus', {
    p_researcher_id: ownerRow.id,
    p_publications: items,
  });
  if (error) {
    return NextResponse.json({ error: 'rpc_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...((data as Record<string, unknown>) ?? {}) });
}
