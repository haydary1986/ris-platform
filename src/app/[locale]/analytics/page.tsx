import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';
import { getInstitutionAnalytics } from '@/lib/openalex/analytics';
import { getScopusPublicationCount } from '@/lib/scopus/institution';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Quote,
  Users,
  TrendingUp,
  Unlock,
  Lock,
  ExternalLink,
  Building2,
  Trophy,
  Clock,
  Tag,
} from 'lucide-react';

export const revalidate = 1800;

interface AnalyticsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'analytics' });
  const alts = buildLanguageAlternates('/analytics');
  return {
    title: t('title'),
    alternates: {
      canonical: canonicalForLocale(locale as Locale, '/analytics'),
      languages: alts.languages,
    },
  };
}

interface CollegeStats {
  name: string;
  count: number;
}
interface DeptStats {
  name: string;
  college: string;
  count: number;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const isAr = locale === 'ar';
  const [data, scopusCount] = await Promise.all([
    getInstitutionAnalytics(),
    getScopusPublicationCount(),
  ]);

  // Local DB: top colleges & departments
  let topColleges: CollegeStats[] = [];
  let topDepts: DeptStats[] = [];
  try {
    const supabase = await createClient();
    const [researchers, colleges, departments] = await Promise.all([
      supabase
        .from('researchers')
        .select('college_id, department_id')
        .not('college_id', 'is', null),
      supabase.from('colleges').select('id, name_en, name_ar'),
      supabase.from('departments').select('id, name_en, name_ar, college_id'),
    ]);

    const colMap = new Map((colleges.data ?? []).map((c) => [c.id, isAr ? c.name_ar : c.name_en]));
    const deptMap = new Map(
      (departments.data ?? []).map((d) => [
        d.id,
        { name: isAr ? d.name_ar : d.name_en, college_id: d.college_id },
      ]),
    );

    const colCounts: Record<string, number> = {};
    const deptCounts: Record<string, number> = {};
    for (const r of researchers.data ?? []) {
      if (r.college_id)
        colCounts[r.college_id as string] = (colCounts[r.college_id as string] ?? 0) + 1;
      if (r.department_id)
        deptCounts[r.department_id as string] = (deptCounts[r.department_id as string] ?? 0) + 1;
    }

    topColleges = Object.entries(colCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([id, count]) => ({ name: colMap.get(id) ?? id, count }));

    topDepts = Object.entries(deptCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([id, count]) => {
        const d = deptMap.get(id);
        return { name: d?.name ?? id, college: colMap.get(d?.college_id ?? '') ?? '', count };
      });
  } catch {}

  if (!data) {
    return (
      <main className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">
          {isAr ? 'لا تتوفر بيانات حالياً' : 'No data available'}
        </p>
      </main>
    );
  }

  const oaPercent =
    data.totalWorks > 0 ? Math.round((data.openAccessCount / data.totalWorks) * 100) : 0;

  const pubCount = scopusCount ?? data.totalWorks;

  const kpis = [
    {
      icon: BookOpen,
      value: pubCount.toLocaleString(locale),
      label: isAr ? 'منشور في Scopus' : 'Scopus Publications',
    },
    {
      icon: Quote,
      value: data.totalCitations.toLocaleString(locale),
      label: isAr ? 'اقتباس' : 'Citations',
    },
    { icon: TrendingUp, value: String(data.hIndex), label: 'H-Index' },
    {
      icon: Users,
      value: data.totalAuthors.toLocaleString(locale),
      label: isAr ? 'باحث' : 'Researchers',
    },
  ];

  return (
    <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isAr ? 'التحليلات والإحصائيات' : 'Analytics & Statistics'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isAr
            ? 'الإنتاج البحثي لجامعة التراث — بيانات من OpenAlex'
            : 'AL-Turath University research output — Data from OpenAlex'}
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="flex items-center gap-3 py-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Publications by Year */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">
              {isAr ? 'المنشورات حسب السنة' : 'Publications by Year'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-center gap-1 sm:gap-2">
              {data.byYear.map((y) => {
                const maxCount = Math.max(...data.byYear.map((c) => c.count));
                const height = maxCount > 0 ? (y.count / maxCount) * 160 : 0;
                return (
                  <div key={y.year} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium tabular-nums">{y.count}</span>
                    <div
                      className="w-8 rounded-t bg-primary/80 transition hover:bg-primary sm:w-12"
                      style={{ height: `${Math.max(height, 4)}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground tabular-nums">{y.year}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Publications by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{isAr ? 'حسب النوع' : 'By Type'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.byType.map((t) => {
              const pct = data.totalWorks > 0 ? (t.count / data.totalWorks) * 100 : 0;
              return (
                <div key={t.type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize">{t.type}</span>
                    <span className="text-muted-foreground tabular-nums">{t.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Open Access */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{isAr ? 'الوصول المفتوح' : 'Open Access'}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative flex size-32 items-center justify-center">
              <svg className="size-32 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-muted"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-green-500"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${oaPercent}, 100`}
                />
              </svg>
              <span className="absolute text-2xl font-bold">{oaPercent}%</span>
            </div>
            <div className="flex gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <Unlock className="size-3.5 text-green-500" />
                <span>
                  {isAr ? 'مفتوح' : 'Open'}: {data.openAccessCount.toLocaleString(locale)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="size-3.5 text-muted-foreground" />
                <span>
                  {isAr ? 'مغلق' : 'Closed'}: {data.closedAccessCount.toLocaleString(locale)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Researchers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Trophy className="size-4 text-yellow-500" />
              {isAr ? 'الباحثون الأكثر نشاطاً' : 'Most Active Researchers'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topAuthors.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium">{a.name}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>h:{a.hIndex}</span>
                    <span>
                      {a.citations.toLocaleString(locale)} {isAr ? 'اقتباس' : 'cit.'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Research Topics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Tag className="size-4 text-primary" />
              {isAr ? 'أبرز المواضيع البحثية' : 'Top Research Topics'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {data.topTopics.map((t, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {t.name} <span className="ms-1 text-muted-foreground">({t.count})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Colleges */}
        {topColleges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="size-4 text-primary" />
                {isAr ? 'الكليات الأكثر نشاطاً' : 'Most Active Colleges'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topColleges.map((c, i) => {
                const maxC = topColleges[0]?.count ?? 1;
                const pct = (c.count / maxC) * 100;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{c.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {c.count} {isAr ? 'باحث' : 'researchers'}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-blue-500/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Top Departments */}
        {topDepts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="size-4 text-primary" />
                {isAr ? 'الأقسام الأكثر نشاطاً' : 'Most Active Departments'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topDepts.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                >
                  <div>
                    <span className="text-xs font-medium">{d.name}</span>
                    <span className="text-[10px] text-muted-foreground ms-1.5">{d.college}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] tabular-nums">
                    {d.count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Publications */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-primary" />
              {isAr ? 'آخر البحوث المنشورة' : 'Latest Publications'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentWorks.map((w, i) => {
              const doiUrl = w.doi
                ? `https://doi.org/${w.doi.replace('https://doi.org/', '')}`
                : null;
              return (
                <a
                  key={i}
                  href={doiUrl ?? '#'}
                  target={doiUrl ? '_blank' : undefined}
                  rel={doiUrl ? 'noopener' : undefined}
                  className="block rounded-lg border p-3 transition hover:border-primary/30 hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-xs font-medium leading-snug">{w.title}</h4>
                    {w.year && (
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {w.year}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic mt-1">
                    {w.authors.join(', ')}
                    {w.authors.length >= 3 ? ' et al.' : ''}
                  </p>
                  {w.journal && <p className="text-[10px] text-muted-foreground">{w.journal}</p>}
                  <div className="flex gap-2 mt-1.5">
                    {w.citations > 0 && (
                      <Badge variant="secondary" className="text-[9px]">
                        {w.citations} {isAr ? 'اقتباس' : 'citations'}
                      </Badge>
                    )}
                    {w.isOa && (
                      <Badge
                        variant="outline"
                        className="text-[9px] text-green-600 border-green-300"
                      >
                        OA
                      </Badge>
                    )}
                    {doiUrl && (
                      <span className="text-primary inline-flex items-center gap-0.5 text-[9px]">
                        <ExternalLink className="size-2.5" />
                        DOI
                      </span>
                    )}
                  </div>
                </a>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-[10px] text-muted-foreground">
        {isAr
          ? 'مصدر البيانات: OpenAlex — تُحدّث تلقائياً كل ساعة'
          : 'Data source: OpenAlex — auto-refreshed hourly'}
      </p>
    </main>
  );
}
