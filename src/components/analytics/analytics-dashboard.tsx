'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BilingualLookup } from '@/lib/profile/types';
import type { Locale } from '@/i18n/routing';
import dynamic from 'next/dynamic';

const ChartByYear = dynamic(() => import('./chart-by-year'), { ssr: false });
const ChartBySource = dynamic(() => import('./chart-by-source'), { ssr: false });
const ChartByType = dynamic(() => import('./chart-by-type'), { ssr: false });
const ChartByCollege = dynamic(() => import('./chart-by-college'), { ssr: false });
const ChartByTitle = dynamic(() => import('./chart-by-title'), { ssr: false });
const ChartHIndexDist = dynamic(() => import('./chart-h-index'), { ssr: false });
const ChartSdgGrid = dynamic(() => import('./chart-sdg-grid'), { ssr: false });
const ExportButtons = dynamic(() => import('./export-buttons'), { ssr: false });

interface Kpis {
  total_researchers: number;
  total_publications: number;
  total_citations: number;
  avg_h_index: number;
}

interface Props {
  summary: Record<string, unknown> | null;
  colleges: BilingualLookup[];
  locale: Locale;
  filters: { yearFrom: number | null; yearTo: number | null; college: string | null };
}

const ALL = '__all__';

export function AnalyticsDashboard({ summary, colleges, locale, filters }: Props) {
  const t = useTranslations('analytics');
  const router = useRouter();
  const [, startTransition] = useTransition();
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [yf, setYf] = useState(filters.yearFrom?.toString() ?? '');
  const [yt, setYt] = useState(filters.yearTo?.toString() ?? '');
  const [col, setCol] = useState(filters.college ?? ALL);

  function apply() {
    const params = new URLSearchParams();
    if (yf) params.set('year_from', yf);
    if (yt) params.set('year_to', yt);
    if (col && col !== ALL) params.set('college', col);
    const qs = params.toString();
    startTransition(() => {
      router.replace(`/analytics${qs ? `?${qs}` : ''}`);
    });
  }

  if (!summary) {
    return <p className="text-muted-foreground py-12 text-center text-sm">{t('empty')}</p>;
  }

  const kpis = (summary.kpis ?? {}) as Partial<Kpis>;
  const byYear = objToEntries(summary.by_year);
  const bySource = objToEntries(summary.by_source);
  const byType = objToEntries(summary.by_type);
  const byCollege = objToEntries(summary.by_college);
  const byTitle = objToEntries(summary.by_title);
  const hIndexDist = objToEntries(summary.h_index_distribution);
  const sdg = objToEntries(summary.sdg_alignment);

  return (
    <div ref={dashboardRef} className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="space-y-1">
            <Label htmlFor="year_from">{t('filters.year_from')}</Label>
            <Input
              id="year_from"
              type="number"
              className="w-24"
              value={yf}
              onChange={(e) => setYf(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="year_to">{t('filters.year_to')}</Label>
            <Input
              id="year_to"
              type="number"
              className="w-24"
              value={yt}
              onChange={(e) => setYt(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="college_filter">{t('filters.college')}</Label>
            <Select value={col} onValueChange={(v) => setCol(v ?? ALL)}>
              <SelectTrigger id="college_filter" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
                {colleges.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {locale === 'ar' ? c.name_ar : c.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={apply}>
            {t('filters.apply')}
          </Button>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label={t('kpis.researchers')} value={kpis.total_researchers} />
        <KpiCard label={t('kpis.publications')} value={kpis.total_publications} />
        <KpiCard label={t('kpis.citations')} value={kpis.total_citations} />
        <KpiCard label={t('kpis.avg_h_index')} value={kpis.avg_h_index} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title={t('charts.by_year')}>
          <ChartByYear data={byYear} />
        </ChartCard>
        <ChartCard title={t('charts.by_source')}>
          <ChartBySource data={bySource} />
        </ChartCard>
        <ChartCard title={t('charts.by_type')}>
          <ChartByType data={byType} />
        </ChartCard>
        <ChartCard title={t('charts.by_college_treemap')}>
          <ChartByCollege data={byCollege} />
        </ChartCard>
        <ChartCard title={t('charts.by_title')}>
          <ChartByTitle data={byTitle} />
        </ChartCard>
        <ChartCard title={t('charts.h_index_distribution')}>
          <ChartHIndexDist data={hIndexDist} />
        </ChartCard>
        <ChartCard title={t('charts.sdg_alignment')} className="md:col-span-2">
          <ChartSdgGrid data={sdg} />
        </ChartCard>
      </div>

      {/* Export */}
      <ExportButtons targetRef={dashboardRef} summary={summary} />
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value?: number }) {
  const locale = useLocale();
  const formatted =
    value !== undefined
      ? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
      : '—';
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-muted-foreground text-xs uppercase tracking-wider">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{formatted}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}

function objToEntries(obj: unknown): Array<{ name: string; value: number }> {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj as Record<string, number>)
    .filter(([, v]) => typeof v === 'number')
    .map(([name, value]) => ({ name, value }));
}
