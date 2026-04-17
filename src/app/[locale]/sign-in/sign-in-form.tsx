'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SignInFormProps {
  next: string | undefined;
  error: string | undefined;
}

export function SignInForm({ next, error }: SignInFormProps) {
  const t = useTranslations('auth.sign_in');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  const safeNext = next?.startsWith('/') ? next : `/${locale}/manage-profile`;

  async function handleGoogle() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      });
      if (oauthError) {
        toast.error(oauthError.message);
        setLoading(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tCommon('error'));
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/50">
          <Info className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-800 dark:text-blue-300">{t('institutional_only')}</p>
        </div>
        {error === 'unauthorized_domain' ? (
          <div
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50"
            role="alert"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-300">
              {t('error_unauthorized_domain')}
            </p>
          </div>
        ) : error ? (
          <p className="text-destructive text-sm" role="alert">
            {t('error_generic')}
          </p>
        ) : null}
        <Button onClick={handleGoogle} disabled={loading} className="w-full">
          {loading ? tCommon('loading') : t('google')}
        </Button>
      </CardContent>
    </Card>
  );
}
