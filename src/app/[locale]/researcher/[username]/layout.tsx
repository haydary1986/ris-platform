// Shared shell for every researcher tab. Renders the hero, metrics bar,
// JSON-LD, and tabs nav once; the individual tab pages (page.tsx,
// publications/page.tsx, etc.) plug into {children}.
//
// fetchProfileByUsername is React-cache-wrapped so the page-level call
// inside each tab dedupes against this layout's call within one render.

import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { fetchProfileByUsername } from '@/lib/profile/fetch';
import { createClient } from '@/lib/supabase/server';
import { routing, type Locale } from '@/i18n/routing';
import { ProfileHero } from '@/components/profile/profile-hero';
import { MetricsBar } from '@/components/profile/metrics-bar';
import { ProfileTabsNav } from '@/components/profile/profile-tabs-nav';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { PersonSchema } from '@/components/seo/person-schema';
import { PublicationsSchema } from '@/components/seo/scholarly-article-schema';
import { SimilarResearchers } from '@/components/profile/similar-researchers';

interface ResearcherLayoutProps {
  children: React.ReactNode;
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

export default async function ResearcherLayout({ children, params }: ResearcherLayoutProps) {
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
      <MetricsBar payload={payload} />
      <section className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[{ href: '/researchers', label: 'researchers' }, { label: profileName }]}
        />
        <div className="mt-6 overflow-x-auto">
          <ProfileTabsNav username={username} />
        </div>
        <div className="mt-6">{children}</div>
        <SimilarResearchers researcherId={payload.profile.id} locale={typedLocale} />
      </section>
    </>
  );
}
