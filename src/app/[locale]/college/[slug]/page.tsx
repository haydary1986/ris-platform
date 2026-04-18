import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { routing, type Locale } from '@/i18n/routing';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/seo/breadcrumbs';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, Quote, ExternalLink } from 'lucide-react';

export const revalidate = 3600;

const OPENALEX_INSTITUTION_ID = 'I2801460691';

interface CollegePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

interface CollegeRow {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
}

interface ResearcherRow {
  id: string;
  username: string;
  full_name_en: string;
  full_name_ar: string;
  profile_image: string | null;
  scopus_h_index: number | null;
  scopus_publications_count: number | null;
  scopus_citations_count: number | null;
}

interface OpenAlexWork {
  title: string;
  publication_year: number | null;
  doi: string | null;
  cited_by_count: number;
  type: string;
  open_access?: { is_oa?: boolean };
  authorships: Array<{ author: { display_name: string } }>;
  primary_location?: { source?: { display_name: string } } | null;
}

async function fetchCollege(slug: string): Promise<CollegeRow | null> {
  const supabase = await createClient();
  const { data: college } = await supabase
    .from('colleges')
    .select('id, slug, name_en, name_ar')
    .eq('slug', slug)
    .maybeSingle();
  return college;
}

async function fetchResearchers(collegeId: string): Promise<ResearcherRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('researchers_public')
    .select(
      'id, username, full_name_en, full_name_ar, profile_image, scopus_h_index, scopus_publications_count, scopus_citations_count',
    )
    .eq('college_id', collegeId)
    .order('scopus_h_index', { ascending: false, nullsFirst: false })
    .limit(100);
  return data ?? [];
}

async function fetchTopPublications(researcherNames: string[]): Promise<OpenAlexWork[]> {
  if (researcherNames.length === 0) return [];

  try {
    const res = await fetch(
      `https://api.openalex.org/works?filter=institutions.id:${OPENALEX_INSTITUTION_ID},is_retracted:false&per_page=10&sort=cited_by_count:desc&select=title,publication_year,doi,cited_by_count,type,open_access,authorships,primary_location`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const d = await res.json();
    return (d.results ?? []) as OpenAlexWork[];
  } catch {
    return [];
  }
}

function computeKpis(researchers: ResearcherRow[]) {
  let totalPublications = 0;
  let totalCitations = 0;
  for (const r of researchers) {
    totalPublications += r.scopus_publications_count ?? 0;
    totalCitations += r.scopus_citations_count ?? 0;
  }
  return {
    researcherCount: researchers.length,
    totalPublications,
    totalCitations,
  };
}

export async function generateMetadata({ params }: CollegePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const college = await fetchCollege(slug);
  if (!college) return { title: '404' };

  const typedLocale = locale as Locale;
  const name = typedLocale === 'ar' ? college.name_ar : college.name_en;
  const path = `/college/${slug}`;
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

export default async function CollegePage({ params }: CollegePageProps) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const college = await fetchCollege(slug);
  if (!college) notFound();

  const typedLocale = locale as Locale;
  const isAr = typedLocale === 'ar';
  const collegeName = isAr ? college.name_ar : college.name_en;

  let researchers: ResearcherRow[] = [];
  try {
    researchers = await fetchResearchers(college.id);
  } catch {
    // Supabase unreachable -- render empty state.
  }

  const kpis = computeKpis(researchers);

  const researcherNames = researchers.map((r) => r.full_name_en).filter(Boolean);
  let topPublications: OpenAlexWork[] = [];
  try {
    topPublications = await fetchTopPublications(researcherNames);
  } catch {
    // OpenAlex unreachable -- skip publications section.
  }

  const t = await getTranslations('directory');
  const breadcrumbs: BreadcrumbItem[] = [
    { href: '/researchers', label: 'researchers' },
    { label: collegeName },
  ];

  const kpiCards = [
    {
      icon: Users,
      value: kpis.researcherCount.toLocaleString(locale),
      label: isAr ? 'باحث' : 'Researchers',
    },
    {
      icon: BookOpen,
      value: kpis.totalPublications.toLocaleString(locale),
      label: isAr ? 'منشور بحثي' : 'Publications',
    },
    {
      icon: Quote,
      value: kpis.totalCitations.toLocaleString(locale),
      label: isAr ? 'اقتباس' : 'Citations',
    },
  ];

  return (
    <main className="container mx-auto flex flex-col gap-8 px-4 py-8">
      <Breadcrumbs items={breadcrumbs} />

      {/* Colored header */}
      <div className="rounded-xl bg-primary/10 p-6">
        <h1 className="text-3xl font-semibold tracking-tight text-primary">{collegeName}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('subtitle', { count: researchers.length })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Researchers grid */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">{isAr ? 'الباحثون' : 'Researchers'}</h2>
        {researchers.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">{t('noResults')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {researchers.map((r) => {
              const name = isAr ? r.full_name_ar : r.full_name_en;
              const initials = name.slice(0, 2).toUpperCase();
              return (
                <Link key={r.id} href={`/researcher/${r.username}`}>
                  <Card className="hover:border-primary/40 transition-colors">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Avatar className="size-10">
                        <AvatarImage src={r.profile_image ?? undefined} alt={name} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{name}</p>
                        {r.scopus_h_index !== null && (
                          <p className="text-muted-foreground text-xs">
                            h-index: {r.scopus_h_index}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Top publications from OpenAlex */}
      {topPublications.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">
            {isAr ? 'أبرز المنشورات' : 'Top Publications'}
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            {isAr ? 'بيانات من OpenAlex' : 'Data from OpenAlex'}
          </p>
          <div className="space-y-3">
            {topPublications.map((w, i) => {
              const authors = (w.authorships ?? [])
                .slice(0, 4)
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
                  className="block"
                >
                  <Card className="hover:border-primary/40 hover:shadow-sm transition-all">
                    <CardContent className="space-y-2 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-medium leading-snug">{w.title}</h3>
                        {w.publication_year ? (
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {w.publication_year}
                          </span>
                        ) : null}
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
                            <Quote className="me-1 size-2.5" /> {w.cited_by_count}
                          </Badge>
                        ) : null}
                        {w.open_access?.is_oa ? (
                          <Badge
                            variant="outline"
                            className="border-green-300 text-[10px] text-green-600"
                          >
                            OA
                          </Badge>
                        ) : null}
                        {doiUrl ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-primary">
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
        </section>
      )}
    </main>
  );
}
