// GET /api/v1/stats/by-year — publications per year.

import { createAdminClient } from '@/lib/supabase/admin';
import { publicApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface YearRow {
  publication_year: number | null;
}

export const { GET, OPTIONS } = publicApi(async () => {
  const db = createAdminClient();
  const { data } = await db
    .from('researcher_publications_public')
    .select('publication_year')
    .not('publication_year', 'is', null);

  const counts = new Map<number, number>();
  for (const r of (data as YearRow[] | null) ?? []) {
    if (r.publication_year == null) continue;
    counts.set(r.publication_year, (counts.get(r.publication_year) ?? 0) + 1);
  }

  const out = Array.from(counts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);

  return ok(out, { total: out.length });
});
