import { getInstitutionStats } from '@/lib/openalex/institution';
import { getScopusPublicationCount } from '@/lib/scopus/institution';
import { BookOpen, Quote, TrendingUp, Award, Users, BarChart3 } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface Props {
  locale: string;
}

export async function InstitutionStats({ locale }: Props) {
  const [stats, scopusCount] = await Promise.all([
    getInstitutionStats(),
    getScopusPublicationCount(),
  ]);
  if (!stats) return null;

  const isAr = locale === 'ar';
  const pubCount = scopusCount ?? stats.worksCount;

  const kpis = [
    {
      icon: BookOpen,
      value: pubCount.toLocaleString(locale),
      label: isAr ? 'منشور في Scopus' : 'Scopus Publications',
      href: '/publications' as const,
    },
    {
      icon: Quote,
      value: stats.citedByCount.toLocaleString(locale),
      label: isAr ? 'اقتباس' : 'Citations',
      href: '/analytics' as const,
    },
    {
      icon: Award,
      value: String(stats.hIndex),
      label: isAr ? 'مؤشر H' : 'H-Index',
      href: '/analytics' as const,
    },
    {
      icon: TrendingUp,
      value: stats.meanCitedness.toFixed(1),
      label: isAr ? 'متوسط الاقتباسات' : 'Mean Citedness',
      href: '/analytics' as const,
    },
  ];

  return (
    <section className="border-t bg-muted/30 py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <BarChart3 className="size-3.5" />
            {isAr ? 'بيانات من OpenAlex & Scopus' : 'Data from OpenAlex & Scopus'}
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isAr ? 'الإنتاج البحثي للجامعة' : 'University Research Output'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isAr
              ? 'إحصائيات مفهرسة عالمياً — يتم تحديثها تلقائياً'
              : 'Globally indexed metrics — updated automatically'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link
                key={kpi.label}
                href={kpi.href}
                className="group flex flex-col items-center gap-2 rounded-xl border bg-background p-6 text-center transition hover:shadow-md hover:border-primary/30"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" />
                </div>
                <p className="text-3xl font-bold tabular-nums">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </Link>
            );
          })}
        </div>

        {stats.countsByYear.length > 0 ? (
          <div className="mt-10">
            <h3 className="mb-4 text-center text-sm font-semibold text-muted-foreground">
              {isAr ? 'المنشورات حسب السنة' : 'Publications by Year'}
            </h3>
            <div className="flex items-end justify-center gap-2">
              {stats.countsByYear
                .sort((a, b) => a.year - b.year)
                .map((y) => {
                  const maxWorks = Math.max(...stats.countsByYear.map((c) => c.works));
                  const height = maxWorks > 0 ? (y.works / maxWorks) * 120 : 0;
                  return (
                    <div key={y.year} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium tabular-nums">{y.works}</span>
                      <div
                        className="w-10 rounded-t bg-primary/80 transition hover:bg-primary sm:w-14"
                        style={{ height: `${Math.max(height, 4)}px` }}
                      />
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {y.year}
                      </span>
                    </div>
                  );
                })}
            </div>
            <p className="mt-4 text-center text-xs italic text-muted-foreground">
              {isAr
                ? '✦ نركّز على جودة البحث وأثره العلمي أكثر من الكمّ — الأبحاث عالية الاقتباس أولوية'
                : '✦ We prioritize research quality and impact over volume — highly cited research is our focus'}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
