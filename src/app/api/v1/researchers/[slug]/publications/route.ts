// GET /api/v1/researchers/{slug}/publications — all publications for one researcher.

import { createAdminClient } from '@/lib/supabase/admin';
import { publicApi } from '@/lib/api/handler';
import { fail, ok, parsePagination } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const { GET, OPTIONS } = publicApi(async (request) => {
  // The path is /api/v1/researchers/{slug}/publications, so slug is the
  // second-from-last segment.
  const segments = new URL(request.url).pathname.split('/').filter(Boolean);
  const slug = segments[segments.length - 2];
  if (!slug) return fail(400, 'slug missing', 'bad_request');

  const url = new URL(request.url);
  const { page, limit, offset } = parsePagination(url, 25, 100);

  const db = createAdminClient();
  const { data: researcher } = await db
    .from('researchers_public')
    .select('id')
    .eq('username', slug)
    .maybeSingle();
  if (!researcher) return fail(404, 'Researcher not found', 'not_found');

  const { data, count } = await db
    .from('researcher_publications_public')
    .select(
      'id, title, abstract, journal_name, publication_year, publication_date, doi, url, is_open_access, scopus_citations, wos_citations, scholar_citations, influential_citations, tldr, keywords',
      { count: 'exact' },
    )
    .eq('researcher_id', (researcher as { id: string }).id)
    .order('publication_year', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const total = count ?? 0;
  return ok(data ?? [], {
    page,
    page_size: limit,
    total,
    has_more: offset + (data?.length ?? 0) < total,
  });
});
