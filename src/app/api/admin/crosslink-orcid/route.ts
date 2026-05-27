// ORCID-based co-author cross-reference. Strongest signal we have:
//   1. Every researcher in our DB with an ORCID iD in social_profiles
//      gets their full works list fetched from ORCID.
//   2. For each ORCID work that has a DOI matching one of our local
//      publications, we pull the work's full contributor list.
//   3. For each contributor that has an ORCID iD matching another
//      researcher in our DB, we set linked_researcher_id on the
//      corresponding researcher_publication_coauthors row.
//
// Why this works better than name matching: ORCID iDs are globally
// unique identifiers, so a match is deterministic — no fuzziness, no
// false positives from common Iraqi/Arabic names.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchWorksBatch, fetchWorksSummary } from '@/lib/coauthors/orcid-api';
import { normaliseName } from '@/lib/coauthors/linker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// ORCID fetches can take a few minutes for the full researcher set.
export const maxDuration = 300;

interface PubByDoi {
  id: string;
  researcher_id: string;
  doi: string;
}

interface UnlinkedCoauthor {
  publication_id: string;
  author_order: number;
  author_name: string;
}

function normaliseDoi(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '');
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

  // 1. Pull every (researcher_id, orcid) pair from social_profiles.
  const { data: socials } = await db
    .from('researcher_social_profiles')
    .select('researcher_id, username')
    .eq('platform', 'orcid');

  const orcidByResearcher = new Map<string, string>(); // researcher_id → orcid
  const researcherByOrcid = new Map<string, string>(); // orcid → researcher_id
  for (const row of (socials as Array<{ researcher_id: string; username: string }> | null) ?? []) {
    if (!row.username) continue;
    orcidByResearcher.set(row.researcher_id, row.username);
    researcherByOrcid.set(row.username, row.researcher_id);
  }

  if (orcidByResearcher.size === 0) {
    return NextResponse.json({
      ok: true,
      examined_researchers: 0,
      note: 'No researchers have an ORCID iD in researcher_social_profiles yet.',
    });
  }

  // 2. Build DOI → publication index so we can quickly find which of our
  //    rows correspond to each ORCID work.
  const { data: pubs } = await db
    .from('researcher_publications')
    .select('id, researcher_id, doi')
    .not('doi', 'is', null);

  const pubByDoi = new Map<string, PubByDoi>();
  for (const p of (pubs as PubByDoi[] | null) ?? []) {
    if (!p.doi) continue;
    pubByDoi.set(normaliseDoi(p.doi), p);
  }

  // 3. Walk every researcher's ORCID works.
  let examinedResearchers = 0;
  let examinedWorks = 0;
  let matchedDois = 0;
  let linked = 0;

  for (const [researcherId, orcid] of orcidByResearcher.entries()) {
    examinedResearchers += 1;

    const summaries = await fetchWorksSummary(orcid);
    if (summaries.length === 0) continue;
    examinedWorks += summaries.length;

    // Pre-filter to put-codes whose DOIs are in our DB. Saves big chunks
    // of API time for prolific researchers whose ORCID has many works
    // we haven't imported.
    const interesting = summaries.filter((s) => s.doi && pubByDoi.has(normaliseDoi(s.doi)));
    if (interesting.length === 0) continue;
    matchedDois += interesting.length;

    const contribsByPutCode = await fetchWorksBatch(
      orcid,
      interesting.map((s) => s.putCode),
    );

    for (const work of interesting) {
      const pub = pubByDoi.get(normaliseDoi(work.doi!))!;
      const contributors = contribsByPutCode.get(work.putCode) ?? [];

      // Pull the existing unlinked co-author rows once per publication
      // so we can update by best name match without per-contributor
      // round-trips.
      const { data: unlinkedRows } = await db
        .from('researcher_publication_coauthors')
        .select('author_order, author_name')
        .eq('publication_id', pub.id)
        .is('linked_researcher_id', null);
      const unlinked = (unlinkedRows as UnlinkedCoauthor[] | null) ?? [];

      for (const contrib of contributors) {
        if (!contrib.orcid) continue;
        const otherResearcherId = researcherByOrcid.get(contrib.orcid);
        if (!otherResearcherId) continue;
        if (otherResearcherId === pub.researcher_id) continue;
        if (otherResearcherId === researcherId) continue;

        // Find the unlinked row whose name best matches the contributor.
        const contribNorm = normaliseName(contrib.name);
        const matchRow = unlinked.find((u) => {
          const u_norm = normaliseName(u.author_name);
          return (
            u_norm === contribNorm || u_norm.includes(contribNorm) || contribNorm.includes(u_norm)
          );
        });

        if (matchRow) {
          const { error } = await db
            .from('researcher_publication_coauthors')
            .update({ linked_researcher_id: otherResearcherId })
            .eq('publication_id', pub.id)
            .eq('author_order', matchRow.author_order);
          if (!error) {
            linked += 1;
            // Remove from in-memory unlinked so the next contributor
            // doesn't claim the same slot.
            const idx = unlinked.indexOf(matchRow);
            if (idx >= 0) unlinked.splice(idx, 1);
          }
        } else {
          // No matching row — insert a new one at the end. This happens
          // when ORCID's contributor list is fuller than what Scholar/CSV
          // captured (or when names differ enough that the fuzzy match
          // misses).
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
            author_name: contrib.name || 'Unknown',
            linked_researcher_id: otherResearcherId,
          });
          if (!error) linked += 1;
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    examined_researchers: examinedResearchers,
    examined_works: examinedWorks,
    matched_dois: matchedDois,
    linked,
  });
}
