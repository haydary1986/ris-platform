// Featured publications strip on the landing page. Auto-curated: takes
// the top N recent + highly-cited papers so it always has fresh content
// without anyone having to manage a CMS. RSS feed at /feed.xml serves
// the same list for newsreaders.
//
// Server component — fetched at request time so admin/import updates
// show up within the page revalidation window.

import { ExternalLink, FileText, Quote, Sparkles } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';

interface FeaturedRow {
  id: string;
  title: string;
  publication_year: number | null;
  journal_name: string | null;
  doi: string | null;
  is_open_access: boolean;
  scopus_citations: number | null;
  influential_citations: number | null;
  tldr: string | null;
}

const FEATURED_LIMIT = 6;
const RECENT_WINDOW_DAYS = 365 * 2; // 2 years counts as "recent"

async function fetchFeatured(): Promise<FeaturedRow[]> {
  try {
    const supabase = await createClient();
    // Prefer papers that are both recent (within the window) AND have at
    // least one citation — that's the closest proxy for "featured" we
    // can compute without an editor curating manually.
    const cutoff = new Date(Date.now() - RECENT_WINDOW_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const { data } = await supabase
      .from('researcher_publications_public')
      .select(
        'id, title, publication_year, journal_name, doi, is_open_access, scopus_citations, influential_citations, tldr',
      )
      .gte('publication_date', cutoff)
      .order('scopus_citations', { ascending: false, nullsFirst: false })
      .limit(FEATURED_LIMIT);
    return (data ?? []) as FeaturedRow[];
  } catch {
    return [];
  }
}

export async function FeaturedPublications() {
  const t = await getTranslations('landing.featured_publications');
  const locale = await getLocale();
  const items = await fetchFeatured();
  if (items.length === 0) return null;
  const fmt = (n: number): string => new Intl.NumberFormat(locale).format(n);

  return (
    <section className="border-b bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <p className="text-primary text-xs font-semibold uppercase tracking-wider">
              {t('eyebrow')}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h2>
            <p className="text-muted-foreground text-sm sm:text-base">{t('subtitle')}</p>
          </div>
          <a
            href="/feed.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-medium hover:underline"
          >
            <ExternalLink className="size-3.5" />
            RSS
          </a>
        </div>

        <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/publication/${p.id}` as `/publication/${string}`}
                className="bg-card hover:border-primary/40 hover:shadow-sm group flex h-full flex-col rounded-lg border p-5 transition-all"
              >
                <FileText className="text-primary mb-3 size-5" />
                <h3 className="text-sm font-semibold leading-snug tracking-tight line-clamp-3">
                  {p.title}
                </h3>
                {p.tldr ? (
                  <p className="text-muted-foreground mt-2 flex gap-1.5 text-xs leading-relaxed line-clamp-3">
                    <Sparkles className="text-primary mt-0.5 size-3 shrink-0" />
                    <span>{p.tldr}</span>
                  </p>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs">
                  {p.journal_name ? (
                    <span className="text-muted-foreground line-clamp-1">{p.journal_name}</span>
                  ) : null}
                  {p.publication_year ? (
                    <span className="text-muted-foreground tabular-nums">{p.publication_year}</span>
                  ) : null}
                  {p.scopus_citations !== null && p.scopus_citations > 0 ? (
                    <span className="text-muted-foreground inline-flex items-center gap-0.5 tabular-nums">
                      <Quote className="size-3" />
                      {fmt(p.scopus_citations)}
                    </span>
                  ) : null}
                  {p.is_open_access ? (
                    <span className="text-emerald-600 font-medium dark:text-emerald-400">OA</span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
