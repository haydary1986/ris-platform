import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

export async function SdgGrid({ locale }: { locale?: Locale }) {
  const t = await getTranslations('landing.sdg');
  const lang = locale ?? 'en';

  return (
    <section>
      <div className="container mx-auto px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{t('subtitle')}</p>
        </div>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9">
          {Array.from({ length: 17 }, (_, i) => i + 1).map((number) => {
            const padded = String(number).padStart(2, '0');
            return (
              <li key={number}>
                <Link
                  href={`/sdg/${number}`}
                  aria-label={t('explore', { number })}
                  className="group focus-visible:ring-ring block overflow-hidden rounded-lg transition-transform hover:scale-[1.04] focus-visible:ring-2"
                >
                  <Image
                    src={`/sdg/${lang}/goal-${padded}.png`}
                    alt={t(`goals.${String(number) as '1'}`)}
                    width={200}
                    height={200}
                    className="h-auto w-full"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
