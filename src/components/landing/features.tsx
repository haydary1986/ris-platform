import { FileText, Globe, UserCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';

// The three-feature landing section. Each card reads like a mini SEO
// page with the relevant anchor text ("researcher directory", "academic
// profile", "CV generator") so Google indexes the homepage with those
// feature keywords prominently. The CV card deep-links into a real
// researcher's CV page so the link stays alive even as the directory
// grows — we pick whoever sits on top of the h-index ranking.

export async function Features() {
  const t = await getTranslations('landing.features');

  let sampleUsername = '';
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('researchers_public')
      .select('username')
      .order('scopus_h_index', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (data?.username) sampleUsername = data.username;
  } catch {
    /* directory empty or Supabase offline — fall back to list */
  }

  const profileLink = sampleUsername ? `/researcher/${sampleUsername}` : '/researchers';
  const cvLink = sampleUsername ? `/researcher/${sampleUsername}/cv` : '/researchers';

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
      href: profileLink as '/researchers' | `/researcher/${string}`,
    },
    {
      icon: FileText,
      title: t('cv_generator.title'),
      body: t('cv_generator.body'),
      link: t('cv_generator.link'),
      href: cvLink as '/researchers' | `/researcher/${string}/cv`,
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
