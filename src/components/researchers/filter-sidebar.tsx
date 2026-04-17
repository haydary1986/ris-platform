'use client';

import { useMemo, useTransition } from 'react';
import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { DirectoryFilters, DirectoryLookups } from '@/lib/directory/types';

interface FilterSidebarProps {
  filters: DirectoryFilters;
  lookups: DirectoryLookups;
}

const ALL_VALUE = '__all__';

function nameFor<T extends { name_en: string; name_ar: string }>(item: T, locale: Locale): string {
  return locale === 'ar' ? item.name_ar : item.name_en;
}

export function FilterSidebar({ filters, lookups }: FilterSidebarProps) {
  const t = useTranslations('directory.filters');
  const router = useRouter();
  const locale = useLocale() as Locale;
  const [, startTransition] = useTransition();

  const visibleDepartments = useMemo(() => {
    if (!filters.college) return lookups.departments;
    return lookups.departments.filter((d) => d.college_id === filters.college);
  }, [filters.college, lookups.departments]);

  function applyParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(window.location.search);
    mutate(params);
    params.delete('cursor');
    const qs = params.toString();
    startTransition(() => {
      router.replace(`/researchers${qs ? `?${qs}` : ''}`);
    });
  }

  function setParam(key: string, value: string | null) {
    applyParams((params) => {
      if (!value || value === ALL_VALUE) params.delete(key);
      else params.set(key, value);
    });
  }

  function setCollege(value: string | null) {
    applyParams((params) => {
      if (!value || value === ALL_VALUE) {
        params.delete('college');
        params.delete('department');
      } else {
        params.set('college', value);
        const dept = params.get('department');
        if (dept && !lookups.departments.some((d) => d.id === dept && d.college_id === value)) {
          params.delete('department');
        }
      }
    });
  }

  function clearAll() {
    startTransition(() => {
      router.replace('/researchers');
    });
  }

  const hasFilters =
    Boolean(filters.search) ||
    Boolean(filters.college) ||
    Boolean(filters.department) ||
    Boolean(filters.workplaceType) ||
    Boolean(filters.academicTitle) ||
    filters.sort !== 'name_asc';

  return (
    <aside className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide uppercase">{t('title')}</h2>
        {hasFilters ? (
          <Button variant="ghost" size="xs" onClick={clearAll}>
            <X className="size-3" />
            {t('clear')}
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-workplace">{t('workplace_type')}</Label>
        <Select
          value={filters.workplaceType ?? ALL_VALUE}
          onValueChange={(v) => setParam('workplace_type', v)}
        >
          <SelectTrigger id="filter-workplace">
            <SelectValue placeholder={t('all')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t('all')}</SelectItem>
            {lookups.workplaceTypes.map((wt) => (
              <SelectItem key={wt.id} value={wt.id}>
                {nameFor(wt, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-college">{t('college')}</Label>
        <Select value={filters.college ?? ALL_VALUE} onValueChange={setCollege}>
          <SelectTrigger id="filter-college">
            <SelectValue placeholder={t('all')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t('all')}</SelectItem>
            {lookups.colleges.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {nameFor(c, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-department">{t('department')}</Label>
        <Select
          value={filters.department ?? ALL_VALUE}
          onValueChange={(v) => setParam('department', v)}
          disabled={visibleDepartments.length === 0}
        >
          <SelectTrigger id="filter-department">
            <SelectValue placeholder={t('all')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t('all')}</SelectItem>
            {visibleDepartments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {nameFor(d, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-title">{t('academic_title')}</Label>
        <Select
          value={filters.academicTitle ?? ALL_VALUE}
          onValueChange={(v) => setParam('academic_title', v)}
        >
          <SelectTrigger id="filter-title">
            <SelectValue placeholder={t('all')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t('all')}</SelectItem>
            {lookups.academicTitles.map((at) => (
              <SelectItem key={at.id} value={at.id}>
                {nameFor(at, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </aside>
  );
}
