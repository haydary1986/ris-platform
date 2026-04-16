import { LinkIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function OrcidSection({ configured }: { configured: boolean }) {
  const t = await getTranslations('import.orcid');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">{t('intro')}</p>
        {configured ? (
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- OAuth requires a full navigation
          <a href="/api/auth/orcid" className={buttonVariants({ variant: 'default', size: 'sm' })}>
            <LinkIcon className="size-4" />
            {t('connect')}
          </a>
        ) : (
          <p className="text-muted-foreground text-xs italic">{t('not_configured')}</p>
        )}
      </CardContent>
    </Card>
  );
}
