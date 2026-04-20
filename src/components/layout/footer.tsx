import { ExternalLink, Mail, MapPin } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';

interface CollegeLink {
  slug: string;
  name_en: string;
  name_ar: string;
}

async function fetchColleges(): Promise<CollegeLink[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('colleges')
      .select('slug, name_en, name_ar')
      .order('name_en')
      .limit(8);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function Footer() {
  const tFooter = await getTranslations('footer');
  const tNav = await getTranslations('navigation');
  const tCommon = await getTranslations('common');
  const locale = (await getLocale()) as 'ar' | 'en';
  const year = new Date().getFullYear();

  const colleges = await fetchColleges();

  const exploreLinks: Array<{
    href:
      | '/researchers'
      | '/publications'
      | '/leaderboard'
      | '/analytics'
      | '/colleges'
      | '/collaborations';
    label: string;
  }> = [
    { href: '/researchers', label: tNav('researchers') },
    { href: '/publications', label: tNav('publications') },
    { href: '/colleges', label: tNav('colleges') },
    { href: '/leaderboard', label: tNav('leaderboard') },
    { href: '/analytics', label: tNav('analytics') },
  ];

  return (
    <footer className="bg-muted/30 mt-auto border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand / Identity */}
          <div className="lg:col-span-1">
            <p className="text-base font-semibold">{tCommon('app_full_name')}</p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {tFooter('brand_pitch')}
            </p>
            <div className="text-muted-foreground mt-4 space-y-2 text-xs">
              <p className="flex items-center gap-2">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {tFooter('address')}
              </p>
              <a
                href="https://uoturath.edu.iq"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                uoturath.edu.iq
              </a>
              <a
                href="mailto:research@uoturath.edu.iq"
                className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
              >
                <Mail className="size-3.5 shrink-0" aria-hidden />
                research@uoturath.edu.iq
              </a>
            </div>
          </div>

          {/* Explore */}
          <nav className="text-sm" aria-label={tFooter('explore')}>
            <p className="mb-3 text-xs font-semibold tracking-wider uppercase">
              {tFooter('explore')}
            </p>
            <ul className="text-muted-foreground space-y-2">
              {exploreLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Colleges (locale-aware) */}
          {colleges.length > 0 ? (
            <nav className="text-sm" aria-label={tFooter('colleges')}>
              <p className="mb-3 text-xs font-semibold tracking-wider uppercase">
                {tFooter('colleges')}
              </p>
              <ul className="text-muted-foreground space-y-2">
                {colleges.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/college/${c.slug}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {locale === 'ar' ? c.name_ar || c.name_en : c.name_en || c.name_ar}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {/* About & Legal */}
          <nav className="text-sm" aria-label={tFooter('about_section')}>
            <p className="mb-3 text-xs font-semibold tracking-wider uppercase">
              {tFooter('about_section')}
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  {tFooter('about')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  {tFooter('contact')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  {tFooter('privacy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  {tFooter('terms')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom strip: copyright + author attribution */}
        <div className="mt-10 flex flex-col items-center gap-2 border-t pt-6 text-center text-xs sm:flex-row sm:justify-between sm:text-start">
          <p className="text-muted-foreground">{tFooter('copyright', { year })}</p>
          <p className="text-muted-foreground">{tFooter('built_by')}</p>
        </div>
      </div>
    </footer>
  );
}
