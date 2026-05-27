// GET /api/v1/researchers — paginated list with filters.
// Query params: q, college, department, sort, page, limit.

import { createAdminClient } from '@/lib/supabase/admin';
import { publicApi } from '@/lib/api/handler';
import { ok, parsePagination } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SORT_OPTIONS: Record<string, { col: string; ascending: boolean }> = {
  name_asc: { col: 'full_name_en', ascending: true },
  h_index_desc: { col: 'scopus_h_index', ascending: false },
  citations_desc: { col: 'scopus_citations_count', ascending: false },
  publications_desc: { col: 'scopus_publications_count', ascending: false },
  recent: { col: 'updated_at', ascending: false },
};

export const { GET, OPTIONS } = publicApi(async (request) => {
  const url = new URL(request.url);
  const { page, limit, offset } = parsePagination(url, 25, 100);

  const q = url.searchParams.get('q');
  const college = url.searchParams.get('college'); // slug
  const department = url.searchParams.get('department'); // slug
  const sortKey = url.searchParams.get('sort') || 'name_asc';
  const sort = SORT_OPTIONS[sortKey] ?? SORT_OPTIONS.name_asc!;

  const db = createAdminClient();

  // Resolve slug filters to IDs first — keeps the publications query
  // hitting the indexed FK columns instead of joining lookup tables.
  let collegeId: string | null = null;
  if (college) {
    const { data } = await db.from('colleges').select('id').eq('slug', college).maybeSingle();
    collegeId = (data as { id: string } | null)?.id ?? null;
  }
  let departmentId: string | null = null;
  if (department) {
    const { data } = await db.from('departments').select('id').eq('slug', department).maybeSingle();
    departmentId = (data as { id: string } | null)?.id ?? null;
  }

  let query = db
    .from('researchers_public')
    .select(
      'id, username, full_name_en, full_name_ar, profile_image, college_id, department_id, academic_title_id, scopus_h_index, scopus_publications_count, scopus_citations_count, openalex_h_index, openalex_publications_count, openalex_citations_count',
      { count: 'exact' },
    )
    .order(sort.col, { ascending: sort.ascending, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (collegeId) query = query.eq('college_id', collegeId);
  if (departmentId) query = query.eq('department_id', departmentId);
  if (q) query = query.or(`full_name_en.ilike.%${q}%,full_name_ar.ilike.%${q}%`);

  const { data, count } = await query;
  const total = count ?? 0;

  return ok(data ?? [], {
    page,
    page_size: limit,
    total,
    has_more: offset + (data?.length ?? 0) < total,
  });
});
