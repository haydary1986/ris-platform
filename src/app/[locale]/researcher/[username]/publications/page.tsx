import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { fetchProfileByUsername } from '@/lib/profile/fetch';
import { buildTabMetadata } from '@/lib/profile/tab-metadata';
import { routing, type Locale } from '@/i18n/routing';
import { TabPublications } from '@/components/profile/tab-publications';
import { JsonLd } from '@/components/seo/json-ld';

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: string; username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return buildTabMetadata({ locale: locale as Locale, username, tab: 'publications' });
}

export default async function PublicationsPage({ params }: Props) {
  const { locale, username } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const payload = await fetchProfileByUsername(username);
  if (!payload) notFound();

  // ItemList schema so Google indexes the list page as a list of works
  // (not a duplicate of the overview). Limited to top 50 for crawl budget.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: payload.publications.slice(0, 50).map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${siteUrl}/publication/${p.id}`,
      name: p.title,
    })),
  };

  return (
    <>
      <JsonLd data={listSchema} />
      <TabPublications payload={payload} />
    </>
  );
}
