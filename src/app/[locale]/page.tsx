import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ThemeToggle } from '@/components/theme-toggle';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tCommon = await getTranslations('common');
  const tLanding = await getTranslations('landing');

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="absolute top-4 end-4">
        <ThemeToggle />
      </div>
      <p className="text-muted-foreground text-xs uppercase tracking-widest">
        {tCommon('university')}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {tLanding('hero.title')}
      </h1>
      <p className="text-muted-foreground max-w-xl text-base sm:text-lg">
        {tLanding('hero.tagline')}
      </p>
      <p className="text-muted-foreground/70 text-sm">
        locale: <code className="font-mono">{locale}</code>
      </p>
    </main>
  );
}
