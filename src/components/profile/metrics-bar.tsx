// Researcher Metrics Bar — surfaces the four headline bibliometric numbers
// (publications, citations, h-index, i10-index) right under the hero so
// they're not buried inside the Publications tab. Sourced from the columns
// the platform already syncs from Scopus/OpenAlex; i10 is computed from
// the locally stored publication rows since neither vendor exposes it
// directly in the bibliometric summary.

import { BookOpen, GraduationCap, Quote, TrendingUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getLocale } from 'next-intl/server';
import type { ProfilePayload } from '@/lib/profile/types';

interface MetricsBarProps {
  payload: ProfilePayload;
}

// Pick the most complete bibliometric source. Scopus first when it has a
// non-trivial signal, then OpenAlex (broader coverage but lower precision),
// then WoS as a last resort. The numbers don't aggregate well across
// sources so we choose one rather than summing.
function pickMetrics(profile: ProfilePayload['profile']): {
  publications: number | null;
  citations: number | null;
  hIndex: number | null;
} {
  if ((profile.scopus_publications_count ?? 0) > 0) {
    return {
      publications: profile.scopus_publications_count,
      citations: profile.scopus_citations_count,
      hIndex: profile.scopus_h_index,
    };
  }
  if ((profile.openalex_publications_count ?? 0) > 0) {
    return {
      publications: profile.openalex_publications_count,
      citations: profile.openalex_citations_count,
      hIndex: profile.openalex_h_index,
    };
  }
  return {
    publications: profile.wos_publications_count,
    citations: profile.wos_citations_count,
    hIndex: profile.wos_h_index,
  };
}

// i10-index = number of publications with ≥10 citations.
// Computed across the union of citation sources stored per publication
// (max of scopus/wos/scholar/influential) so we surface the strongest
// available evidence per paper without double-counting.
function computeI10(publications: ProfilePayload['publications']): number {
  let n = 0;
  for (const p of publications) {
    const best = Math.max(
      p.scopus_citations ?? 0,
      p.wos_citations ?? 0,
      p.scholar_citations ?? 0,
      p.influential_citations ?? 0,
    );
    if (best >= 10) n += 1;
  }
  return n;
}

export async function MetricsBar({ payload }: MetricsBarProps) {
  const t = await getTranslations('profile.metrics');
  const locale = await getLocale();
  const fmt = (n: number | null): string =>
    n === null ? '—' : new Intl.NumberFormat(locale).format(n);

  const { publications, citations, hIndex } = pickMetrics(payload.profile);
  const i10 = computeI10(payload.publications);

  // Use the locally-counted publication list as a fallback when neither
  // Scopus nor OpenAlex returned a count yet (common for freshly imported
  // ORCID-only researchers).
  const publicationsCount =
    publications && publications > 0 ? publications : payload.publications.length;

  const cards = [
    {
      icon: BookOpen,
      value: fmt(publicationsCount),
      label: t('publications'),
      tooltip: t('publications_tooltip'),
    },
    {
      icon: Quote,
      value: fmt(citations),
      label: t('citations'),
      tooltip: t('citations_tooltip'),
    },
    {
      icon: TrendingUp,
      value: fmt(hIndex),
      label: t('h_index'),
      tooltip: t('h_index_tooltip'),
    },
    {
      icon: GraduationCap,
      value: fmt(i10),
      label: t('i10_index'),
      tooltip: t('i10_index_tooltip'),
    },
  ];

  return (
    <section className="border-b bg-muted/30" aria-label={t('section_label')}>
      <div className="container mx-auto px-4 py-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                title={c.tooltip}
                className="bg-card flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-none tabular-nums">{c.value}</p>
                  <p className="text-muted-foreground mt-1 truncate text-xs">{c.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
