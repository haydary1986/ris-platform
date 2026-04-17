import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

  // Use admin client to get emails from auth.users
  const emailMap: Record<string, string> = {};
  try {
    const adminClient = createAdminClient();
    const userIds = (admins ?? []).map((a) => a.user_id).filter(Boolean);
    if (userIds.length > 0) {
      const { data } = await adminClient.auth.admin.listUsers();
      for (const user of data?.users ?? []) {
        if (user.email) {
          emailMap[user.id] = user.email;
        }
      }
    }
  } catch {
    // Fallback: no emails
  }

  const adminsWithEmail = (admins ?? []).map((admin) => ({
    ...admin,
    email: emailMap[admin.user_id] ?? admin.user_id,
  }));

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
