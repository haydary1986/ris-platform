'use client';

import { useState, useTransition } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { saveVisibility } from '@/lib/manage/actions';

interface VisibilityToggleProps {
  initial: boolean;
  override: 'force_show' | 'force_hide' | null;
}

export function VisibilityToggle({ initial, override }: VisibilityToggleProps) {
  const t = useTranslations('manage.visibility');
  const tCommon = useTranslations('common');
  const [value, setValue] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function onToggle(next: boolean) {
    const previous = value;
    setValue(next); // optimistic
    startTransition(async () => {
      const res = await saveVisibility({ is_public: next });
      if (!res.ok) {
        setValue(previous);
        toast.error(res.error ?? tCommon('error'));
        return;
      }
      toast.success(next ? '✓ Public' : '✓ Hidden');
    });
  }

  const overrideMessage =
    override === 'force_show'
      ? t('override_force_show')
      : override === 'force_hide'
        ? t('override_force_hide')
        : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {overrideMessage ? (
          <div className="bg-muted/60 text-muted-foreground flex items-start gap-2 rounded-md p-3 text-xs">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <p>{overrideMessage}</p>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="visibility-public" className="text-sm">
            {t('is_public')}
          </Label>
          <Switch
            id="visibility-public"
            checked={value}
            onCheckedChange={onToggle}
            disabled={isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}
