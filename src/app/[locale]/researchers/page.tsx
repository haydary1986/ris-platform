import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';
import { createClient } from '@/lib/supabase/server';
import { routing, type Locale } from '@/i18n/routing';
import { parseFilters, decodeCursor } from '@/lib/directory/url';
import type {
  BilingualLookup,
  DepartmentLookup,
  DirectoryFilters,
  DirectoryLookups,
  DirectoryPage,
} from '@/lib/directory/types';
import { SearchBox } from '@/components/researchers/search-box';
import { SortDropdown } from '@/components/researchers/sort-dropdown';
import { FilterSidebar } from '@/components/researchers/filter-sidebar';
import { ResearcherCard } from '@/components/researchers/researcher-card';
import { ResearcherCardSkeletonGrid } from '@/components/researchers/researcher-card-skeleton';
import { EmptyState } from '@/components/researchers/empty-state';
import { Pagination } from '@/components/researchers/pagination';

interface ResearchersPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'directory' });
  const alts = buildLanguageAlternates('/researchers');
  return {
    title: t('title'),
    alternates: {
      canonical: canonicalForLocale(locale as Locale, '/researchers'),
      languages: alts.languages,
    },
    openGraph: { type: 'website', title: t('title'), locale },
  };
}

async function fetchLookups(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<DirectoryLookups> {
  const [wt, colleges, departments, titles] = await Promise.all([
    supabase.from('workplace_types').select('id, name_en, name_ar').order('name_en'),
    supabase.from('colleges').select('id, name_en, name_ar').order('name_en'),
    supabase.from('departments').select('id, name_en, name_ar, college_id').order('name_en'),
    supabase
      .from('academic_titles')
      .select('id, name_en, name_ar, rank')
      .order('rank', { ascending: false }),
  ]);

  return {
    workplaceTypes: (wt.data ?? []) as BilingualLookup[],
    colleges: (colleges.data ?? []) as BilingualLookup[],
    departments: (departments.data ?? []) as DepartmentLookup[],
    academicTitles: (titles.data ?? []) as BilingualLookup[],
  };
}

async function fetchPage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: DirectoryFilters,
  cursor: ReturnType<typeof decodeCursor>,
): Promise<{ page: DirectoryPage; total: number }> {
  const [pageRes, countRes] = await Promise.all([
    supabase.rpc('get_researchers_page', {
      p_cursor: cursor,
      p_size: 20,
      p_college: filters.college,
      p_department: filters.department,
      p_workplace_type: filters.workplaceType,
      p_academic_title: filters.academicTitle,
      p_search: filters.search,
      p_sort: filters.sort,
    }),
    supabase.rpc('get_researchers_count', {
      p_college: filters.college,
      p_department: filters.department,
      p_workplace_type: filters.workplaceType,
      p_academic_title: filters.academicTitle,
      p_search: filters.search,
    }),
  ]);

  const page = (pageRes.data ?? {
    data: [],
    next_cursor: null,
    page_size: 20,
    sort: filters.sort,
  }) as DirectoryPage;
  const total = (countRes.data ?? 0) as number;
  return { page, total };
}

interface ResultsProps {
  filters: DirectoryFilters;
  hasCursor: boolean;
  cursor: ReturnType<typeof decodeCursor>;
  locale: Locale;
}

async function Results({ filters, hasCursor, cursor, locale }: ResultsProps) {
  let page: DirectoryPage = { data: [], next_cursor: null, page_size: 20, sort: filters.sort };
  let total = 0;
  let lookups: DirectoryLookups = {
    workplaceTypes: [],
    colleges: [],
    departments: [],
    academicTitles: [],
  };

  try {
    const supabase = await createClient();
    const [pageRes, lookupRes] = await Promise.all([
      fetchPage(supabase, filters, cursor),
      fetchLookups(supabase),
    ]);
    page = pageRes.page;
    total = pageRes.total;
    lookups = lookupRes;
  } catch {
    // Supabase unreachable — keep empty defaults.
  }

  const collegeById = new Map(lookups.colleges.map((c) => [c.id, c]));
  const departmentById = new Map(lookups.departments.map((d) => [d.id, d]));
  const academicTitleById = new Map(lookups.academicTitles.map((t) => [t.id, t]));

  const t = await getTranslations('directory');

  return (
    <>
      <p className="text-muted-foreground text-sm">{t('subtitle', { count: total })}</p>

      <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
        <FilterSidebar filters={filters} lookups={lookups} />

        <div>
          {page.data.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {page.data.map((row) => (
                  <ResearcherCard
                    key={row.id}
                    researcher={row}
                    locale={locale}
                    collegeById={collegeById}
                    departmentById={departmentById}
                    academicTitleById={academicTitleById}
                  />
                ))}
              </div>
              <Pagination hasPrevious={hasCursor} nextCursor={page.next_cursor} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default async function ResearchersPage({ params, searchParams }: ResearchersPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const sp = await searchParams;
  const filters = parseFilters(sp);
  const cursor = decodeCursor(sp.cursor);
  const hasCursor = Boolean(sp.cursor);

  const t = await getTranslations('directory');
  const typedLocale = locale as Locale;

  return (
    <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <SearchBox initialValue={filters.search ?? ''} />
          <SortDropdown current={filters.sort} />
        </div>
      </div>

      <Suspense
        key={JSON.stringify({ filters, cursor })}
        fallback={
          <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
            <div className="hidden md:block" />
            <ResearcherCardSkeletonGrid />
          </div>
        }
      >
        <Results filters={filters} cursor={cursor} hasCursor={hasCursor} locale={typedLocale} />
      </Suspense>
    </main>
  );
}
