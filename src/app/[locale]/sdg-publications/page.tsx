import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Quote } from 'lucide-react';

export const revalidate = 3600;

const OPENALEX_INSTITUTION_ID = 'I2801460691';

// SDG colors from UN
const SDG_COLORS: Record<string, string> = {
  '1': '#E5243B',
  '2': '#DDA63A',
  '3': '#4C9F38',
  '4': '#C5192D',
  '5': '#FF3A21',
  '6': '#26BDE2',
  '7': '#FCC30B',
  '8': '#A21942',
  '9': '#FD6925',
  '10': '#DD1367',
  '11': '#FD9D24',
  '12': '#BF8B2E',
  '13': '#3F7E44',
  '14': '#0A97D9',
  '15': '#56C02B',
  '16': '#00689D',
  '17': '#19486A',
};

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}

interface SdgGoal {
  id: string;
  display_name: string;
  score: number;
}

interface OpenAlexWork {
  title: string;
  publication_year: number | null;
  doi: string | null;
  cited_by_count: number;
  sustainable_development_goals: SdgGoal[];
  authorships: Array<{ author: { display_name: string } }>;
  primary_location?: { source?: { display_name: string } } | null;
  open_access?: { is_oa: boolean };
}

async function fetchSdgWorks(page: number) {
  const res = await fetch(
    `https://api.openalex.org/works?filter=institutions.id:${OPENALEX_INSTITUTION_ID},has_sdg:true&per_page=20&page=${page}&sort=cited_by_count:desc&select=title,publication_year,doi,cited_by_count,sustainable_development_goals,authorships,primary_location,open_access`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) return { total: 0, works: [] };
  const d = await res.json();
  return {
    total: d.meta?.count ?? 0,
    works: (d.results ?? []) as OpenAlexWork[],
  };
}

export default async function SdgPublicationsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const sp = await searchParams;
  const isAr = locale === 'ar';
  const currentPage = Math.max(1, Number(sp.page) || 1);

  const { total, works } = await fetchSdgWorks(currentPage);
  const totalPages = Math.ceil(total / 20);

  return (
    <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <header className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {isAr ? 'أبحاث التنمية المستدامة' : 'SDG Research Publications'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? `${total.toLocaleString('ar')} بحث مرتبط بأهداف التنمية المستدامة — جامعة التراث`
            : `${total.toLocaleString('en')} publications linked to UN SDGs — AL-Turath University`}
        </p>
      </header>

      <div className="space-y-3">
        {works.map((w, i) => {
          const doiUrl = w.doi ? `https://doi.org/${w.doi.replace('https://doi.org/', '')}` : null;
          const authors = (w.authorships ?? [])
            .slice(0, 3)
            .map((a) => a.author?.display_name)
            .filter(Boolean)
            .join(', ');
          const journal = w.primary_location?.source?.display_name;
          const sdgs = (w.sustainable_development_goals ?? [])
            .filter((s) => s.score > 0.2)
            .sort((a, b) => b.score - a.score);

          return (
            <Card key={i} className="hover:border-primary/30 transition-all">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={doiUrl ?? '#'}
                    target={doiUrl ? '_blank' : undefined}
                    rel={doiUrl ? 'noopener' : undefined}
                    className="flex-1"
                  >
                    <h3 className="text-sm font-medium leading-snug hover:text-primary transition-colors">
                      {w.title}
                    </h3>
                  </a>
                  {w.publication_year && (
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {w.publication_year}
                    </span>
                  )}
                </div>

                {authors && (
                  <p className="text-xs text-muted-foreground italic">
                    {authors}
                    {(w.authorships?.length ?? 0) > 3 ? ' et al.' : ''}
                  </p>
                )}
                {journal && <p className="text-xs text-muted-foreground">{journal}</p>}

                <div className="flex items-center justify-between gap-3">
                  {/* SDG icons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {sdgs.map((sdg) => {
                      const num = sdg.id.split('/').pop() ?? '';
                      return (
                        <Link
                          key={sdg.id}
                          href={`/sdg/${num}`}
                          title={`SDG ${num}: ${sdg.display_name}`}
                        >
                          <Image
                            src={`/sdg/${locale}/goal-${num.padStart(2, '0')}.png`}
                            alt={`SDG ${num}`}
                            width={32}
                            height={32}
                            className="size-7 rounded transition hover:scale-110"
                          />
                        </Link>
                      );
                    })}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    {w.cited_by_count > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Quote className="size-2.5 me-0.5" /> {w.cited_by_count}
                      </Badge>
                    )}
                    {w.open_access?.is_oa && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-green-600 border-green-300"
                      >
                        OA
                      </Badge>
                    )}
                    {doiUrl && (
                      <a
                        href={doiUrl}
                        target="_blank"
                        rel="noopener"
                        className="text-primary inline-flex items-center gap-0.5 text-[10px]"
                      >
                        <ExternalLink className="size-2.5" /> DOI
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <a
              href={`/${locale}/sdg-publications?page=${currentPage - 1}`}
              className="rounded border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {isAr ? 'السابق' : 'Previous'}
            </a>
          )}
          <span className="text-xs text-muted-foreground">
            {isAr ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
          </span>
          {currentPage < totalPages && (
            <a
              href={`/${locale}/sdg-publications?page=${currentPage + 1}`}
              className="rounded border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {isAr ? 'التالي' : 'Next'}
            </a>
          )}
        </div>
      )}
    </main>
  );
}
