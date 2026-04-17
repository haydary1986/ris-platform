'use client';

import { useState } from 'react';
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
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {t('error_generic')}
          </p>
        ) : null}
        <Button onClick={handleGoogle} disabled={loading} className="w-full">
          {loading ? tCommon('loading') : t('google')}
        </Button>
        <p className="text-muted-foreground text-center text-xs">{t('institutional_only')}</p>
      </CardContent>
    </Card>
  );
}
