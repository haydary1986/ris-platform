// Long-form About page. Three major sections after the intro:
//   * Chairman's letter — Prof. Ali Al-Akeeli, Chairman of the Board of
//     Trustees. Positions the platform inside the university's mission.
//   * Research impact — live numbers from the DB and OpenAlex so the
//     claims stay honest as the directory grows.
//   * Timeline — platform milestones so readers see the trajectory.
//
// Rendered as a Server Component so the live impact numbers are part of
// the initial HTML (better SEO, no client fetch).

import type { Metadata } from 'next';
import { BookOpen, Calendar, GraduationCap, Quote, TrendingUp, Users } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getInstitutionStats } from '@/lib/openalex/institution';
import { routing, type Locale } from '@/i18n/routing';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';
import { Card, CardContent } from '@/components/ui/card';

export const revalidate = 3600;

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'about' });
  const alts = buildLanguageAlternates('/about');
  return {
    title: t('title'),
    description: t('lead'),
    alternates: {
      canonical: canonicalForLocale(locale as Locale, '/about'),
      languages: alts.languages,
    },
  };
}

async function fetchDirectoryCounts() {
  try {
    const supabase = await createClient();
    const [{ count: researchers }, { count: colleges }, { count: departments }] = await Promise.all(
      [
        supabase.from('researchers_public').select('*', { count: 'exact', head: true }),
        supabase.from('colleges').select('*', { count: 'exact', head: true }),
        supabase.from('departments').select('*', { count: 'exact', head: true }),
      ],
    );
    return {
      researchers: researchers ?? 0,
      colleges: colleges ?? 0,
      departments: departments ?? 0,
    };
  } catch {
    return { researchers: 0, colleges: 0, departments: 0 };
  }
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [t, directory, institution] = await Promise.all([
    getTranslations('about'),
    fetchDirectoryCounts(),
    getInstitutionStats(),
  ]);

  const fmt = (n: number) => new Intl.NumberFormat(locale).format(n);

  const impactCards = [
    {
      icon: Users,
      value: fmt(directory.researchers),
      label: t('impact.metrics.researchers'),
    },
    {
      icon: GraduationCap,
      value: fmt(directory.colleges),
      label: t('impact.metrics.colleges'),
    },
    {
      icon: BookOpen,
      value: fmt(institution?.worksCount ?? 0),
      label: t('impact.metrics.publications'),
    },
    {
      icon: Quote,
      value: fmt(institution?.citedByCount ?? 0),
      label: t('impact.metrics.citations'),
    },
    {
      icon: TrendingUp,
      value: fmt(institution?.hIndex ?? 0),
      label: t('impact.metrics.h_index'),
    },
    {
      icon: Calendar,
      value: fmt(directory.departments),
      label: t('impact.metrics.departments'),
    },
  ];

  const milestoneKeys = ['2024', '2025_q1', '2025_q2', '2026_q1', '2026_q2', 'future'] as const;

  return (
    <main className="container mx-auto max-w-4xl px-4 py-12">
      {/* Intro */}
      <header className="space-y-4">
        <p className="text-primary text-xs font-semibold uppercase tracking-wider">
          {t('eyebrow')}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">{t('lead')}</p>
      </header>

      {/* Chairman's letter */}
      <section className="from-primary/10 to-primary/5 mt-12 overflow-hidden rounded-2xl border bg-gradient-to-br p-6 sm:p-10">
        <p className="text-primary text-xs font-semibold uppercase tracking-wider">
          {t('chairman.eyebrow')}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('chairman.heading')}
        </h2>

        <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr]">
          <div className="flex sm:flex-col sm:items-start">
            {/* Plain <img> — same pattern as the Header logo. Avoids
                configuring next.config.ts remotePatterns for a single
                source, and the upstream file is already optimised webp. */}
            <img
              src="https://uoturath.edu.iq/wp-content/uploads/2024/10/%D8%B1%D8%A6%D9%8A%D8%B3-%D9%85%D8%AC%D9%84%D8%B3-%D8%A7%D9%84%D8%A7%D9%85%D9%86%D8%A7%D8%A1-%D8%A7%D9%84%D8%A3%D8%B3%D8%AA%D8%A7%D8%B0-%D8%B9%D9%84%D9%8A-%D8%A7%D9%84%D8%B9%D9%83%D9%8A%D9%84%D9%8A.png.webp"
              alt={t('chairman.name')}
              loading="lazy"
              decoding="async"
              className="ring-primary/30 size-20 rounded-full object-cover ring-2 sm:size-28"
            />
            <div className="ms-4 sm:ms-0 sm:mt-3">
              <p className="text-base font-semibold">{t('chairman.name')}</p>
              <p className="text-muted-foreground text-sm">{t('chairman.title')}</p>
              <p className="text-muted-foreground mt-1 text-xs">{t('chairman.institution')}</p>
            </div>
          </div>

          <blockquote className="space-y-4 text-sm leading-relaxed sm:text-base">
            {[1, 2, 3].map((i) => (
              <p key={i} className="text-foreground/90">
                {t(`chairman.paragraph_${i}`)}
              </p>
            ))}
            <p className="text-primary mt-2 font-semibold italic">{t('chairman.signature')}</p>
          </blockquote>
        </div>
      </section>

      {/* Research impact — live numbers */}
      <section className="mt-16 space-y-6">
        <div className="space-y-2">
          <p className="text-primary text-xs font-semibold uppercase tracking-wider">
            {t('impact.eyebrow')}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('impact.title')}</h2>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            {t('impact.lead')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {impactCards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold tabular-nums">{c.value}</p>
                    <p className="text-muted-foreground truncate text-xs">{c.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {institution ? (
          <p className="text-muted-foreground text-[11px]">{t('impact.source_note')}</p>
        ) : null}
      </section>

      {/* Three pillars */}
      <section className="mt-16 space-y-6">
        <div className="space-y-2">
          <p className="text-primary text-xs font-semibold uppercase tracking-wider">
            {t('pillars_eyebrow')}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('pillars_title')}
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {(['directory', 'profile', 'cv'] as const).map((key) => (
            <div key={key} className="bg-card rounded-lg border p-5">
              <p className="font-semibold">{t(`pillars.${key}.title`)}</p>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {t(`pillars.${key}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mt-16 space-y-6">
        <div className="space-y-2">
          <p className="text-primary text-xs font-semibold uppercase tracking-wider">
            {t('timeline.eyebrow')}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('timeline.title')}
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            {t('timeline.lead')}
          </p>
        </div>

        <ol className="border-primary/20 relative space-y-6 border-s-2 ps-6">
          {milestoneKeys.map((key) => (
            <li key={key} className="relative">
              <span className="bg-primary absolute -start-[33px] top-1.5 block size-3 rounded-full ring-4 ring-background" />
              <p className="text-primary text-xs font-semibold uppercase tracking-wider">
                {t(`timeline.items.${key}.date`)}
              </p>
              <p className="mt-1 font-semibold">{t(`timeline.items.${key}.title`)}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {t(`timeline.items.${key}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Data sources */}
      <section className="mt-16 space-y-3">
        <h2 className="text-xl font-semibold">{t('data_title')}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{t('data_body')}</p>
      </section>

      {/* Contact */}
      <section className="mt-12 rounded-xl border bg-muted/30 p-6">
        <h2 className="text-lg font-semibold">{t('contact_title')}</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {t('contact_body')}{' '}
          <a className="text-primary underline" href="mailto:research@uoturath.edu.iq">
            research@uoturath.edu.iq
          </a>
          .
        </p>
      </section>
    </main>
  );
}
