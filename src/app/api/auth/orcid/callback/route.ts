import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';
import { getOrcidClientId, getOrcidClientSecret } from '@/lib/integrations/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORCID_TOKEN = 'https://orcid.org/oauth/token';
const ORCID_API = 'https://pub.orcid.org/v3.0';

function backTo(path: string): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://ris.uoturath.edu.iq';
  return `${origin}/${routing.defaultLocale}${path}`;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateReceived = url.searchParams.get('state');
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;

  const cookieStore = await cookies();
  const stateStored = cookieStore.get('orcid_state')?.value;
  const verifier = cookieStore.get('orcid_verifier')?.value;
  cookieStore.delete('orcid_state');
  cookieStore.delete('orcid_verifier');

  if (!stateReceived || !stateStored || stateReceived !== stateStored || !verifier) {
    return NextResponse.redirect(backTo('/manage-profile?import=orcid_state'));
  }
  if (!code) {
    return NextResponse.redirect(backTo('/manage-profile?import=orcid_no_code'));
  }

  const clientId = await getOrcidClientId();
  const clientSecret = await getOrcidClientSecret();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(backTo('/manage-profile?import=orcid_not_configured'));
  }

  const callbackUrl = `${origin}/api/auth/orcid/callback`;

  const tokenRes = await fetch(ORCID_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
      code_verifier: verifier,
    }),
    cache: 'no-store',
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(backTo('/manage-profile?import=orcid_exchange'));
  }
  const token = (await tokenRes.json()) as { access_token: string; orcid: string };

  const worksRes = await fetch(`${ORCID_API}/${token.orcid}/works`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token.access_token}` },
    cache: 'no-store',
  });
  if (!worksRes.ok) {
    return NextResponse.redirect(backTo('/manage-profile?import=orcid_fetch'));
  }
  const works = (await worksRes.json()) as {
    group?: Array<{ 'work-summary'?: Array<Record<string, unknown>> }>;
  };

  const items = (works.group ?? []).flatMap((g) =>
    (g['work-summary'] ?? []).map((w: Record<string, unknown>) => {
      const ids =
        ((w['external-ids'] as Record<string, unknown>)?.['external-id'] as Array<
          Record<string, string>
        >) ?? [];
      return {
        title: (w.title as Record<string, Record<string, string>>)?.title?.value ?? null,
        journal_name: (w['journal-title'] as Record<string, string>)?.value ?? null,
        publication_year: (w['publication-date'] as Record<string, Record<string, string>>)?.year
          ?.value
          ? Number(
              (w['publication-date'] as Record<string, Record<string, string>> | undefined)?.year
                ?.value,
            )
          : null,
        doi: ids.find((x) => x['external-id-type'] === 'doi')?.['external-id-value'] ?? null,
        url: (w.url as Record<string, string>)?.value ?? null,
      };
    }),
  );

  const supabase = await createClient();
  const { data: ownerRow } = await supabase.from('researchers_owner').select('id').maybeSingle();
  if (!ownerRow?.id) {
    return NextResponse.redirect(backTo('/manage-profile?import=no_profile'));
  }

  const { data } = await supabase.rpc('update_researcher_publications_orcid', {
    p_researcher_id: ownerRow.id,
    p_publications: items,
  });

  const params = new URLSearchParams({
    import: 'orcid_ok',
    n: String((data as { inserted?: number })?.inserted ?? 0),
  });
  return NextResponse.redirect(`${origin}/${routing.defaultLocale}/manage-profile?${params}`);
}
