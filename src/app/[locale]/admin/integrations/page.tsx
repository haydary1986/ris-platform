import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { IntegrationsForm } from './integrations-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const INTEGRATION_KEYS = [
  'integration.sentry.dsn',
  'integration.sentry.org',
  'integration.sentry.project',
  'integration.orcid.client_id',
  'integration.orcid.client_secret',
  'integration.scopus.api_key',
  'integration.google.site_verification',
  'integration.indexnow.key',
] as const;

export default async function IntegrationsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const settings: Record<string, string> = {};
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [...INTEGRATION_KEYS]);

    for (const row of data ?? []) {
      const val =
        typeof row.value === 'string' ? row.value.replace(/^"|"$/g, '') : String(row.value ?? '');
      settings[row.key] = val === '""' || val === 'null' ? '' : val;
    }
  } catch {
    // DB error
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {locale === 'ar' ? 'إعدادات التكاملات' : 'Integration Settings'}
      </h1>
      <p className="text-muted-foreground text-sm">
        {locale === 'ar'
          ? 'أضف مفاتيح الخدمات الخارجية هنا. تُحفظ في قاعدة البيانات وتُطبَّق فوراً.'
          : 'Add external service keys here. Saved to database and applied immediately.'}
      </p>
      <IntegrationsForm settings={settings} locale={locale} />
    </div>
  );
}
