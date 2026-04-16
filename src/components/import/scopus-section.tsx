'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ScopusSection({ configured }: { configured: boolean }) {
  const t = useTranslations('import.scopus');
  const [authorId, setAuthorId] = useState('');
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!/^\d{6,15}$/.test(authorId.trim())) {
      toast.error(t('error', { detail: 'invalid id' }));
      return;
    }
    startTransition(async () => {
      const res = await fetch('/api/import/scopus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopus_author_id: authorId.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        inserted?: number;
      };
      if (!res.ok || !json.ok) {
        toast.error(t('error', { detail: json.error ?? `HTTP ${res.status}` }));
        return;
      }
      toast.success(t('ok', { n: json.inserted ?? 0 }));
      setAuthorId('');
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">{t('intro')}</p>
        {configured ? (
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="scopus_author_id">{t('id_label')}</Label>
              <Input
                id="scopus_author_id"
                inputMode="numeric"
                placeholder={t('id_placeholder')}
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
              />
            </div>
            <Button type="button" size="sm" disabled={isPending || !authorId} onClick={submit}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t('import_now')}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs italic">{t('not_configured')}</p>
        )}
      </CardContent>
    </Card>
  );
}
