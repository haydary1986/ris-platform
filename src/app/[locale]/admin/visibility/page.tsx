import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { VisibilityManagerClient } from './visibility-manager-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function VisibilityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.visibility');
  const supabase = await createClient();

  const { data: researchers } = await supabase
    .from('researchers')
    .select('id, full_name_en, full_name_ar, username, is_public, admin_visibility_override')
    .order('full_name_en');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <VisibilityManagerClient
        researchers={researchers ?? []}
        translations={{
          name: t('name'),
          username: t('username'),
          status: t('status'),
          override: t('override'),
          none: t('optionNone'),
          forceShow: t('optionForceShow'),
          forceHide: t('optionForceHide'),
          public: t('public'),
          private: t('private'),
          success: t('success'),
          error: t('error'),
          noResearchers: t('noResearchers'),
        }}
      />
    </div>
  );
}
