'use client';

import { useState, useTransition } from 'react';
import { Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface Response {
  ok?: boolean;
  examined?: number;
  updated?: number;
  untagged?: number;
  error?: string;
}

export function ClassifySdgButton() {
  const t = useTranslations('admin.sdg_classify');
  const [isPending, startTransition] = useTransition();
  const [last, setLast] = useState<{ updated: number; examined: number } | null>(null);

  const onClick = () => {
    startTransition(async () => {
      let res: globalThis.Response;
      try {
        res = await fetch('/api/publications/classify-sdg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
      } catch {
        toast.error(t('error_network'));
        return;
      }
      if (!res.ok) {
        toast.error(t('error_generic'));
        return;
      }
      const body = (await res.json()) as Response;
      setLast({ updated: body.updated ?? 0, examined: body.examined ?? 0 });
      toast.success(t('done', { updated: body.updated ?? 0, examined: body.examined ?? 0 }));
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" size="sm" onClick={onClick} disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Tag className="size-4" />}
        {t('run')}
      </Button>
      {last ? (
        <p className="text-muted-foreground text-xs">
          {t('last_run', { updated: last.updated, examined: last.examined })}
        </p>
      ) : null}
    </div>
  );
}
