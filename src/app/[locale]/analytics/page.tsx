import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';
import type { BilingualLookup } from '@/lib/profile/types';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';

export const revalidate = 1800;

interface AnalyticsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

export default async function AnalyticsPage({ params, searchParams }: AnalyticsPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const sp = await searchParams;
  const yearFrom = sp.year_from ? Number(sp.year_from) : null;
  const yearTo = sp.year_to ? Number(sp.year_to) : null;
  const college = typeof sp.college === 'string' ? sp.college : null;

  let summary: Record<string, unknown> | null = null;
  let colleges: BilingualLookup[] = [];

  try {
    const supabase = await createClient();
    const [summaryRes, collegesRes] = await Promise.all([
      supabase.rpc('get_analytics_summary', {
        p_year_from: yearFrom,
        p_year_to: yearTo,
        p_college: college,
      }),
      supabase.from('colleges').select('id, name_en, name_ar').order('name_en'),
    ]);
    summary = summaryRes.data as Record<string, unknown> | null;
    colleges = (collegesRes.data ?? []) as BilingualLookup[];
  } catch {
    // DB unreachable
  }

  const t = await getTranslations('analytics');

  return (
    <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </header>

      <AnalyticsDashboard
        summary={summary}
        colleges={colleges}
        locale={locale as Locale}
        filters={{ yearFrom, yearTo, college }}
      />
    </main>
  );
}
