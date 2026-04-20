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

  const [adminsRes, collegesRes, deptsRes] = await Promise.all([
    supabase.from('admins').select('id, user_id, role, scope_id, created_at').order('created_at'),
    supabase.from('colleges').select('id, name_en, name_ar').order('name_en'),
    supabase.from('departments').select('id, name_en, name_ar, college_id').order('name_en'),
  ]);

  const colleges = (collegesRes.data ?? []) as Array<{
    id: string;
    name_en: string;
    name_ar: string;
  }>;
  const departments = (deptsRes.data ?? []) as Array<{
    id: string;
    name_en: string;
    name_ar: string;
    college_id: string;
  }>;

  // Build scope name lookup
  const collegeMap = new Map(colleges.map((c) => [c.id, c]));
  const deptMap = new Map(departments.map((d) => [d.id, d]));

  // Get emails from auth.users. listUsers() defaults to perPage=50, so
  // past 50 signups the tail falls off the map and rows show user_id
  // prefixes instead of emails. Loop through pages until exhausted.
  const emailMap: Record<string, string> = {};
  try {
    const adminClient = createAdminClient();
    for (let page = 1; page <= 20; page++) {
      const { data } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
      const users = data?.users ?? [];
      for (const user of users) {
        if (user.email) emailMap[user.id] = user.email;
      }
      if (users.length < 200) break;
    }
  } catch {}

  const adminsWithDetails = (adminsRes.data ?? []).map((admin) => {
    let scopeName: string | null = null;
    if (admin.scope_id) {
      const college = collegeMap.get(admin.scope_id);
      const dept = deptMap.get(admin.scope_id);
      scopeName = college
        ? locale === 'ar'
          ? college.name_ar
          : college.name_en
        : dept
          ? locale === 'ar'
            ? dept.name_ar
            : dept.name_en
          : admin.scope_id.slice(0, 8);
    }
    return {
      ...admin,
      email: emailMap[admin.user_id] ?? null,
      scope_name: scopeName,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <ManageAdminsClient
        admins={adminsWithDetails}
        colleges={colleges}
        departments={departments}
        locale={locale}
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
