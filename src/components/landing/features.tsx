import { FileText, Globe, UserCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

// The three-feature landing section. Each card reads like a mini SEO
// page with the relevant anchor text ("researcher directory", "academic
// profile", "CV generator") so Google indexes the homepage with those
// feature keywords prominently.
//
// SAMPLE_USERNAME is a deliberate, stable anchor — the platform owner's
// own profile. Hard-coding keeps the link predictable across deploys
// and lets us pick the most complete profile instead of whatever row
// happens to top the h-index ordering on a given day.
const SAMPLE_USERNAME = 'hayder-abdulameer';

export async function Features() {
  const t = await getTranslations('landing.features');

  const profileLink = `/researcher/${SAMPLE_USERNAME}` as const;
  const cvLink = `/researcher/${SAMPLE_USERNAME}/cv` as const;

  const cards = [
    {
      icon: Globe,
      title: t('directory.title'),
      body: t('directory.body'),
      link: t('directory.link'),
      href: '/researchers' as const,
    },
    {
      icon: UserCircle2,
      title: t('academic_profile.title'),
      body: t('academic_profile.body'),
      link: t('academic_profile.link'),
      href: profileLink,
    },
    {
      icon: FileText,
      title: t('cv_generator.title'),
      body: t('cv_generator.body'),
      link: t('cv_generator.link'),
      href: cvLink,
    },
  ];

  return (
    <section className="border-b bg-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h2>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base">{t('subtitle')}</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <article
                key={c.title}
                className="bg-card group relative flex flex-col rounded-xl border p-6 transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="from-primary/15 to-primary/5 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br">
                  <Icon className="text-primary size-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{c.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{c.body}</p>
                <Link
                  href={c.href}
                  className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  {c.link} →
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
