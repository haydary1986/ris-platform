import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { routing, type Locale } from '@/i18n/routing';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/seo/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ExternalLink, Quote } from 'lucide-react';

export const revalidate = 3600;

const OPENALEX_INSTITUTION_ID = 'I2801460691';

interface SdgPageProps {
  params: Promise<{ locale: string; number: string }>;
}

async function fetchSdgGoal(goalNumber: number) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('un_sdg_goals')
      .select('id, number, name_en, name_ar, color')
      .eq('number', goalNumber)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

interface OpenAlexWork {
  title: string;
  publication_year: number | null;
  doi: string | null;
  cited_by_count: number;
  authorships: Array<{ author: { display_name: string } }>;
  primary_location?: { source?: { display_name: string } } | null;
}

async function fetchSdgPublications(sdgNumber: number) {
  try {
    const res = await fetch(
      `https://api.openalex.org/works?filter=institutions.id:${OPENALEX_INSTITUTION_ID},sustainable_development_goals.id:https://metadata.un.org/sdg/${sdgNumber}&per_page=50&sort=cited_by_count:desc&select=title,publication_year,doi,cited_by_count,authorships,primary_location`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return { total: 0, works: [] };
    const d = await res.json();
    return {
      total: d.meta?.count ?? 0,
      works: (d.results ?? []) as OpenAlexWork[],
    };
  } catch {
    return { total: 0, works: [] };
  }
}

export async function generateMetadata({ params }: SdgPageProps): Promise<Metadata> {
  const { locale, number: num } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const goalNumber = parseInt(num, 10);
  if (isNaN(goalNumber) || goalNumber < 1 || goalNumber > 17) return { title: '404' };

  const goal = await fetchSdgGoal(goalNumber);
  if (!goal) return { title: '404' };

  const typedLocale = locale as Locale;
  const name = `SDG ${goal.number}: ${typedLocale === 'ar' ? goal.name_ar : goal.name_en}`;
  const path = `/sdg/${num}`;
  const alts = buildLanguageAlternates(path);

  return {
    title: name,
    alternates: {
      canonical: canonicalForLocale(typedLocale, path),
      languages: alts.languages,
    },
    openGraph: { type: 'website', title: name, locale },
  };
}

export default async function SdgPage({ params }: SdgPageProps) {
  const { locale, number: num } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const goalNumber = parseInt(num, 10);
  if (isNaN(goalNumber) || goalNumber < 1 || goalNumber > 17) notFound();

  const goal = await fetchSdgGoal(goalNumber);
  if (!goal) notFound();

  const typedLocale = locale as Locale;
  const isAr = typedLocale === 'ar';
  const goalName = isAr ? goal.name_ar : goal.name_en;

  const { total, works } = await fetchSdgPublications(goalNumber);

  const totalCitations = works.reduce((sum, w) => sum + w.cited_by_count, 0);

  const breadcrumbs: BreadcrumbItem[] = [
    { href: '/researchers', label: 'researchers' },
    { label: `SDG ${goal.number}` },
  ];

  return (
    <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <Breadcrumbs items={breadcrumbs} />

      <div className="rounded-xl p-6 shadow-lg" style={{ backgroundColor: goal.color }}>
        <div className="flex items-start gap-4">
          <span className="text-4xl font-black text-white/30">{goal.number}</span>
          <div>
            <h1 className="text-2xl font-bold text-white">{goalName}</h1>
            <p className="mt-1 text-sm text-white/80">
              SDG {goal.number} —{' '}
              {isAr ? 'أهداف التنمية المستدامة' : 'Sustainable Development Goals'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <BookOpen className="size-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{total.toLocaleString(locale)}</p>
              <p className="text-xs text-muted-foreground">
                {isAr ? 'منشور بحثي' : 'Publications'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Quote className="size-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalCitations.toLocaleString(locale)}</p>
              <p className="text-xs text-muted-foreground">{isAr ? 'اقتباس' : 'Citations'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="flex items-center gap-3 py-4">
            <Badge
              variant="outline"
              className="px-3 py-1 text-sm font-semibold"
              style={{ borderColor: goal.color, color: goal.color }}
            >
              SDG {goal.number}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {isAr ? 'بيانات من OpenAlex' : 'Data from OpenAlex'}
            </p>
          </CardContent>
        </Card>
      </div>

      {works.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          {isAr
            ? 'لا توجد منشورات مرتبطة بهذا الهدف بعد.'
            : 'No publications linked to this goal yet.'}
        </p>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{isAr ? 'أبرز المنشورات' : 'Top Publications'}</h2>
          {works.map((w, i) => {
            const authors = (w.authorships ?? [])
              .slice(0, 3)
              .map((a) => a.author?.display_name)
              .filter(Boolean)
              .join(', ');
            const journal = w.primary_location?.source?.display_name;
            const doiUrl = w.doi
              ? `https://doi.org/${w.doi.replace('https://doi.org/', '')}`
              : null;
            return (
              <a
                key={i}
                href={doiUrl ?? '#'}
                target={doiUrl ? '_blank' : undefined}
                rel={doiUrl ? 'noopener' : undefined}
                className={`block ${doiUrl ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <Card className="hover:border-primary/40 hover:shadow-md transition-all">
                  <CardContent className="space-y-2 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-medium leading-snug group-hover:text-primary">
                        {w.title}
                      </h3>
                      {w.publication_year ? (
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {w.publication_year}
                        </span>
                      ) : null}
                    </div>
                    {authors ? (
                      <p className="text-xs text-muted-foreground italic">
                        {authors}
                        {(w.authorships?.length ?? 0) > 3 ? ' et al.' : ''}
                      </p>
                    ) : null}
                    {journal ? <p className="text-xs text-muted-foreground">{journal}</p> : null}
                    <div className="flex items-center gap-3">
                      {w.cited_by_count > 0 ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {w.cited_by_count} {isAr ? 'اقتباس' : 'citations'}
                        </Badge>
                      ) : null}
                      {doiUrl ? (
                        <span className="text-primary inline-flex items-center gap-1 text-[10px]">
                          <ExternalLink className="size-3" />
                          {isAr ? 'عرض البحث' : 'View publication'}
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      )}
    </main>
  );
}
