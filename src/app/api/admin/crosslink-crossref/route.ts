// Crossref-based co-author cross-linker. Stronger than the ORCID-API
// linker because:
//   * One API call per DOI (instead of walking every researcher's full
//     ORCID record).
//   * Crossref carries ORCID iDs registered by publishers at deposit
//     time — typically more complete than what researchers manually add
//     to their own ORCID work records.
//
// Flow per publication that has a DOI:
//   1. GET https://api.crossref.org/works/{doi}
//   2. For each author with an ORCID iD in the response, look up our
//      researcher with that ORCID iD.
//   3. If found AND not the publication's primary researcher, write
//      linked_researcher_id back to the matching coauthor row
//      (or insert a new row if no row matches by name).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchCrossrefAuthors } from '@/lib/coauthors/crossref-api';
import { normaliseName } from '@/lib/coauthors/linker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface PubRow {
  id: string;
  researcher_id: string;
  doi: string;
}

interface UnlinkedRow {
  author_order: number;
  author_name: string;
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

  const db = createAdminClient();

  // Index: ORCID iD → researcher_id. We need this to resolve each
  // Crossref author into one of our researchers.
  const { data: socials } = await db
    .from('researcher_social_profiles')
    .select('researcher_id, username')
    .eq('platform', 'orcid');

  const researcherByOrcid = new Map<string, string>();
  for (const row of (socials as Array<{ researcher_id: string; username: string }> | null) ?? []) {
    if (row.username) researcherByOrcid.set(row.username, row.researcher_id);
  }

  if (researcherByOrcid.size === 0) {
    return NextResponse.json({
      ok: true,
      examined_publications: 0,
      note: 'No researchers have an ORCID iD stored. Run the ORCID import first.',
    });
  }

  // Pull every publication with a DOI — that's our universe of work to
  // cross-reference.
  const { data: pubs } = await db
    .from('researcher_publications')
    .select('id, researcher_id, doi')
    .not('doi', 'is', null)
    .neq('doi', '');

  const rows = (pubs as PubRow[] | null) ?? [];

  let examined = 0;
  let crossrefHits = 0;
  let linked = 0;
  let noAuthors = 0;

  for (const pub of rows) {
    examined += 1;
    const authors = await fetchCrossrefAuthors(pub.doi);
    if (!authors || authors.length === 0) {
      noAuthors += 1;
      continue;
    }
    crossrefHits += 1;

    // Authors carrying an ORCID iD that matches one of our researchers.
    const matches = authors
      .filter((a) => a.orcid && researcherByOrcid.has(a.orcid))
      .map((a) => ({
        orcid: a.orcid!,
        researcher_id: researcherByOrcid.get(a.orcid!)!,
        name: [a.given, a.family].filter(Boolean).join(' ').trim(),
      }))
      .filter((m) => m.researcher_id !== pub.researcher_id);

    if (matches.length === 0) continue;

    // Pull the unlinked coauthor rows for this publication so we can
    // match each Crossref author to an existing row (or insert a new
    // row if there's no match).
    const { data: unlinkedRows } = await db
      .from('researcher_publication_coauthors')
      .select('author_order, author_name')
      .eq('publication_id', pub.id)
      .is('linked_researcher_id', null);
    const unlinked = (unlinkedRows as UnlinkedRow[] | null) ?? [];

    // Already-linked check: if a coauthor row for this pub already
    // points at researcher X, skip — done in a prior run.
    const { data: alreadyLinkedRows } = await db
      .from('researcher_publication_coauthors')
      .select('linked_researcher_id')
      .eq('publication_id', pub.id)
      .not('linked_researcher_id', 'is', null);
    const alreadyLinked = new Set(
      ((alreadyLinkedRows as Array<{ linked_researcher_id: string }> | null) ?? []).map(
        (r) => r.linked_researcher_id,
      ),
    );

    for (const m of matches) {
      if (alreadyLinked.has(m.researcher_id)) continue;

      const mNorm = normaliseName(m.name);
      const matchRow = unlinked.find((u) => {
        const uNorm = normaliseName(u.author_name);
        return uNorm === mNorm || uNorm.includes(mNorm) || mNorm.includes(uNorm);
      });

      if (matchRow) {
        const { error } = await db
          .from('researcher_publication_coauthors')
          .update({ linked_researcher_id: m.researcher_id })
          .eq('publication_id', pub.id)
          .eq('author_order', matchRow.author_order);
        if (!error) {
          linked += 1;
          const idx = unlinked.indexOf(matchRow);
          if (idx >= 0) unlinked.splice(idx, 1);
          alreadyLinked.add(m.researcher_id);
        }
      } else {
        // Insert a new row — Crossref knows about a co-author our import
        // missed entirely.
        const { data: maxRow } = await db
          .from('researcher_publication_coauthors')
          .select('author_order')
          .eq('publication_id', pub.id)
          .order('author_order', { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextOrder = ((maxRow as { author_order: number } | null)?.author_order ?? 0) + 1;
        const { error } = await db.from('researcher_publication_coauthors').insert({
          publication_id: pub.id,
          author_order: nextOrder,
          author_name: m.name || 'Unknown',
          linked_researcher_id: m.researcher_id,
        });
        if (!error) {
          linked += 1;
          alreadyLinked.add(m.researcher_id);
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    examined_publications: examined,
    crossref_hits: crossrefHits,
    no_authors_returned: noAuthors,
    linked,
  });
}
