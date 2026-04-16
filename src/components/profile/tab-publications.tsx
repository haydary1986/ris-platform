'use client';

import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { CoauthorRow, ProfilePayload, PublicationRow } from '@/lib/profile/types';

interface TabPublicationsProps {
  payload: ProfilePayload;
}

const ALL = '__all__';
const PAGE_SIZE = 20;

function authorsLine(pubId: string, all: CoauthorRow[]): string {
  return all
    .filter((c) => c.publication_id === pubId)
    .sort((a, b) => a.author_order - b.author_order)
    .map((c) => c.author_name)
    .join(', ');
}

export function TabPublications({ payload }: TabPublicationsProps) {
  const t = useTranslations('profile.publications');
  const locale = useLocale();
  const { publications, coauthors, lookups } = payload;

  const years = useMemo(() => {
    const set = new Set<number>();
    publications.forEach((p) => p.publication_year && set.add(p.publication_year));
    return Array.from(set).sort((a, b) => b - a);
  }, [publications]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    publications.forEach((p) => p.source_id && set.add(p.source_id));
    return Array.from(set);
  }, [publications]);

  const types = useMemo(() => {
    const set = new Set<string>();
    publications.forEach((p) => p.publication_type_id && set.add(p.publication_type_id));
    return Array.from(set);
  }, [publications]);

  const [year, setYear] = useState<string>(ALL);
  const [source, setSource] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const [visible, setVisible] = useState<number>(PAGE_SIZE);

  const filtered = useMemo(() => {
    return publications.filter((p) => {
      if (year !== ALL && p.publication_year !== Number(year)) return false;
      if (source !== ALL && p.source_id !== source) return false;
      if (type !== ALL && p.publication_type_id !== type) return false;
      return true;
    });
  }, [publications, year, source, type]);

  if (publications.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">{t('empty')}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="pub-year">{t('filter_year')}</Label>
          <Select
            value={year}
            onValueChange={(v) => {
              setYear(v ?? ALL);
              setVisible(PAGE_SIZE);
            }}
          >
            <SelectTrigger id="pub-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('all')}</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pub-source">{t('filter_source')}</Label>
          <Select
            value={source}
            onValueChange={(v) => {
              setSource(v ?? ALL);
              setVisible(PAGE_SIZE);
            }}
          >
            <SelectTrigger id="pub-source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('all')}</SelectItem>
              {sources.map((id) => (
                <SelectItem key={id} value={id}>
                  {lookups.publicationSourceById.get(id)?.name ?? id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pub-type">{t('filter_type')}</Label>
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v ?? ALL);
              setVisible(PAGE_SIZE);
            }}
          >
            <SelectTrigger id="pub-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('all')}</SelectItem>
              {types.map((id) => {
                const t = lookups.publicationTypeById.get(id);
                return (
                  <SelectItem key={id} value={id}>
                    {(locale === 'ar' && t?.name_ar) || t?.name_en || id}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ul className="space-y-3">
        {filtered.slice(0, visible).map((p) => (
          <PublicationRowItem key={p.id} pub={p} authors={authorsLine(p.id, coauthors)} />
        ))}
      </ul>

      {visible < filtered.length ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="text-primary text-sm font-medium hover:underline"
          >
            +{Math.min(PAGE_SIZE, filtered.length - visible)}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PublicationRowItem({ pub, authors }: { pub: PublicationRow; authors: string }) {
  const t = useTranslations('profile.publications');
  const venue = pub.journal_name ?? pub.conference_name ?? pub.publisher;

  return (
    <li>
      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold leading-snug">{pub.title}</h3>
            {pub.publication_year ? (
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {pub.publication_year}
              </span>
            ) : null}
          </div>
          {authors ? <p className="text-muted-foreground text-xs italic">{authors}</p> : null}
          {venue ? <p className="text-muted-foreground text-xs">{venue}</p> : null}

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {pub.is_scopus ? <Badge variant="secondary">Scopus</Badge> : null}
            {pub.is_wos ? <Badge variant="secondary">WoS</Badge> : null}
            {pub.is_open_access ? <Badge variant="outline">{t('open_access')}</Badge> : null}
            {pub.scopus_citations !== null && pub.scopus_citations > 0 ? (
              <Badge variant="outline" className="text-[10px]">
                {t('scopus_citations', { n: pub.scopus_citations })}
              </Badge>
            ) : null}
            {pub.wos_citations !== null && pub.wos_citations > 0 ? (
              <Badge variant="outline" className="text-[10px]">
                {t('wos_citations', { n: pub.wos_citations })}
              </Badge>
            ) : null}
            {pub.doi ? (
              <a
                href={`https://doi.org/${pub.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-0.5 text-xs hover:underline"
              >
                <ExternalLink className="size-3" />
                {t('doi')}
              </a>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
