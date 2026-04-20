import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { Mail, MapPin, Globe } from 'lucide-react';
import { routing, type Locale } from '@/i18n/routing';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';

export const revalidate = 3600;

interface ContactPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'contact' });
  const alts = buildLanguageAlternates('/contact');
  return {
    title: t('title'),
    description: t('lead'),
    alternates: {
      canonical: canonicalForLocale(locale as Locale, '/contact'),
      languages: alts.languages,
    },
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('contact');

  return (
    <main className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground mt-4 text-base leading-relaxed">{t('lead')}</p>

      <ul className="mt-8 space-y-4">
        <li className="flex items-start gap-3">
          <Mail className="text-primary mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">{t('email_label')}</p>
            <a className="text-primary text-sm underline" href="mailto:research@uoturath.edu.iq">
              research@uoturath.edu.iq
            </a>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Globe className="text-primary mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">{t('web_label')}</p>
            <a
              className="text-primary text-sm underline"
              href="https://uoturath.edu.iq"
              target="_blank"
              rel="noopener"
            >
              uoturath.edu.iq
            </a>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <MapPin className="text-primary mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">{t('address_label')}</p>
            <p className="text-muted-foreground text-sm">{t('address_body')}</p>
          </div>
        </li>
      </ul>
    </main>
  );
}
