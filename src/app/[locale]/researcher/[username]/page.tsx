import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { fetchProfileByUsername } from '@/lib/profile/fetch';
import { createClient } from '@/lib/supabase/server';
import { routing, type Locale } from '@/i18n/routing';
import { ProfileHero } from '@/components/profile/profile-hero';
import { ProfileTabs } from '@/components/profile/profile-tabs';
import { TabOverview } from '@/components/profile/tab-overview';
import { TabPublications } from '@/components/profile/tab-publications';
import { TabProjects } from '@/components/profile/tab-projects';
import { TabExperience } from '@/components/profile/tab-experience';
import { TabThesis } from '@/components/profile/tab-thesis';
import { TabActivities } from '@/components/profile/tab-activities';
import { SimilarResearchers } from '@/components/profile/similar-researchers';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { PersonSchema } from '@/components/seo/person-schema';
import { PublicationsSchema } from '@/components/seo/scholarly-article-schema';
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
  // Frame the page as an academic profile explicitly — both for Google's
  // snippet and for the share card on social. The word "academic profile"
  // is the primary keyword we want this page to rank for alongside the
  // researcher's name.
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

async function isOwnerOf(researcherId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('researchers_owner')
      .select('id')
      .eq('id', researcherId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

export default async function ResearcherPage({ params }: ResearcherPageProps) {
  const { locale, username } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const payload = await fetchProfileByUsername(username);
  if (!payload) notFound();

  const typedLocale = locale as Locale;
  const isOwner = await isOwnerOf(payload.profile.id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const profileUrl = `${siteUrl}/${locale}/researcher/${username}`;

  const profileName =
    typedLocale === 'ar' ? payload.profile.full_name_ar : payload.profile.full_name_en;

  return (
    <>
      <PersonSchema payload={payload} locale={typedLocale} profileUrl={profileUrl} />
      <PublicationsSchema payload={payload} />
      <ProfileHero
        payload={payload}
        locale={typedLocale}
        isOwner={isOwner}
        profileUrl={profileUrl}
      />
      <section className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[{ href: '/researchers', label: 'researchers' }, { label: profileName }]}
        />
        <div className="mt-6">
          <ProfileTabs
            overview={<TabOverview payload={payload} locale={typedLocale} />}
            publications={<TabPublications payload={payload} />}
            projects={<TabProjects payload={payload} locale={typedLocale} />}
            experience={<TabExperience payload={payload} locale={typedLocale} />}
            thesis={<TabThesis />}
            activities={<TabActivities payload={payload} />}
          />
        </div>
        <SimilarResearchers researcherId={payload.profile.id} locale={typedLocale} />
      </section>
    </>
  );
}
