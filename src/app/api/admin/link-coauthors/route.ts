// Admin endpoint: walks researcher_publication_coauthors rows with
// linked_researcher_id IS NULL, attempts to match each author_name
// against an existing researcher record, and writes the link back.
// Needed because import flows (Scholar CSV, ORCID, Scopus) only know
// names — they don't have the IDs of co-authors.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildIndex, matchAuthor } from '@/lib/coauthors/linker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ResearcherRow {
  id: string;
  full_name_en: string;
  full_name_ar: string;
}

interface CoauthorRow {
  publication_id: string;
  author_order: number;
  author_name: string;
  // Skip rows for the publication's primary researcher — those are
  // self-references, never matter for the network.
  publication_researcher_id: string;
}

export async function POST(request: Request): Promise<Response> {
  void request;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const adminDb = createAdminClient();

  const [{ data: researchers }, { data: coauthors }] = await Promise.all([
    adminDb.from('researchers').select('id, full_name_en, full_name_ar'),
    adminDb
      .from('researcher_publication_coauthors')
      .select(
        'publication_id, author_order, author_name, researcher_publications!inner(researcher_id)',
      )
      .is('linked_researcher_id', null),
  ]);

  if (!researchers || !coauthors) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  const index = buildIndex(researchers as ResearcherRow[]);

  // PostgREST nested select returns the joined column inside an object.
  // Normalise into the shape the linker expects.
  const flattened: CoauthorRow[] = (
    coauthors as Array<{
      publication_id: string;
      author_order: number;
      author_name: string;
      researcher_publications: { researcher_id: string } | { researcher_id: string }[];
    }>
  ).map((c) => {
    const pub = Array.isArray(c.researcher_publications)
      ? c.researcher_publications[0]
      : c.researcher_publications;
    return {
      publication_id: c.publication_id,
      author_order: c.author_order,
      author_name: c.author_name,
      publication_researcher_id: pub?.researcher_id ?? '',
    };
  });

  let examined = 0;
  let linked = 0;
  let skippedSelf = 0;

  // Update in chunks so PostgREST request size stays bounded.
  const updates: Array<{
    publication_id: string;
    author_order: number;
    linked_researcher_id: string;
  }> = [];
  for (const c of flattened) {
    examined += 1;
    const matchId = matchAuthor(c.author_name, index);
    if (!matchId) continue;
    // Skip the trivial case where the co-author is the publication's
    // own researcher — that's not a collaboration edge.
    if (matchId === c.publication_researcher_id) {
      skippedSelf += 1;
      continue;
    }
    updates.push({
      publication_id: c.publication_id,
      author_order: c.author_order,
      linked_researcher_id: matchId,
    });
  }

  // Apply updates one row at a time — Supabase upsert against a
  // composite primary key works, and the volume here is small enough
  // (few hundred linkages on first run, far fewer on incremental runs)
  // that batching isn't worth the complexity.
  for (const u of updates) {
    const { error } = await adminDb
      .from('researcher_publication_coauthors')
      .update({ linked_researcher_id: u.linked_researcher_id })
      .eq('publication_id', u.publication_id)
      .eq('author_order', u.author_order);
    if (!error) linked += 1;
  }

  return NextResponse.json({
    ok: true,
    examined,
    linked,
    skipped_self: skippedSelf,
    remaining_unlinked: examined - linked - skippedSelf,
  });
}
