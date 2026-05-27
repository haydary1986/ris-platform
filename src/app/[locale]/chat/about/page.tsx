// Public-facing explanation of the AI assistant: what it does, its
// limits, how it works, privacy, and how to report bad answers. Linked
// from the chat widget footer.

import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';

export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'chat.about' });
  const alts = buildLanguageAlternates('/chat/about');
  return {
    title: t('title'),
    description: t('lead'),
    alternates: {
      canonical: canonicalForLocale(locale as Locale, '/chat/about'),
      languages: alts.languages,
    },
  };
}

export default async function ChatAboutPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('chat.about');

  const sections = ['what', 'how', 'limits', 'privacy', 'report'] as const;

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <header className="space-y-3">
        <p className="text-primary text-xs font-semibold uppercase tracking-wider">
          {t('eyebrow')}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground text-base leading-relaxed">{t('lead')}</p>
      </header>

      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s} className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">{t(`${s}.title`)}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{t(`${s}.body`)}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
