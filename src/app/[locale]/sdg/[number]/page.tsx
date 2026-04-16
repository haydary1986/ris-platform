import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
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

interface SdgPageProps {
  params: Promise<{ locale: string; number: string }>;
}

async function fetchSdgGoal(goalNumber: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('un_sdg_goals')
    .select('id, number, name_en, name_ar, color')
    .eq('number', goalNumber)
    .maybeSingle();
  return data;
}

async function fetchSdgResearchers(goalId: string) {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from('researcher_sdg_goals')
    .select('researcher_id')
    .eq('sdg_goal_id', goalId);
  if (!links || links.length === 0) return [];

  const ids = links.map((l) => l.researcher_id);
  const { data } = await supabase
    .from('researchers_public')
    .select('id, username, full_name_en, full_name_ar, profile_image, scopus_h_index')
    .in('id', ids)
    .order('scopus_h_index', { ascending: false, nullsFirst: false })
    .limit(100);
  return data ?? [];
}

export async function generateMetadata({ params }: SdgPageProps): Promise<Metadata> {
  const { locale, number: num } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const goalNumber = parseInt(num, 10);
  if (isNaN(goalNumber) || goalNumber < 1 || goalNumber > 17) return { title: '404' };

  const goal = await fetchSdgGoal(goalNumber);
  if (!goal) return { title: '404' };

  const typedLocale = locale as Locale;
  const name = `SDG ${goal.number}: ${typedLocale === 'ar' ? goal.name_ar : goal.name_en}`;
  const path = `/sdg/${num}`;
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

export default async function SdgPage({ params }: SdgPageProps) {
  const { locale, number: num } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const goalNumber = parseInt(num, 10);
  if (isNaN(goalNumber) || goalNumber < 1 || goalNumber > 17) notFound();

  const goal = await fetchSdgGoal(goalNumber);
  if (!goal) notFound();

  const typedLocale = locale as Locale;
  const goalName = typedLocale === 'ar' ? goal.name_ar : goal.name_en;

  let researchers: Awaited<ReturnType<typeof fetchSdgResearchers>> = [];
  try {
    researchers = await fetchSdgResearchers(goal.id);
  } catch {
    // Supabase unreachable -- render empty state.
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { href: '/researchers', label: 'researchers' },
    { label: `SDG ${goal.number}` },
  ];

  return (
    <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <Breadcrumbs items={breadcrumbs} />
      <div className="rounded-lg p-6" style={{ backgroundColor: goal.color }}>
        <h1 className="text-2xl font-bold text-white">
          SDG {goal.number}: {goalName}
        </h1>
        <p className="mt-1 text-sm text-white/80">
          {researchers.length} researcher{researchers.length !== 1 ? 's' : ''}
        </p>
      </div>

      {researchers.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          No researchers aligned with this goal yet.
        </p>
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
