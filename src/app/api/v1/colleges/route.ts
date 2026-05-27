// GET /api/v1/colleges — all colleges with their researcher counts.

import { createAdminClient } from '@/lib/supabase/admin';
import { publicApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CollegeRow {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
}

interface CountRow {
  college_id: string;
}

export const { GET, OPTIONS } = publicApi(async () => {
  const db = createAdminClient();
  const [{ data: colleges }, { data: countRows }] = await Promise.all([
    db.from('colleges').select('id, slug, name_en, name_ar').order('name_en'),
    db.from('researchers_public').select('college_id').not('college_id', 'is', null),
  ]);

  const counts = new Map<string, number>();
  for (const r of (countRows as CountRow[] | null) ?? []) {
    counts.set(r.college_id, (counts.get(r.college_id) ?? 0) + 1);
  }

  const out = ((colleges as CollegeRow[] | null) ?? []).map((c) => ({
    ...c,
    researcher_count: counts.get(c.id) ?? 0,
  }));

  return ok(out, { total: out.length });
});
