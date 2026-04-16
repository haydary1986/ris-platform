import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { CollegesManagerClient } from './colleges-manager-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function CollegesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.colleges');
  const supabase = await createClient();

  const { data: colleges } = await supabase
    .from('colleges')
    .select('id, name_en, name_ar, slug')
    .order('name_en');

  const { data: departments } = await supabase
    .from('departments')
    .select('id, college_id, name_en, name_ar, slug')
    .order('name_en');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <CollegesManagerClient
        colleges={colleges ?? []}
        departments={departments ?? []}
        translations={{
          addCollege: t('addCollege'),
          editCollege: t('editCollege'),
          deleteCollege: t('deleteCollege'),
          addDepartment: t('addDepartment'),
          editDepartment: t('editDepartment'),
          deleteDepartment: t('deleteDepartment'),
          nameEn: t('nameEn'),
          nameAr: t('nameAr'),
          slug: t('slug'),
          save: t('save'),
          cancel: t('cancel'),
          departments: t('departments'),
          noDepartments: t('noDepartments'),
          noColleges: t('noColleges'),
          confirmDelete: t('confirmDelete'),
          success: t('success'),
          error: t('error'),
        }}
      />
    </div>
  );
}
