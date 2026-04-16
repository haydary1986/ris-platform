import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { HomepageSettingsClient } from './homepage-settings-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.settings');
  const supabase = await createClient();

  const { data: setting } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('key', 'homepage.show_scopus_wos_stats')
    .maybeSingle();

  const showStats = setting?.value ? JSON.parse(setting.value) === true : false;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <HomepageSettingsClient
        initialShowStats={showStats}
        translations={{
          showScopusWosStats: t('showScopusWosStats'),
          showScopusWosStatsDesc: t('showScopusWosStatsDesc'),
          success: t('success'),
          error: t('error'),
        }}
      />
    </div>
  );
}
