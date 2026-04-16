import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ManageAdminsClient } from './manage-admins-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.admins');
  const supabase = await createClient();

  const { data: admins } = await supabase
    .from('admins')
    .select('id, user_id, role, created_at')
    .order('created_at');

  const adminsWithEmail = await Promise.all(
    (admins ?? []).map(async (admin) => {
      const { data: researcher } = await supabase
        .from('researchers')
        .select('private_email')
        .eq('user_id', admin.user_id)
        .maybeSingle();
      return { ...admin, email: researcher?.private_email ?? null };
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <ManageAdminsClient
        admins={adminsWithEmail}
        translations={{
          email: t('email'),
          role: t('role'),
          createdAt: t('createdAt'),
          actions: t('actions'),
          remove: t('remove'),
          addPlaceholder: t('addPlaceholder'),
          addButton: t('addButton'),
          confirmRemove: t('confirmRemove'),
          success: t('success'),
          error: t('error'),
          noAdmins: t('noAdmins'),
        }}
      />
    </div>
  );
}
