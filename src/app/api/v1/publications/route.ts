// GET /api/v1/publications — list publications with filters.
// Query params: q, year, college, sort, page, limit.

import { createAdminClient } from '@/lib/supabase/admin';
import { publicApi } from '@/lib/api/handler';
import { ok, parsePagination } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SORT_OPTIONS: Record<string, { col: string; ascending: boolean }> = {
  recent: { col: 'publication_year', ascending: false },
  citations_desc: { col: 'scopus_citations', ascending: false },
  influential_desc: { col: 'influential_citations', ascending: false },
};

export const { GET, OPTIONS } = publicApi(async (request) => {
  const url = new URL(request.url);
  const { page, limit, offset } = parsePagination(url, 25, 100);

  const q = url.searchParams.get('q');
  const year = url.searchParams.get('year');
  const sortKey = url.searchParams.get('sort') || 'recent';
  const sort = SORT_OPTIONS[sortKey] ?? SORT_OPTIONS.recent!;

  const db = createAdminClient();
  let query = db
    .from('researcher_publications_public')
    .select(
      'id, title, journal_name, publication_year, doi, is_open_access, scopus_citations, influential_citations, tldr, researcher_id',
      { count: 'exact' },
    )
    .order(sort.col, { ascending: sort.ascending, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (q) query = query.ilike('title', `%${q}%`);
  if (year) query = query.eq('publication_year', Number.parseInt(year, 10));

  const { data, count } = await query;
  const total = count ?? 0;

  return ok(data ?? [], {
    page,
    page_size: limit,
    total,
    has_more: offset + (data?.length ?? 0) < total,
  });
});
