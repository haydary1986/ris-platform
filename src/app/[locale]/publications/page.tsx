import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ExternalLink, Quote, TrendingUp } from 'lucide-react';

export const revalidate = 300;

const OPENALEX_INSTITUTION_ID = 'I2801460691';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string; type?: string; page?: string }>;
}

interface OpenAlexWork {
  title: string;
  publication_year: number | null;
  doi: string | null;
  cited_by_count: number;
  type: string;
  is_oa: boolean;
  authorships: Array<{ author: { display_name: string } }>;
  primary_location?: { source?: { display_name: string } } | null;
}

async function fetchPublications(year?: string, type?: string, page = 1) {
  const filters = [`institutions.id:${OPENALEX_INSTITUTION_ID}`];
  if (year) filters.push(`publication_year:${year}`);
  if (type) filters.push(`type:${type}`);

  const res = await fetch(
    `https://api.openalex.org/works?filter=${filters.join(',')}&per_page=25&page=${page}&sort=cited_by_count:desc&select=title,publication_year,doi,cited_by_count,type,is_oa,authorships,primary_location`,
    { next: { revalidate: 300 } },
  );
  if (!res.ok) return { total: 0, works: [], perPage: 25 };
  const d = await res.json();
  return {
    total: d.meta?.count ?? 0,
    works: (d.results ?? []) as OpenAlexWork[],
    perPage: d.meta?.per_page ?? 25,
  };
}

async function fetchYearFacets() {
  const res = await fetch(
    `https://api.openalex.org/works?filter=institutions.id:${OPENALEX_INSTITUTION_ID}&group_by=publication_year`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) return [];
  const d = await res.json();
  return (d.group_by ?? [])
    .filter((g: { key: string; count: number }) => Number(g.key) >= 2015)
    .sort((a: { key: string }, b: { key: string }) => Number(b.key) - Number(a.key)) as Array<{
    key: string;
    count: number;
  }>;
}

export default async function PublicationsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const sp = await searchParams;
  const isAr = locale === 'ar';
  const currentPage = Math.max(1, Number(sp.page) || 1);

  const [{ total, works }, yearFacets] = await Promise.all([
    fetchPublications(sp.year, sp.type, currentPage),
    fetchYearFacets(),
  ]);

  const totalPages = Math.ceil(total / 25);

  return (
    <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {isAr ? 'المنشورات البحثية للجامعة' : 'University Research Publications'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr
            ? `${total.toLocaleString('ar')} منشور بحثي مفهرس — بيانات من OpenAlex`
            : `${total.toLocaleString('en')} indexed publications — Data from OpenAlex`}
        </p>
      </header>

      {/* Year filter chips */}
      <div className="flex flex-wrap gap-2">
        <a
          href={`/${locale}/publications`}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${!sp.year ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          {isAr ? 'الكل' : 'All'}
        </a>
        {yearFacets.map((y) => (
          <a
            key={y.key}
            href={`/${locale}/publications?year=${y.key}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${sp.year === y.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {y.key} ({y.count})
          </a>
        ))}
      </div>

      {/* Publications list */}
      <div className="space-y-3">
        {works.map((w, i) => {
          const authors = (w.authorships ?? [])
            .slice(0, 4)
            .map((a) => a.author?.display_name)
            .filter(Boolean)
            .join(', ');
          const journal = w.primary_location?.source?.display_name;
          const doiUrl = w.doi ? `https://doi.org/${w.doi.replace('https://doi.org/', '')}` : null;

          return (
            <a
              key={i}
              href={doiUrl ?? '#'}
              target={doiUrl ? '_blank' : undefined}
              rel={doiUrl ? 'noopener' : undefined}
              className="block"
            >
              <Card className="hover:border-primary/40 hover:shadow-sm transition-all">
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-medium leading-snug">{w.title}</h3>
                    <div className="flex shrink-0 items-center gap-2">
                      {w.publication_year ? (
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {w.publication_year}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {authors ? (
                    <p className="text-xs text-muted-foreground italic">
                      {authors}
                      {(w.authorships?.length ?? 0) > 4 ? ' et al.' : ''}
                    </p>
                  ) : null}
                  {journal ? <p className="text-xs text-muted-foreground">{journal}</p> : null}
                  <div className="flex flex-wrap items-center gap-2">
                    {w.cited_by_count > 0 ? (
                      <Badge variant="secondary" className="text-[10px]">
                        <Quote className="size-2.5 me-1" /> {w.cited_by_count}
                      </Badge>
                    ) : null}
                    {w.is_oa ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-green-600 border-green-300"
                      >
                        OA
                      </Badge>
                    ) : null}
                    {doiUrl ? (
                      <span className="text-primary inline-flex items-center gap-1 text-[10px]">
                        <ExternalLink className="size-2.5" /> DOI
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </a>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <a
              href={`/${locale}/publications?${new URLSearchParams({ ...(sp.year ? { year: sp.year } : {}), page: String(currentPage - 1) })}`}
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
              href={`/${locale}/publications?${new URLSearchParams({ ...(sp.year ? { year: sp.year } : {}), page: String(currentPage + 1) })}`}
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
