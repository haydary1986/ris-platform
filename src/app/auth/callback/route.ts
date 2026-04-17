import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';
import { autoImportForUser, autoImportFromOrcid } from '@/lib/import/auto-import';

const SAFE_NEXT = /^\/(en|ar)\/[a-zA-Z0-9_\-/]*$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const requestedNext = url.searchParams.get('next');

  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;

  const next =
    requestedNext && SAFE_NEXT.test(requestedNext)
      ? requestedNext
      : `/${routing.defaultLocale}/manage-profile`;

  if (!code) {
    return NextResponse.redirect(
      new URL(`/${routing.defaultLocale}/sign-in?error=missing_code`, origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/${routing.defaultLocale}/sign-in?error=exchange_failed`, origin),
    );
  }

  // Auto-import on first sign-in (background, non-blocking)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email) {
    // Try both sources in parallel — ORCID (by email) + OpenAlex (by name)
    Promise.all([
      autoImportFromOrcid(user.id, user.email),
      autoImportForUser(user.id, user.email),
    ]).catch(() => {});
  }

  return NextResponse.redirect(new URL(next, origin));
}
