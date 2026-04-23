// Admin-triggered Semantic Scholar enrichment. Finds publications that
// have a DOI but haven't been enriched recently, fetches
// influentialCitationCount + tldr from SS, and writes them back.
//
// Kept intentionally small (default 30 rows per call) so the admin can
// hit the button a few times in a row to work through a backlog without
// tying up a request for minutes. Oldest enriched_at comes first so
// every row eventually gets refreshed.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchPaperFactsByDoi } from '@/lib/integrations/semantic-scholar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  batch: z.number().int().min(1).max(100).default(30),
  // When true, re-queries rows enriched more than 30 days ago. When
  // false (default), only touches rows that have never been enriched.
  refresh: z.boolean().default(false),
});

const REFRESH_AFTER_DAYS = 30;
const RATE_LIMIT_MS = 200; // ~5 req/s — well under SS's 100 req/s shared cap

interface CandidateRow {
  id: string;
  doi: string;
  semantic_scholar_enriched_at: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const adminDb = createAdminClient();
  let query = adminDb
    .from('researcher_publications')
    .select('id, doi, semantic_scholar_enriched_at')
    .not('doi', 'is', null)
    .neq('doi', '')
    .order('semantic_scholar_enriched_at', { ascending: true, nullsFirst: true })
    .limit(parsed.data.batch);

  if (!parsed.data.refresh) {
    query = query.is('semantic_scholar_enriched_at', null);
  } else {
    const cutoff = new Date(Date.now() - REFRESH_AFTER_DAYS * 86_400_000).toISOString();
    query = query.or(
      `semantic_scholar_enriched_at.is.null,semantic_scholar_enriched_at.lt.${cutoff}`,
    );
  }

  const { data: candidates, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  }
  const rows = (candidates as CandidateRow[] | null) ?? [];

  let enriched = 0;
  let touched = 0;
  let notFound = 0;

  for (const row of rows) {
    touched += 1;
    const facts = await fetchPaperFactsByDoi(row.doi);
    const now = new Date().toISOString();

    if (!facts) {
      notFound += 1;
      // Still bump the timestamp so the row doesn't hog every batch.
      await adminDb
        .from('researcher_publications')
        .update({ semantic_scholar_enriched_at: now })
        .eq('id', row.id);
    } else {
      await adminDb
        .from('researcher_publications')
        .update({
          influential_citations: facts.influentialCitations,
          tldr: facts.tldr,
          semantic_scholar_enriched_at: now,
        })
        .eq('id', row.id);
      if (facts.tldr || facts.influentialCitations != null) enriched += 1;
    }

    await sleep(RATE_LIMIT_MS);
  }

  return NextResponse.json({
    ok: true,
    examined: touched,
    enriched,
    not_found: notFound,
    remaining_hint: rows.length === parsed.data.batch ? 'likely_more' : 'likely_done',
  });
}
