'use client';

import { useState, useTransition } from 'react';
import { Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface Response {
  ok?: boolean;
  examined_publications?: number;
  crossref_hits?: number;
  no_authors_returned?: number;
  linked?: number;
  error?: string;
}

export function CrosslinkCrossrefButton() {
  const t = useTranslations('admin.crosslink_crossref');
  const [isPending, startTransition] = useTransition();
  const [last, setLast] = useState<{ linked: number; examined: number } | null>(null);

  const onClick = () => {
    startTransition(async () => {
      let res: globalThis.Response;
      try {
        res = await fetch('/api/admin/crosslink-crossref', { method: 'POST' });
      } catch {
        toast.error(t('error_network'));
        return;
      }
      if (!res.ok) {
        toast.error(t('error_generic'));
        return;
      }
      const body = (await res.json()) as Response;
      setLast({
        linked: body.linked ?? 0,
        examined: body.examined_publications ?? 0,
      });
      toast.success(
        t('done', { linked: body.linked ?? 0, examined: body.examined_publications ?? 0 }),
        { duration: 6000 },
      );
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="default" size="sm" onClick={onClick} disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
        {t('run')}
      </Button>
      {isPending ? (
        <p className="text-muted-foreground text-xs">{t('in_progress')}</p>
      ) : last ? (
        <p className="text-muted-foreground text-xs">
          {t('last_run', { linked: last.linked, examined: last.examined })}
        </p>
      ) : null}
    </div>
  );
}
