import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';

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

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('about');

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground mt-4 text-base leading-relaxed">{t('lead')}</p>

      <section className="mt-10 space-y-6">
        <h2 className="text-xl font-semibold">{t('pillars_title')}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(['directory', 'profile', 'cv'] as const).map((key) => (
            <div key={key} className="bg-card rounded-lg border p-4">
              <p className="font-semibold">{t(`pillars.${key}.title`)}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {t(`pillars.${key}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">{t('data_title')}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{t('data_body')}</p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">{t('contact_title')}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
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
