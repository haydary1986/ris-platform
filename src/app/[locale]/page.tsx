import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/landing/hero';
import { Stats } from '@/components/landing/stats';
import { FeaturedResearchers } from '@/components/landing/featured-researchers';
import { Mission } from '@/components/landing/mission';
import { SdgGrid } from '@/components/landing/sdg-grid';
import { OrganizationSchema } from '@/components/seo/organization-schema';
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

  return {
    title: t('title'),
    description: t('tagline'),
    alternates: {
      canonical: canonicalForLocale(locale as Locale, '/'),
      languages: alts.languages,
    },
    openGraph: {
      type: 'website',
      title: t('title'),
      description: t('tagline'),
      locale,
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
      <Hero />
      <Stats locale={typedLocale} />
      <FeaturedResearchers locale={typedLocale} />
      <Mission />
      <SdgGrid />
    </>
  );
}
