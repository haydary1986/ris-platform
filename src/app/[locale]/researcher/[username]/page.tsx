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

export const revalidate = 300;

interface ResearcherPageProps {
  params: Promise<{ locale: string; username: string }>;
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

  return (
    <>
      <ProfileHero
        payload={payload}
        locale={typedLocale}
        isOwner={isOwner}
        profileUrl={profileUrl}
      />
      <section className="container mx-auto px-4 py-8">
        <ProfileTabs
          overview={<TabOverview payload={payload} locale={typedLocale} />}
          publications={<TabPublications payload={payload} />}
          projects={<TabProjects payload={payload} locale={typedLocale} />}
          experience={<TabExperience payload={payload} locale={typedLocale} />}
          thesis={<TabThesis />}
          activities={<TabActivities />}
        />
      </section>
    </>
  );
}
