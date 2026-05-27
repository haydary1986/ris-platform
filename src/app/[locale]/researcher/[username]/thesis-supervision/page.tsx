import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { fetchProfileByUsername } from '@/lib/profile/fetch';
import { buildTabMetadata } from '@/lib/profile/tab-metadata';
import { routing } from '@/i18n/routing';
import { TabThesis } from '@/components/profile/tab-thesis';

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: string; username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return buildTabMetadata({ locale: locale as 'ar' | 'en', username, tab: 'thesis' });
}

export default async function ThesisPage({ params }: Props) {
  const { locale, username } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const payload = await fetchProfileByUsername(username);
  if (!payload) notFound();

  return <TabThesis />;
}
