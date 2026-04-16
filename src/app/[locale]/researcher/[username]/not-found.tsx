import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('directory');
  return (
    <main className="container mx-auto flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="text-muted-foreground text-sm">{t('empty.title')}</p>
      <Link href="/researchers" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        {t('title')}
      </Link>
    </main>
  );
}
