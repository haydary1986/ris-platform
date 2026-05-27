'use client';

import { useState, useTransition } from 'react';
import { Loader2, Network } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface Response {
  ok?: boolean;
  examined?: number;
  linked?: number;
  skipped_self?: number;
  remaining_unlinked?: number;
  error?: string;
}

export function LinkCoauthorsButton() {
  const t = useTranslations('admin.link_coauthors');
  const [isPending, startTransition] = useTransition();
  const [last, setLast] = useState<{ linked: number; examined: number } | null>(null);

  const onClick = () => {
    startTransition(async () => {
      let res: globalThis.Response;
      try {
        res = await fetch('/api/admin/link-coauthors', { method: 'POST' });
      } catch {
        toast.error(t('error_network'));
        return;
      }
      if (!res.ok) {
        toast.error(t('error_generic'));
        return;
      }
      const body = (await res.json()) as Response;
      setLast({ linked: body.linked ?? 0, examined: body.examined ?? 0 });
      toast.success(t('done', { linked: body.linked ?? 0, examined: body.examined ?? 0 }));
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" size="sm" onClick={onClick} disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Network className="size-4" />}
        {t('run')}
      </Button>
      {last ? (
        <p className="text-muted-foreground text-xs">
          {t('last_run', { linked: last.linked, examined: last.examined })}
        </p>
      ) : null}
    </div>
  );
}
