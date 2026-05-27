// Server-rendered tab navigation. Replaces the previous client-only
// `ProfileTabs` so each tab becomes a real URL — needed for SSR
// indexing, deep-linking, and the V5 audit's "publication lists must
// be publicly addressable" check.
//
// The active tab is derived from the current pathname rather than React
// state so SSR works without hydration.

'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface ProfileTabsNavProps {
  username: string;
}

const TABS = [
  { key: 'overview', segment: '' },
  { key: 'publications', segment: '/publications' },
  { key: 'projects', segment: '/projects' },
  { key: 'experience', segment: '/experience' },
  { key: 'thesis', segment: '/thesis-supervision' },
  { key: 'activities', segment: '/activities' },
] as const;

// Strip the locale prefix so we compare against the canonical path.
// next-intl mounts every route under /ar or /en so a raw pathname like
// "/en/researcher/foo/publications" needs the leading locale removed
// before we test the suffix.
function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/(ar|en)(\/.*)?$/);
  return m ? (m[2] ?? '/') : pathname;
}

export function ProfileTabsNav({ username }: ProfileTabsNavProps) {
  const t = useTranslations('profile.tabs');
  const pathname = stripLocale(usePathname());
  const basePath = `/researcher/${username}`;

  return (
    <nav
      className="bg-muted text-muted-foreground inline-flex h-10 items-center justify-start gap-1 rounded-md p-1"
      role="tablist"
      aria-label={t('overview')}
    >
      {TABS.map((tab) => {
        const href = `${basePath}${tab.segment}`;
        // Active if the pathname matches exactly OR (for overview) when
        // we're on the bare /researcher/{username}.
        const active =
          tab.segment === ''
            ? pathname === basePath
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.key}
            href={href as `/researcher/${string}`}
            role="tab"
            aria-selected={active}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:bg-background/50 hover:text-foreground',
            )}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
