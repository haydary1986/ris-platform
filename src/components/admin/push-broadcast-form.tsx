'use client';

import { useState, useTransition } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';

interface BroadcastFormProps {
  totalSubs: number;
}

type TargetLocale = 'ar' | 'en' | 'all';

export function BroadcastForm({ totalSubs }: BroadcastFormProps) {
  const t = useTranslations('admin.push_page');
  const locale = useLocale();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [target, setTarget] = useState<TargetLocale>('all');
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!title.trim() || !body.trim() || isPending) return;
    startTransition(async () => {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url: url || null, locale: target }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        recipients?: number;
        success?: number;
        failure?: number;
      };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? t('send_failed'));
        return;
      }
      toast.success(
        t('send_success', {
          success: json.success ?? 0,
          recipients: json.recipients ?? 0,
        }),
      );
      setTitle('');
      setBody('');
      setUrl('');
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">{t('compose_title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="push-title" className="text-xs">
            {t('label_title')}
          </Label>
          <Input
            id="push-title"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('placeholder_title')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="push-body" className="text-xs">
            {t('label_body')}
          </Label>
          <Textarea
            id="push-body"
            maxLength={400}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('placeholder_body')}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="push-url" className="text-xs">
              {t('label_url')}
            </Label>
            <Input
              id="push-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={`/${locale}/researchers`}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="push-target" className="text-xs">
              {t('label_target')}
            </Label>
            <Select value={target} onValueChange={(v) => setTarget(v as TargetLocale)}>
              <SelectTrigger id="push-target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('target_all')}</SelectItem>
                <SelectItem value="ar">{t('target_ar')}</SelectItem>
                <SelectItem value="en">{t('target_en')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-muted-foreground text-xs">{t('total_subs', { count: totalSubs })}</p>
          <Button
            type="button"
            onClick={submit}
            disabled={!title.trim() || !body.trim() || isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {t('send')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
