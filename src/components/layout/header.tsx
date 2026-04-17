import { Menu } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from './language-switcher';
import { UserMenu } from './user-menu';
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

  let user: { email: string | null; avatarUrl: string | null } | null = null;
  let isAdmin = false;
  let logoUrl = '';
  let logoDarkUrl = '';
  let logoText = '';

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
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
          <div className="hidden md:block">
            <UserMenu user={user} isAdmin={isAdmin} />
          </div>

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>{tCommon('app_name')}</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-2 px-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className="hover:bg-accent rounded-md px-3 py-2 text-sm font-medium"
                  >
                    {tNav(link.key)}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 border-t px-4 pt-4">
                <UserMenu user={user} isAdmin={isAdmin} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
