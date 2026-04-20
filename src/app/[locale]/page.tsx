import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { Stats } from '@/components/landing/stats';
import { FeaturedResearchers } from '@/components/landing/featured-researchers';
import { Mission } from '@/components/landing/mission';
import { SdgGrid } from '@/components/landing/sdg-grid';
import { InstitutionStats } from '@/components/landing/institution-stats';
import { DataSources } from '@/components/landing/data-sources';
import { OrganizationSchema } from '@/components/seo/organization-schema';
import { LandingSchema } from '@/components/seo/landing-schema';
import { hasLocale } from 'next-intl';
import { routing, type Locale } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'landing.hero' });
  const alts = buildLanguageAlternates('/');

  // Keyword-rich description that carries the three feature pillars
  // (directory / academic profile / CV) verbatim — matches how people
  // search and what Google highlights in snippets.
  const description = t('tagline');
  const keywords =
    locale === 'ar'
      ? [
          'جامعة التراث',
          'دليل الباحثين',
          'ملف أكاديمي',
          'سيرة ذاتية أكاديمية',
          'باحثو جامعة التراث',
          'المنشورات العلمية',
          'أعضاء هيئة التدريس',
          'العراق',
          'بغداد',
        ]
      : [
          'AL-Turath University',
          'researcher directory',
          'academic profile',
          'CV generator',
          'faculty directory Iraq',
          'researcher profile page',
          'academic CV',
          'Scopus h-index',
          'ORCID integration',
          'Baghdad researcher directory',
        ];

  return {
    title: t('title'),
    description,
    keywords,
    alternates: {
      canonical: canonicalForLocale(locale as Locale, '/'),
      languages: alts.languages,
    },
    openGraph: {
      type: 'website',
      title: t('title'),
      description,
      locale,
      siteName: 'AL-Turath RIS',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description,
    },
  };
}

// ISR — landing data refreshes every 5 minutes (Task 159 caching policy).
export const revalidate = 300;

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const typedLocale = locale as Locale;

  return (
    <>
      <OrganizationSchema />
      <LandingSchema />
      <Hero />
      <Features />
      <InstitutionStats locale={locale} />
      <Stats locale={typedLocale} />
      <FeaturedResearchers locale={typedLocale} />
      <Mission />
      <SdgGrid locale={typedLocale} />
      <DataSources locale={locale} />
    </>
  );
}
