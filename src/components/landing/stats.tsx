import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getInstitutionStats } from '@/lib/openalex/institution';

interface HomepageStats {
  researchers: number;
  colleges: number;
  departments: number;
  publications: number;
}

async function fetchStats(): Promise<HomepageStats | null> {
  try {
    const supabase = await createClient();
    const [{ data: dbData, error }, openAlex] = await Promise.all([
      supabase.rpc('get_homepage_stats'),
      // OpenAlex counts every work that lists the institution as an
      // affiliation — this matches what users expect when they see
      // "publications" (institution-wide output, not just imports).
      getInstitutionStats(),
    ]);
    if (error || !dbData) return null;
    const base = dbData as HomepageStats;
    return {
      ...base,
      publications: openAlex?.worksCount ?? base.publications,
    };
  } catch {
    return null;
  }
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export async function Stats({ locale }: { locale: string }) {
  const t = await getTranslations('landing.stats');
  const stats = await fetchStats();

  const items: Array<{ key: keyof HomepageStats; label: string }> = [
    { key: 'researchers', label: t('researchers') },
    { key: 'colleges', label: t('colleges') },
    { key: 'departments', label: t('departments') },
    { key: 'publications', label: t('publications') },
  ];

  return (
    <section className="border-b">
      <div className="container mx-auto px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('title')}
        </h2>
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {items.map((item) => {
            const value = stats?.[item.key];
            return (
              <div key={item.key} className="text-center">
                <dt className="text-muted-foreground text-sm uppercase tracking-wider">
                  {item.label}
                </dt>
                <dd className="mt-2 text-3xl font-semibold tabular-nums sm:text-4xl">
                  {value === undefined ? '—' : formatNumber(value, locale)}
                </dd>
              </div>
            );
          })}
        </dl>
        {!stats ? (
          <p className="text-muted-foreground mt-6 text-center text-xs">{t('empty')}</p>
        ) : null}
      </div>
    </section>
  );
}
