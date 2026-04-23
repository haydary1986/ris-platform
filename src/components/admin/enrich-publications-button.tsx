'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

// POSTs to /api/publications/enrich in a loop, surfacing progress as a
// toast. Each call handles at most 30 rows so the request stays well
// under any serverless timeout; we loop until the route says
// remaining_hint === 'likely_done'.

interface EnrichResponse {
  ok?: boolean;
  error?: string;
  examined?: number;
  enriched?: number;
  not_found?: number;
  remaining_hint?: 'likely_more' | 'likely_done';
}

const MAX_BATCHES = 20; // 30 rows * 20 batches = up to 600 rows per click

export function EnrichPublicationsButton() {
  const t = useTranslations('admin.enrich');
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ examined: number; enriched: number } | null>(null);

  const onClick = () => {
    startTransition(async () => {
      setProgress({ examined: 0, enriched: 0 });
      let totalExamined = 0;
      let totalEnriched = 0;

      for (let i = 0; i < MAX_BATCHES; i += 1) {
        let res: Response;
        try {
          res = await fetch('/api/publications/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch: 30 }),
          });
        } catch {
          toast.error(t('error_network'));
          return;
        }
        if (!res.ok) {
          toast.error(t('error_generic'));
          return;
        }
        const body = (await res.json()) as EnrichResponse;
        totalExamined += body.examined ?? 0;
        totalEnriched += body.enriched ?? 0;
        setProgress({ examined: totalExamined, enriched: totalEnriched });

        if (body.remaining_hint === 'likely_done' || (body.examined ?? 0) === 0) {
          toast.success(t('done', { examined: totalExamined, enriched: totalEnriched }));
          return;
        }
      }
      toast.success(t('partial', { examined: totalExamined, enriched: totalEnriched }));
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" size="sm" onClick={onClick} disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {t('run')}
      </Button>
      {isPending && progress ? (
        <p className="text-muted-foreground text-xs">
          {t('progress', { examined: progress.examined, enriched: progress.enriched })}
        </p>
      ) : null}
    </div>
  );
}
