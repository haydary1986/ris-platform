import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';

export const revalidate = 3600;

interface TermsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'terms' });
  const alts = buildLanguageAlternates('/terms');
  return {
    title: t('title'),
    description: t('lead'),
    alternates: {
      canonical: canonicalForLocale(locale as Locale, '/terms'),
      languages: alts.languages,
    },
  };
}

const SECTIONS = [
  'acceptance',
  'use',
  'accounts',
  'content',
  'intellectual_property',
  'prohibited',
  'availability',
  'changes',
  'law',
  'contact',
] as const;

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('terms');

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground mt-2 text-xs">{t('updated_at')}</p>
      <p className="text-muted-foreground mt-4 text-base leading-relaxed">{t('lead')}</p>

      <div className="mt-8 space-y-6">
        {SECTIONS.map((key) => (
          <section key={key} className="space-y-2">
            <h2 className="text-lg font-semibold">{t(`sections.${key}.title`)}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
              {t(`sections.${key}.body`)}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
