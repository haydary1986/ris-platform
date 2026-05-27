// Data access for the OAI-PMH endpoint. Everything queried here goes
// through the public security_invoker views (researcher_publications_public,
// researcher_publication_coauthors_public) so we never expose private rows
// even when the harvester is anonymous.

import { createAdminClient } from '@/lib/supabase/admin';
import type { PublicationForOai } from './oai-pmh';

interface ListFilters {
  set?: string | null;
  from?: string | null;
  until?: string | null;
  offset?: number;
  limit: number;
}

interface PublicationListResult {
  rows: PublicationForOai[];
  total: number;
}

interface PublicationRow {
  id: string;
  title: string;
  abstract: string | null;
  publication_year: number | null;
  publication_date: string | null;
  doi: string | null;
  url: string | null;
  journal_name: string | null;
  publisher: string | null;
  publication_type_id: string | null;
  is_open_access: boolean;
  created_at: string;
  updated_at: string;
  keywords: string[] | null;
  researcher_id: string;
}

interface CoauthorRow {
  publication_id: string;
  author_order: number;
  author_name: string;
}

interface ResearcherRow {
  id: string;
  college_id: string | null;
}

interface CollegeRow {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
}

interface PublicationTypeRow {
  id: string;
  code: string;
  name_en: string;
}

async function loadLookupMaps(): Promise<{
  colleges: Map<string, CollegeRow>;
  pubTypes: Map<string, PublicationTypeRow>;
}> {
  const db = createAdminClient();
  const [collegesRes, pubTypesRes] = await Promise.all([
    db.from('colleges').select('id, slug, name_en, name_ar'),
    db.from('publication_types').select('id, code, name_en'),
  ]);
  return {
    colleges: new Map(((collegesRes.data ?? []) as CollegeRow[]).map((c) => [c.id, c])),
    pubTypes: new Map(((pubTypesRes.data ?? []) as PublicationTypeRow[]).map((p) => [p.id, p])),
  };
}

// Resolve the `set` argument (e.g. "college:pharmacy") to the matching
// researcher IDs so we can filter the publications query. Returns null
// when the set spec is malformed or unknown — callers should turn that
// into a noRecordsMatch error.
async function resolveSetToResearcherIds(set: string): Promise<string[] | null> {
  if (!set.startsWith('college:')) return null;
  const slug = set.slice('college:'.length);
  if (!slug) return null;

  const db = createAdminClient();
  const { data: college } = await db.from('colleges').select('id').eq('slug', slug).maybeSingle();
  if (!college) return null;

  const { data: researchers } = await db
    .from('researchers_public')
    .select('id')
    .eq('college_id', (college as { id: string }).id);
  return ((researchers as { id: string }[] | null) ?? []).map((r) => r.id);
}

export async function listPublications(filters: ListFilters): Promise<PublicationListResult> {
  const db = createAdminClient();

  // Optional set filter — turn it into a researcher_id list first.
  let researcherIdFilter: string[] | null = null;
  if (filters.set) {
    researcherIdFilter = await resolveSetToResearcherIds(filters.set);
    if (researcherIdFilter === null || researcherIdFilter.length === 0) {
      return { rows: [], total: 0 };
    }
  }

  let query = db
    .from('researcher_publications_public')
    .select(
      'id, title, abstract, publication_year, publication_date, doi, url, journal_name, publisher, publication_type_id, is_open_access, created_at, updated_at, keywords, researcher_id',
      { count: 'exact' },
    )
    .order('updated_at', { ascending: true })
    .order('id', { ascending: true });

  if (researcherIdFilter) query = query.in('researcher_id', researcherIdFilter);
  if (filters.from) query = query.gte('updated_at', filters.from);
  if (filters.until) query = query.lte('updated_at', filters.until);

  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + filters.limit - 1);

  const { data, count } = await query;
  const pubs = (data as PublicationRow[] | null) ?? [];
  if (pubs.length === 0) return { rows: [], total: count ?? 0 };

  // Hydrate per-publication: coauthors + researcher college.
  const pubIds = pubs.map((p) => p.id);
  const researcherIds = Array.from(new Set(pubs.map((p) => p.researcher_id)));

  const [{ data: coauthors }, { data: researchers }, lookups] = await Promise.all([
    db
      .from('researcher_publication_coauthors_public')
      .select('publication_id, author_order, author_name')
      .in('publication_id', pubIds),
    db.from('researchers_public').select('id, college_id').in('id', researcherIds),
    loadLookupMaps(),
  ]);

  const coauthorsByPub = new Map<string, string[]>();
  for (const c of ((coauthors as CoauthorRow[] | null) ?? []).sort(
    (a, b) => a.author_order - b.author_order,
  )) {
    const list = coauthorsByPub.get(c.publication_id) ?? [];
    list.push(c.author_name);
    coauthorsByPub.set(c.publication_id, list);
  }

  const collegeByResearcher = new Map<string, string | null>();
  for (const r of (researchers as ResearcherRow[] | null) ?? []) {
    collegeByResearcher.set(r.id, r.college_id);
  }

  const rows: PublicationForOai[] = pubs.map((p) => {
    const collegeId = collegeByResearcher.get(p.researcher_id) ?? null;
    const college = collegeId ? lookups.colleges.get(collegeId) : null;
    const pubType = p.publication_type_id ? lookups.pubTypes.get(p.publication_type_id) : null;
    return {
      id: p.id,
      title: p.title,
      abstract: p.abstract,
      publication_year: p.publication_year,
      publication_date: p.publication_date,
      doi: p.doi,
      url: p.url,
      journal_name: p.journal_name,
      publisher: p.publisher,
      publication_type: pubType?.name_en ?? null,
      is_open_access: p.is_open_access,
      created_at: p.created_at,
      updated_at: p.updated_at,
      college_slug: college?.slug ?? null,
      authors: coauthorsByPub.get(p.id) ?? [],
      keywords: p.keywords ?? [],
    };
  });

  return { rows, total: count ?? rows.length };
}

export async function getPublication(id: string): Promise<PublicationForOai | null> {
  // Single-row fetch — GetRecord is the only verb that needs this path,
  // and routing it through listPublications would scan the whole table.
  const db = createAdminClient();
  const { data } = await db
    .from('researcher_publications_public')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const pub = data as PublicationRow;

  const [{ data: coauthors }, { data: researcher }, lookups] = await Promise.all([
    db
      .from('researcher_publication_coauthors_public')
      .select('author_order, author_name')
      .eq('publication_id', id)
      .order('author_order'),
    db.from('researchers_public').select('college_id').eq('id', pub.researcher_id).maybeSingle(),
    loadLookupMaps(),
  ]);

  const collegeId = (researcher as { college_id: string | null } | null)?.college_id ?? null;
  const college = collegeId ? lookups.colleges.get(collegeId) : null;
  const pubType = pub.publication_type_id ? lookups.pubTypes.get(pub.publication_type_id) : null;

  return {
    id: pub.id,
    title: pub.title,
    abstract: pub.abstract,
    publication_year: pub.publication_year,
    publication_date: pub.publication_date,
    doi: pub.doi,
    url: pub.url,
    journal_name: pub.journal_name,
    publisher: pub.publisher,
    publication_type: pubType?.name_en ?? null,
    is_open_access: pub.is_open_access,
    created_at: pub.created_at,
    updated_at: pub.updated_at,
    college_slug: college?.slug ?? null,
    authors: ((coauthors as { author_name: string }[] | null) ?? []).map((c) => c.author_name),
    keywords: pub.keywords ?? [],
  };
}

// Earliest publication row — used by Identify to populate
// earliestDatestamp. Cheap to compute on demand because we have an index
// on updated_at.
export async function getEarliestDatestamp(): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from('researcher_publications_public')
    .select('updated_at')
    .order('updated_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { updated_at: string } | null)?.updated_at ?? null;
}

export async function listColleges(): Promise<CollegeRow[]> {
  const db = createAdminClient();
  const { data } = await db.from('colleges').select('id, slug, name_en, name_ar').order('name_en');
  return (data as CollegeRow[] | null) ?? [];
}
