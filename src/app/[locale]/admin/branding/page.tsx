import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { BrandingForm } from './branding-form';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function BrandingPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const isAr = locale === 'ar';
  const settings: Record<string, string> = {};

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .like('key', 'branding.%');

    for (const row of data ?? []) {
      const val =
        typeof row.value === 'string' ? row.value.replace(/^"|"$/g, '') : String(row.value ?? '');
      settings[row.key] = val === '""' || val === 'null' ? '' : val;
    }
  } catch {}

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isAr ? 'الشعار والأيقونة' : 'Branding & Logo'}
      </h1>
      <p className="text-muted-foreground text-sm">
        {isAr
          ? 'تخصيص شعار الموقع وأيقونة التبويب (Favicon). يمكنك رفع صورة أو إدخال رابط مباشر.'
          : 'Customize the site logo and browser tab icon (favicon). Upload an image or enter a direct URL.'}
      </p>
      <BrandingForm settings={settings} locale={locale} />
    </div>
  );
}
