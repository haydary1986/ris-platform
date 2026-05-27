// GET /api/v1/stats/by-college — publication & citation counts per college.

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

interface PubRow {
  researcher_id: string;
  scopus_citations: number | null;
}

interface ResearcherRow {
  id: string;
  college_id: string | null;
}

export const { GET, OPTIONS } = publicApi(async () => {
  const db = createAdminClient();
  const [collegesRes, researchersRes, pubsRes] = await Promise.all([
    db.from('colleges').select('id, slug, name_en, name_ar'),
    db.from('researchers_public').select('id, college_id'),
    db.from('researcher_publications_public').select('researcher_id, scopus_citations'),
  ]);

  const colleges = (collegesRes.data as CollegeRow[] | null) ?? [];
  const collegeByResearcher = new Map<string, string | null>();
  for (const r of (researchersRes.data as ResearcherRow[] | null) ?? []) {
    collegeByResearcher.set(r.id, r.college_id);
  }

  const stats = new Map<string, { publications: number; citations: number; researchers: number }>();
  for (const c of colleges) {
    stats.set(c.id, { publications: 0, citations: 0, researchers: 0 });
  }
  for (const [, collegeId] of collegeByResearcher) {
    if (collegeId && stats.has(collegeId)) stats.get(collegeId)!.researchers += 1;
  }
  for (const pub of (pubsRes.data as PubRow[] | null) ?? []) {
    const collegeId = collegeByResearcher.get(pub.researcher_id);
    if (!collegeId || !stats.has(collegeId)) continue;
    const s = stats.get(collegeId)!;
    s.publications += 1;
    s.citations += pub.scopus_citations ?? 0;
  }

  const out = colleges.map((c) => ({
    college: c,
    ...stats.get(c.id)!,
  }));

  return ok(out, { total: out.length });
});
