'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { updateSetting } from '@/lib/admin/actions';

interface Translations {
  showScopusWosStats: string;
  showScopusWosStatsDesc: string;
  success: string;
  error: string;
}

interface HomepageSettingsClientProps {
  initialShowStats: boolean;
  translations: Translations;
}

export function HomepageSettingsClient({
  initialShowStats,
  translations: t,
}: HomepageSettingsClientProps) {
  const [showStats, setShowStats] = useState(initialShowStats);
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setShowStats(checked);
    startTransition(async () => {
      const result = await updateSetting('homepage.show_scopus_wos_stats', checked);
      if (result.ok) {
        toast.success(t.success);
      } else {
        setShowStats(!checked);
        toast.error(result.error ?? t.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.showScopusWosStats}</CardTitle>
        <CardDescription>{t.showScopusWosStatsDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Switch
            id="show-stats"
            checked={showStats}
            onCheckedChange={handleToggle}
            disabled={isPending}
          />
          <Label htmlFor="show-stats" className="text-sm">
            {t.showScopusWosStats}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
