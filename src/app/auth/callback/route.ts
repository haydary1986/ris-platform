import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';
import { autoImportForUser, autoImportFromOrcid } from '@/lib/import/auto-import';
import { checkProfileComplete } from '@/lib/profile/is-complete';

const SAFE_NEXT = /^\/(en|ar)\/[a-zA-Z0-9_\-/]*$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const requestedNext = url.searchParams.get('next');

  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const defaultLocale = routing.defaultLocale;

  const next =
    requestedNext && SAFE_NEXT.test(requestedNext)
      ? requestedNext
      : `/${defaultLocale}/manage-profile`;

  if (!code) {
    return NextResponse.redirect(new URL(`/${defaultLocale}/sign-in?error=missing_code`, origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/${defaultLocale}/sign-in?error=exchange_failed`, origin),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    Promise.all([
      autoImportFromOrcid(user.id, user.email),
      autoImportForUser(user.id, user.email),
    ]).catch(() => {});
  }

  // Check if profile is complete — redirect to onboarding if not
  const { data: profile } = await supabase
    .from('researchers_owner')
    .select('college_id, department_id, academic_title_id, full_name_en, full_name_ar')
    .maybeSingle();

  if (profile) {
    const check = checkProfileComplete(profile);
    if (!check.complete) {
      return NextResponse.redirect(new URL(`/${defaultLocale}/complete-profile`, origin));
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
