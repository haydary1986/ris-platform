// GET /api/v1/stats/overview — top-line counts for the whole university.

import { createAdminClient } from '@/lib/supabase/admin';
import { publicApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CitationRow {
  scopus_citations: number | null;
}

export const { GET, OPTIONS } = publicApi(async () => {
  const db = createAdminClient();
  const [r, p, c, d, cites] = await Promise.all([
    db.from('researchers_public').select('id', { count: 'exact', head: true }),
    db.from('researcher_publications_public').select('id', { count: 'exact', head: true }),
    db.from('colleges').select('id', { count: 'exact', head: true }),
    db.from('departments').select('id', { count: 'exact', head: true }),
    db
      .from('researcher_publications_public')
      .select('scopus_citations')
      .not('scopus_citations', 'is', null),
  ]);

  const totalCitations = ((cites.data as CitationRow[] | null) ?? []).reduce(
    (sum, row) => sum + (row.scopus_citations ?? 0),
    0,
  );

  return ok({
    researchers: r.count ?? 0,
    publications: p.count ?? 0,
    colleges: c.count ?? 0,
    departments: d.count ?? 0,
    total_scopus_citations: totalCitations,
  });
});
