// Tasks 40 + 41 — Next.js 16 proxy (formerly middleware).
//
// Three jobs, in this order:
//   1. Run the next-intl middleware so locale routing is applied first
//      (handles `/` → `/en` and `?lang=` resolution).
//   2. Refresh the Supabase session via @supabase/ssr — `getUser()` rotates
//      cookies on the response when the access token is near expiry.
//   3. Enforce route guards: redirect unauthenticated users away from
//      `/{locale}/manage-profile` and `/{locale}/admin/*`, and bounce
//      already-authenticated users away from `/{locale}/sign-in`.

import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { routing, type Locale } from '@/i18n/routing';

const intlProxy = createIntlMiddleware(routing);

const PROTECTED_PATTERNS: RegExp[] = [
  /^\/(en|ar)\/manage-profile(\/.*)?$/,
  /^\/(en|ar)\/admin(\/.*)?$/,
  /^\/(en|ar)\/claim-profile(\/.*)?$/,
];

const SIGNED_OUT_ONLY_PATTERNS: RegExp[] = [/^\/(en|ar)\/sign-in(\/.*)?$/];

// Task 83 — legacy URL redirect: /{username}/{lang} → /{lang}/researcher/{username}
const LEGACY_PROFILE_PATTERN = /^\/([a-z0-9][a-z0-9_-]{1,63})\/(en|ar)\/?$/i;
const RESERVED_FIRST_SEGMENTS = new Set([
  'en',
  'ar',
  'researchers',
  'researcher',
  'manage-profile',
  'admin',
  'sign-in',
  'auth',
  'api',
  'monitoring',
  'sdg',
  'college',
  'department',
  'publication',
  'year',
  'topic',
  'search',
  'analytics',
  'about',
  'contact',
  'privacy',
  'terms',
  'claim-profile',
  'sitemap.xml',
  'robots.txt',
]);

function localeFromPath(pathname: string): Locale {
  const seg = pathname.split('/')[1];
  if (seg && (routing.locales as readonly string[]).includes(seg)) {
    return seg as Locale;
  }
  return routing.defaultLocale;
}

function copyCookies(from: NextResponse, to: NextResponse): void {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c.name, c.value);
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // 0. Legacy /{username}/{lang} → /{lang}/researcher/{username} (Task 83).
  const legacy = LEGACY_PROFILE_PATTERN.exec(request.nextUrl.pathname);
  if (legacy && legacy[1] && legacy[2] && !RESERVED_FIRST_SEGMENTS.has(legacy[1].toLowerCase())) {
    const url = request.nextUrl.clone();
    url.pathname = `/${legacy[2]}/researcher/${legacy[1]}`;
    return NextResponse.redirect(url, 301);
  }

  // 1. Locale routing
  const intlResponse = intlProxy(request);

  // If next-intl is redirecting (root → default locale), let it through.
  if (intlResponse.headers.get('location')) {
    return intlResponse;
  }

  // 2. Supabase session refresh — write any rotated cookies onto intlResponse.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user: { id: string } | null = null;

  if (supabaseUrl && supabaseAnon) {
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            intlResponse.cookies.set(name, value, options);
          }
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    user = data.user ? { id: data.user.id } : null;
  }

  // 3. Route guards.
  const pathname = request.nextUrl.pathname;
  const locale = localeFromPath(pathname);

  if (!user && PROTECTED_PATTERNS.some((p) => p.test(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/sign-in`;
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(url);
    copyCookies(intlResponse, redirect);
    return redirect;
  }

  if (user && SIGNED_OUT_ONLY_PATTERNS.some((p) => p.test(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/manage-profile`;
    url.search = '';
    const redirect = NextResponse.redirect(url);
    copyCookies(intlResponse, redirect);
    return redirect;
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|monitoring|.*\\..*).*)'],
};
