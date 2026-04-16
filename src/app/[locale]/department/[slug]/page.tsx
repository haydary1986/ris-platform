import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { routing, type Locale } from '@/i18n/routing';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/seo/breadcrumbs';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const revalidate = 3600;

interface DepartmentPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

async function fetchDepartmentWithCollege(slug: string) {
  const supabase = await createClient();
  const { data: dept } = await supabase
    .from('departments')
    .select('id, slug, name_en, name_ar, college_id')
    .eq('slug', slug)
    .maybeSingle();
  if (!dept) return null;

  const { data: college } = await supabase
    .from('colleges')
    .select('id, slug, name_en, name_ar')
    .eq('id', dept.college_id)
    .maybeSingle();

  return { dept, college };
}

async function fetchResearchers(departmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('researchers_public')
    .select('id, username, full_name_en, full_name_ar, profile_image, scopus_h_index')
    .eq('department_id', departmentId)
    .order('scopus_h_index', { ascending: false, nullsFirst: false })
    .limit(100);
  return data ?? [];
}

export async function generateMetadata({ params }: DepartmentPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const result = await fetchDepartmentWithCollege(slug);
  if (!result) return { title: '404' };

  const typedLocale = locale as Locale;
  const name = typedLocale === 'ar' ? result.dept.name_ar : result.dept.name_en;
  const path = `/department/${slug}`;
  const alts = buildLanguageAlternates(path);

  return {
    title: name,
    alternates: {
      canonical: canonicalForLocale(typedLocale, path),
      languages: alts.languages,
    },
    openGraph: { type: 'website', title: name, locale },
  };
}

export default async function DepartmentPage({ params }: DepartmentPageProps) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const result = await fetchDepartmentWithCollege(slug);
  if (!result) notFound();

  const typedLocale = locale as Locale;
  const { dept, college } = result;
  const deptName = typedLocale === 'ar' ? dept.name_ar : dept.name_en;
  const collegeName = college ? (typedLocale === 'ar' ? college.name_ar : college.name_en) : '';

  let researchers: Awaited<ReturnType<typeof fetchResearchers>> = [];
  try {
    researchers = await fetchResearchers(dept.id);
  } catch {
    // Supabase unreachable -- render empty state.
  }

  const t = await getTranslations('directory');
  const breadcrumbs: BreadcrumbItem[] = [
    { href: '/researchers', label: 'researchers' },
    ...(college ? [{ href: `/college/${college.slug}`, label: collegeName }] : []),
    { label: deptName },
  ];

  return (
    <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl font-semibold tracking-tight">{deptName}</h1>
      <p className="text-muted-foreground text-sm">
        {t('subtitle', { count: researchers.length })}
      </p>

      {researchers.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">{t('noResults')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {researchers.map((r) => {
            const name = typedLocale === 'ar' ? r.full_name_ar : r.full_name_en;
            const initials = name.slice(0, 2).toUpperCase();
            return (
              <Link key={r.id} href={`/researcher/${r.username}`}>
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar className="size-10">
                      <AvatarImage src={r.profile_image ?? undefined} alt={name} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{name}</p>
                      {r.scopus_h_index !== null && (
                        <p className="text-muted-foreground text-xs">h-index: {r.scopus_h_index}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
