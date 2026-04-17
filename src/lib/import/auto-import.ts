import { createAdminClient } from '@/lib/supabase/admin';
import { logError } from '@/lib/logger';

const OPENALEX_API = 'https://api.openalex.org';
const INSTITUTION_ID = 'I2801460691';
const INSTITUTION_DOMAIN = 'uoturath.edu.iq';

interface OpenAlexAuthor {
  id: string;
  display_name: string;
  works_count: number;
  cited_by_count: number;
  summary_stats?: { h_index?: number };
  last_known_institutions?: Array<{ id?: string; display_name?: string }>;
  works_api_url?: string;
}

interface OpenAlexWork {
  title?: string;
  doi?: string;
  publication_year?: number;
  primary_location?: {
    source?: { display_name?: string };
    landing_page_url?: string;
  };
  open_access?: { is_oa?: boolean };
  cited_by_count?: number;
  authorships?: Array<{
    author?: { display_name?: string };
    institutions?: Array<{ id?: string }>;
  }>;
}

function isAffiliated(author: OpenAlexAuthor): boolean {
  return (author.last_known_institutions ?? []).some(
    (inst) =>
      inst.id === `https://openalex.org/${INSTITUTION_ID}` ||
      (inst.display_name ?? '').includes('Al-Turath'),
  );
}

export async function autoImportForUser(
  userId: string,
  email: string,
): Promise<{ imported: boolean; publications: number; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { data: researcher } = await supabase
      .from('researchers')
      .select('id, full_name_en, openalex_last_synced_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!researcher) return { imported: false, publications: 0, error: 'no_profile' };
    if (researcher.openalex_last_synced_at) return { imported: false, publications: 0 };

    const emailDomain = email.split('@')[1] ?? '';
    let author: OpenAlexAuthor | null = null;

    // Strategy 1: Search by institutional email
    if (emailDomain === INSTITUTION_DOMAIN) {
      const emailRes = await fetch(
        `${OPENALEX_API}/authors?search=${encodeURIComponent(email)}&mailto=ris@${INSTITUTION_DOMAIN}`,
        { cache: 'no-store' },
      );
      if (emailRes.ok) {
        const data = (await emailRes.json()) as { results?: OpenAlexAuthor[] };
        author = data.results?.find(isAffiliated) ?? null;
      }
    }

    // Strategy 2: Search by name + filter by institution
    if (!author && researcher.full_name_en) {
      const nameRes = await fetch(
        `${OPENALEX_API}/authors?search=${encodeURIComponent(researcher.full_name_en)}&filter=last_known_institutions.id:${INSTITUTION_ID}&mailto=ris@${INSTITUTION_DOMAIN}`,
        { cache: 'no-store' },
      );
      if (nameRes.ok) {
        const data = (await nameRes.json()) as { results?: OpenAlexAuthor[] };
        author = data.results?.find(isAffiliated) ?? null;
      }
    }

    if (!author) {
      await supabase
        .from('researchers')
        .update({ openalex_last_synced_at: new Date().toISOString() })
        .eq('id', researcher.id);
      return { imported: false, publications: 0 };
    }

    await supabase
      .from('researchers')
      .update({
        openalex_h_index: author.summary_stats?.h_index ?? null,
        openalex_publications_count: author.works_count ?? null,
        openalex_citations_count: author.cited_by_count ?? null,
        openalex_last_synced_at: new Date().toISOString(),
      })
      .eq('id', researcher.id);

    // Fetch ALL publications for this verified researcher (acts as their CV)
    const worksUrl = `${OPENALEX_API}/works?filter=author.id:${author.id}&per_page=50&sort=publication_year:desc&mailto=ris@${INSTITUTION_DOMAIN}`;
    const worksRes = await fetch(worksUrl, { cache: 'no-store' });

    let pubCount = 0;

    if (worksRes.ok) {
      const worksData = (await worksRes.json()) as { results?: OpenAlexWork[] };
      const publications = (worksData.results ?? [])
        .filter((w) => w.title)
        .map((w) => ({
          title: w.title,
          doi: w.doi?.replace('https://doi.org/', '') ?? null,
          publication_year: w.publication_year ?? null,
          journal_name: w.primary_location?.source?.display_name ?? null,
          url: w.primary_location?.landing_page_url ?? null,
          is_open_access: w.open_access?.is_oa ?? false,
          scopus_citations: w.cited_by_count ?? 0,
          authors: w.authorships?.map((a) => a.author?.display_name ?? '').filter(Boolean) ?? [],
        }));

      if (publications.length > 0) {
        const { data: result } = await supabase.rpc('merge_publications', {
          p_researcher_id: researcher.id,
          p_publications: publications,
          p_source_name: 'openalex',
        });
        pubCount = (result as { inserted?: number })?.inserted ?? 0;
      }
    }

    return { imported: true, publications: pubCount };
  } catch (e) {
    await logError('auto-import.openalex', String(e), { userId, email }).catch(() => {});
    return { imported: false, publications: 0, error: String(e) };
  }
}

// --- ORCID Public API auto-import (no OAuth needed) ---

export async function autoImportFromOrcid(
  userId: string,
  email: string,
): Promise<{ imported: boolean; publications: number }> {
  try {
    const supabase = createAdminClient();

    const { data: researcher } = await supabase
      .from('researchers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!researcher) return { imported: false, publications: 0 };

    const searchRes = await fetch(
      `https://pub.orcid.org/v3.0/search/?q=email:${encodeURIComponent(email)}`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' },
    );
    if (!searchRes.ok) return { imported: false, publications: 0 };

    const searchData = (await searchRes.json()) as {
      result?: Array<{ 'orcid-identifier'?: { path?: string } }>;
    };
    const orcidId = searchData.result?.[0]?.['orcid-identifier']?.path;
    if (!orcidId) return { imported: false, publications: 0 };

    const worksRes = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/works`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!worksRes.ok) return { imported: false, publications: 0 };

    const worksData = (await worksRes.json()) as {
      group?: Array<{ 'work-summary'?: Array<Record<string, unknown>> }>;
    };

    const pubs = (worksData.group ?? []).flatMap((g) =>
      (g['work-summary'] ?? [])
        .slice(0, 1)
        .map((w) => {
          const titleObj = w.title as Record<string, Record<string, string>> | undefined;
          const title = titleObj?.title?.value ?? '';
          const yearObj = w['publication-date'] as
            | Record<string, Record<string, string>>
            | undefined;
          const year = yearObj?.year?.value ? Number(yearObj.year.value) : null;
          const journalObj = w['journal-title'] as Record<string, string> | undefined;
          const journal = journalObj?.value ?? null;
          const idsObj = w['external-ids'] as
            | Record<string, Array<Record<string, string>>>
            | undefined;
          const ids = idsObj?.['external-id'] ?? [];
          const doi =
            ids.find((x) => x['external-id-type'] === 'doi')?.['external-id-value'] ?? null;
          return { title, doi, publication_year: year, journal_name: journal };
        })
        .filter((p) => p.title),
    );

    if (pubs.length === 0) return { imported: false, publications: 0 };

    await supabase.from('researcher_social_profiles').upsert(
      {
        researcher_id: researcher.id,
        platform: 'orcid',
        username: orcidId,
        url: `https://orcid.org/${orcidId}`,
        display_order: 0,
      },
      { onConflict: 'researcher_id,platform' },
    );

    const { data: result } = await supabase.rpc('merge_publications', {
      p_researcher_id: researcher.id,
      p_publications: pubs,
      p_source_name: 'orcid',
    });

    return { imported: true, publications: (result as { inserted?: number })?.inserted ?? 0 };
  } catch {
    return { imported: false, publications: 0 };
  }
}
