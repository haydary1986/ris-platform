import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { routing, type Locale } from '@/i18n/routing';
import { checkProfileComplete } from '@/lib/profile/is-complete';
import { CompleteProfileForm } from './complete-profile-form';
import type { BilingualLookup, DepartmentLookup, AcademicTitleLookup } from '@/lib/profile/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function CompleteProfilePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/sign-in`);

  const { data: profile } = await supabase
    .from('researchers_owner')
    .select('id, full_name_en, full_name_ar, college_id, department_id, academic_title_id')
    .maybeSingle();

  if (!profile) redirect(`/${locale}/sign-in`);

  const check = checkProfileComplete(profile);
  if (check.complete) redirect(`/${locale}/manage-profile`);

  const [colleges, departments, titles] = await Promise.all([
    supabase.from('colleges').select('id, name_en, name_ar').order('name_en'),
    supabase.from('departments').select('id, name_en, name_ar, college_id').order('name_en'),
    supabase
      .from('academic_titles')
      .select('id, name_en, name_ar, rank')
      .order('rank', { ascending: false }),
  ]);

  return (
    <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-12">
      <CompleteProfileForm
        initial={{
          full_name_en: profile.full_name_en ?? '',
          full_name_ar: profile.full_name_ar ?? '',
          college_id: profile.college_id ?? '',
          department_id: profile.department_id ?? '',
          academic_title_id: profile.academic_title_id ?? '',
        }}
        colleges={(colleges.data ?? []) as BilingualLookup[]}
        departments={(departments.data ?? []) as DepartmentLookup[]}
        academicTitles={(titles.data ?? []) as AcademicTitleLookup[]}
        locale={locale as Locale}
      />
    </main>
  );
}
