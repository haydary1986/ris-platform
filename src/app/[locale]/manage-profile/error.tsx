'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function ManageProfileError({ reset }: { reset: () => void }) {
  const t = useTranslations('common');
  return (
    <main className="container mx-auto flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{t('error')}</h1>
      <Button onClick={reset}>Reload</Button>
    </main>
  );
}
