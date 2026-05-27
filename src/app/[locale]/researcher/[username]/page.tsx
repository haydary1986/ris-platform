// Overview tab — the default landing for /researcher/{username}.
// The shared shell (hero, metrics bar, tabs nav, schema) lives in
// layout.tsx; this page renders only the body content for its tab.

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { fetchProfileByUsername } from '@/lib/profile/fetch';
import { routing, type Locale } from '@/i18n/routing';
import { TabOverview } from '@/components/profile/tab-overview';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';

export const revalidate = 300;

interface ResearcherPageProps {
  params: Promise<{ locale: string; username: string }>;
}

export async function generateMetadata({ params }: ResearcherPageProps): Promise<Metadata> {
  const { locale, username } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const payload = await fetchProfileByUsername(username);
  if (!payload) return { title: '404' };

  const typedLocale = locale as Locale;
  const { profile, lookups, publications } = payload;
  const name = typedLocale === 'ar' ? profile.full_name_ar : profile.full_name_en;
  const title = profile.academic_title_id ? lookups.titleById.get(profile.academic_title_id) : null;
  const college = profile.college_id ? lookups.collegeById.get(profile.college_id) : null;

  const titleStr = title ? (typedLocale === 'ar' ? title.name_ar : title.name_en) : null;
  const collegeStr = college ? (typedLocale === 'ar' ? college.name_ar : college.name_en) : null;

  const pageTitle = [name, titleStr, collegeStr].filter(Boolean).join(' — ');
  const isAr = typedLocale === 'ar';
  const description = isAr
    ? [
        `الملف الأكاديمي للدكتور/الدكتورة ${name}`,
        titleStr,
        collegeStr ? `— ${collegeStr}` : null,
        '— جامعة التراث.',
        publications.length > 0 ? `${publications.length} منشور بحثي.` : null,
        profile.scopus_h_index !== null ? `H-index ${profile.scopus_h_index}.` : null,
        'السيرة الذاتية الأكاديمية، الاهتمامات البحثية، المنشورات، والاقتباسات.',
      ]
        .filter(Boolean)
        .join(' ')
    : [
        `Academic profile of ${name}`,
        titleStr ? `— ${titleStr}` : null,
        collegeStr ? `at ${collegeStr},` : null,
        'AL-Turath University.',
        publications.length > 0 ? `${publications.length} publications.` : null,
        profile.scopus_h_index !== null ? `H-index ${profile.scopus_h_index}.` : null,
        'Bio, research interests, publications, and citations. Download CV.',
      ]
        .filter(Boolean)
        .join(' ');

  const path = `/researcher/${username}`;
  const alts = buildLanguageAlternates(path);

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: canonicalForLocale(typedLocale, path),
      languages: alts.languages,
    },
    openGraph: {
      type: 'profile',
      title: pageTitle,
      description,
      locale: typedLocale,
      images: profile.profile_image ? [{ url: profile.profile_image, alt: name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
    },
  };
}

export default async function ResearcherOverviewPage({ params }: ResearcherPageProps) {
  const { locale, username } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const payload = await fetchProfileByUsername(username);
  if (!payload) notFound();

  return <TabOverview payload={payload} locale={locale as Locale} />;
}
