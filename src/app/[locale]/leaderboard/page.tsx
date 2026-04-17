import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';

export const revalidate = 300;

const OPENALEX_INSTITUTION_ID = 'I2801460691';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string }>;
}

interface OpenAlexAuthor {
  display_name: string;
  works_count: number;
  cited_by_count: number;
  summary_stats: { h_index: number; i10_index: number };
  last_known_institutions: Array<{ display_name: string }>;
  ids: { openalex?: string; orcid?: string };
}

async function fetchTopAuthors(sortBy: string) {
  const sort =
    sortBy === 'works'
      ? 'works_count:desc'
      : sortBy === 'citations'
        ? 'cited_by_count:desc'
        : 'summary_stats.h_index:desc';
  const res = await fetch(
    `https://api.openalex.org/authors?filter=last_known_institutions.id:${OPENALEX_INSTITUTION_ID}&per_page=50&sort=${sort}&select=display_name,works_count,cited_by_count,summary_stats,last_known_institutions,ids`,
    { next: { revalidate: 300 } },
  );
  if (!res.ok) return [];
  const d = await res.json();
  return (d.results ?? []) as OpenAlexAuthor[];
}

export default async function LeaderboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const sp = await searchParams;
  const isAr = locale === 'ar';
  const sortBy = sp.sort ?? 'h_index';

  const authors = await fetchTopAuthors(sortBy);

  const sortOptions = [
    { key: 'h_index', label: isAr ? 'مؤشر H' : 'H-Index', icon: TrendingUp },
    { key: 'citations', label: isAr ? 'الاقتباسات' : 'Citations', icon: Award },
    { key: 'works', label: isAr ? 'المنشورات' : 'Publications', icon: Medal },
  ];

  function getRankIcon(rank: number) {
    if (rank === 0) return <Trophy className="size-5 text-yellow-500" />;
    if (rank === 1) return <Trophy className="size-5 text-gray-400" />;
    if (rank === 2) return <Trophy className="size-5 text-amber-700" />;
    return (
      <span className="flex size-5 items-center justify-center text-xs font-bold text-muted-foreground">
        {rank + 1}
      </span>
    );
  }

  return (
    <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {isAr ? 'تصنيف الباحثين' : 'Researcher Leaderboard'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr
            ? 'ترتيب باحثي جامعة التراث حسب الأداء البحثي — بيانات من OpenAlex'
            : 'AL-Turath University researchers ranked by research performance — Data from OpenAlex'}
        </p>
      </header>

      {/* Sort tabs */}
      <div className="flex justify-center gap-2">
        {sortOptions.map((opt) => {
          const Icon = opt.icon;
          return (
            <a
              key={opt.key}
              href={`/${locale}/leaderboard?sort=${opt.key}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition ${sortBy === opt.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              <Icon className="size-3.5" />
              {opt.label}
            </a>
          );
        })}
      </div>

      {/* Top 3 podium */}
      {authors.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {[1, 0, 2].map((rank) => {
            const a = authors[rank]!;
            const isFirst = rank === 0;
            return (
              <Card
                key={rank}
                className={`text-center ${isFirst ? 'border-yellow-300 shadow-lg ring-1 ring-yellow-200' : ''}`}
              >
                <CardContent className={`py-5 ${isFirst ? 'py-7' : ''}`}>
                  <div className="mb-2 flex justify-center">{getRankIcon(rank)}</div>
                  <Avatar className={`mx-auto ${isFirst ? 'size-16' : 'size-12'}`}>
                    <AvatarFallback className={isFirst ? 'text-lg' : 'text-sm'}>
                      {a.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className={`mt-2 font-semibold ${isFirst ? 'text-base' : 'text-sm'}`}>
                    {a.display_name}
                  </p>
                  <div className="mt-2 flex justify-center gap-3 text-[10px]">
                    <div className="text-center">
                      <p className="font-bold text-primary">{a.summary_stats.h_index}</p>
                      <p className="text-muted-foreground">h-index</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">{a.cited_by_count.toLocaleString(locale)}</p>
                      <p className="text-muted-foreground">{isAr ? 'اقتباس' : 'citations'}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">{a.works_count}</p>
                      <p className="text-muted-foreground">{isAr ? 'منشور' : 'pubs'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full ranking table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-start font-medium w-12">#</th>
              <th className="px-4 py-2 text-start font-medium">{isAr ? 'الباحث' : 'Researcher'}</th>
              <th className="px-4 py-2 text-center font-medium">h-index</th>
              <th className="px-4 py-2 text-center font-medium">
                {isAr ? 'اقتباسات' : 'Citations'}
              </th>
              <th className="px-4 py-2 text-center font-medium">{isAr ? 'منشورات' : 'Pubs'}</th>
              <th className="px-4 py-2 text-center font-medium">i10</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {authors.map((a, i) => (
              <tr
                key={i}
                className={`hover:bg-muted/30 ${i < 3 ? 'bg-yellow-50/30 dark:bg-yellow-900/5' : ''}`}
              >
                <td className="px-4 py-2">{getRankIcon(i)}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-[9px]">
                        {a.display_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-xs">{a.display_name}</p>
                      {a.ids.orcid ? (
                        <a
                          href={a.ids.orcid}
                          target="_blank"
                          rel="noopener"
                          className="text-[9px] text-primary hover:underline"
                        >
                          ORCID
                        </a>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-center">
                  <Badge
                    variant={i < 3 ? 'default' : 'secondary'}
                    className="text-[10px] tabular-nums"
                  >
                    {a.summary_stats.h_index}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-center text-xs tabular-nums">
                  {a.cited_by_count.toLocaleString(locale)}
                </td>
                <td className="px-4 py-2 text-center text-xs tabular-nums">{a.works_count}</td>
                <td className="px-4 py-2 text-center text-xs tabular-nums text-muted-foreground">
                  {a.summary_stats.i10_index}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
