import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from './language-switcher';
import { UserMenu } from './user-menu';
import { MobileNav } from './mobile-nav';
import { CollegesMegaMenu, type CollegeWithDepts } from './colleges-mega-menu';
import { CollegesMobileAccordion } from './colleges-mobile-accordion';
import { NotificationBell } from './notification-bell';
import { createClient } from '@/lib/supabase/server';

interface NavLink {
  href: '/' | '/researchers' | '/publications' | '/leaderboard' | '/analytics';
  key: 'home' | 'researchers' | 'publications' | 'leaderboard' | 'analytics';
}

const NAV_LINKS: NavLink[] = [
  { href: '/', key: 'home' },
  { href: '/researchers', key: 'researchers' },
  { href: '/publications', key: 'publications' },
  { href: '/leaderboard', key: 'leaderboard' },
  { href: '/analytics', key: 'analytics' },
];

export async function Header() {
  const tNav = await getTranslations('navigation');
  const tCommon = await getTranslations('common');
  const locale = (await getLocale()) as 'ar' | 'en';

  let user: { email: string | null; avatarUrl: string | null } | null = null;
  let isAdmin = false;
  let logoUrl = '';
  let logoDarkUrl = '';
  let logoText = '';
  let colleges: CollegeWithDepts[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      user = {
        email: data.user.email ?? null,
        avatarUrl: (data.user.user_metadata?.avatar_url as string | undefined) ?? null,
      };
      const { data: adminRow } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();
      isAdmin = Boolean(adminRow);
    }
    // Load branding from DB
    const { data: brandingRows } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'branding.logo_url',
        'branding.logo_dark_url',
        'branding.logo_text',
        'branding.favicon_url',
      ]);
    for (const row of brandingRows ?? []) {
      const val = typeof row.value === 'string' ? row.value.replace(/^"|"$/g, '') : '';
      if (row.key === 'branding.logo_url' && val) logoUrl = val;
      if (row.key === 'branding.logo_dark_url' && val) logoDarkUrl = val;
      if (row.key === 'branding.logo_text' && val) logoText = val;
    }

    // Colleges + their departments for the mega menu. Ordered by
    // English name for a predictable column layout.
    const [{ data: collegeRows }, { data: deptRows }] = await Promise.all([
      supabase
        .from('colleges')
        .select('id, slug, name_en, name_ar')
        .order('name_en', { ascending: true }),
      supabase
        .from('departments')
        .select('id, college_id, slug, name_en, name_ar')
        .order('name_en', { ascending: true }),
    ]);
    const deptsByCollege = new Map<string, CollegeWithDepts['departments']>();
    for (const d of (deptRows as
      | { college_id: string; slug: string; name_en: string; name_ar: string }[]
      | null) ?? []) {
      const list = deptsByCollege.get(d.college_id) ?? [];
      list.push({ slug: d.slug, name_en: d.name_en, name_ar: d.name_ar });
      deptsByCollege.set(d.college_id, list);
    }
    colleges = (
      (collegeRows as { id: string; slug: string; name_en: string; name_ar: string }[] | null) ?? []
    ).map((c) => ({
      slug: c.slug,
      name_en: c.name_en,
      name_ar: c.name_ar,
      departments: deptsByCollege.get(c.id) ?? [],
    }));
  } catch {
    // Supabase not configured locally — render signed-out header.
  }

  return (
    <header className="bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight whitespace-nowrap"
        >
          {logoUrl ? (
            <>
              <img
                src={logoUrl}
                alt={logoText || tCommon('app_name')}
                className={`h-8 object-contain ${logoDarkUrl ? 'dark:hidden' : ''}`}
              />
              {logoDarkUrl ? (
                <img
                  src={logoDarkUrl}
                  alt={logoText || tCommon('app_name')}
                  className="hidden h-8 object-contain dark:block"
                />
              ) : null}
            </>
          ) : (
            logoText || tCommon('app_name')
          )}
          <span className="text-muted-foreground hidden text-xs font-normal sm:inline">
            {tCommon('university')}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {tNav(link.key)}
            </Link>
          ))}
          {colleges.length > 0 ? (
            <CollegesMegaMenu
              label={tNav('colleges')}
              seeAllLabel={tNav('see_all')}
              departmentsLabel={tNav('departments')}
              colleges={colleges}
              locale={locale}
            />
          ) : null}
        </nav>

        <div className="flex items-center gap-1">
          {user ? <NotificationBell /> : null}
          <ThemeToggle />
          <LanguageSwitcher />
          <div className="hidden md:block">
            <UserMenu user={user} isAdmin={isAdmin} />
          </div>

          <MobileNav
            title={tCommon('app_name')}
            links={
              <>
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className="hover:bg-accent rounded-md px-3 py-2 text-sm font-medium"
                  >
                    {tNav(link.key)}
                  </Link>
                ))}
                {colleges.length > 0 ? (
                  <CollegesMobileAccordion
                    label={tNav('colleges')}
                    colleges={colleges}
                    locale={locale}
                  />
                ) : null}
              </>
            }
            userMenu={<UserMenu user={user} isAdmin={isAdmin} />}
          />
        </div>
      </div>
    </header>
  );
}
