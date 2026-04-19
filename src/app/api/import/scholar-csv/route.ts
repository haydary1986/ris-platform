// Upload handler for Google Scholar profile CSV exports (Export → CSV on
// scholar.google.com/citations?user=…).
//
// Pipeline:
//   1. Auth check (RLS is the final gate, we fail fast).
//   2. Byte-size cap.
//   3. Parse CSV with BOM strip + mojibake recovery.
//   4. Hand off to the same merge RPC the other providers use — dedupe by
//      DOI (absent in CSV, so effectively title+year) is done server-side.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseScholarCsv } from '@/lib/import/scholar-csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: ownerRow } = await supabase.from('researchers_owner').select('id').maybeSingle();
  if (!ownerRow?.id) {
    return NextResponse.json({ error: 'no_profile' }, { status: 422 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: 'read_failed' }, { status: 400 });
  }
  if (raw.length === 0 || raw.length > MAX_BYTES) {
    return NextResponse.json({ error: 'invalid_size' }, { status: 413 });
  }

  const parsed = parseScholarCsv(raw);
  if (parsed.rows.length === 0) {
    return NextResponse.json({ error: 'empty', warnings: parsed.warnings }, { status: 422 });
  }

  const payload = parsed.rows.map((r) => ({
    title: r.title,
    authors: r.authors,
    journal_name: r.journal_name,
    volume: r.volume,
    issue: r.issue,
    pages: r.pages,
    publication_year: r.publication_year,
    publisher: r.publisher,
  }));

  const { data, error } = await supabase.rpc('update_researcher_publications_google_scholar', {
    p_researcher_id: ownerRow.id,
    p_publications: payload,
  });

  if (error) {
    return NextResponse.json({ error: 'rpc_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    count: parsed.rows.length,
    warnings: parsed.warnings,
    ...((data as Record<string, unknown>) ?? {}),
  });
}
