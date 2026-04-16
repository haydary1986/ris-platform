// Task 104 + FIX-27 — ORCID OAuth callback.
//
// Order of operations matters:
//   1. Read state + verifier cookies AND immediately delete them
//      (one-time-use to prevent replay). Done even on failure.
//   2. Verify state matches what ORCID echoed back (CSRF gate).
//   3. Exchange code with PKCE verifier.
//   4. Fetch ORCID Works using the returned access token.
//   5. Map → merge RPC under the caller's session (RLS prevents writes
//      to anyone else's row).
//   6. Redirect back to /manage-profile?import=ok|error.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORCID_TOKEN = 'https://orcid.org/oauth/token';
const ORCID_API = 'https://pub.orcid.org/v3.0';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  orcid: string;
  scope: string;
}

interface OrcidWorksSummary {
  group?: Array<{
    'work-summary'?: Array<{
      title?: { title?: { value?: string } };
      'publication-date'?: { year?: { value?: string } };
      'journal-title'?: { value?: string };
      'external-ids'?: {
        'external-id'?: Array<{ 'external-id-type': string; 'external-id-value': string }>;
      };
      url?: { value?: string } | null;
    }>;
  }>;
}

function backTo(path: string): string {
  return `/${routing.defaultLocale}${path}`;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateReceived = url.searchParams.get('state');

  const cookieStore = await cookies();
  const stateStored = cookieStore.get('orcid_state')?.value;
  const verifier = cookieStore.get('orcid_verifier')?.value;
  cookieStore.delete('orcid_state');
  cookieStore.delete('orcid_verifier');

  if (!stateReceived || !stateStored || stateReceived !== stateStored || !verifier) {
    return NextResponse.redirect(new URL(backTo('/manage-profile?import=orcid_state'), url.origin));
  }
  if (!code) {
    return NextResponse.redirect(
      new URL(backTo('/manage-profile?import=orcid_no_code'), url.origin),
    );
  }

  const clientId = process.env.ORCID_CLIENT_ID;
  const clientSecret = process.env.ORCID_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(backTo('/manage-profile?import=orcid_not_configured'), url.origin),
    );
  }

  const callbackUrl = `${url.origin}/api/auth/orcid/callback`;

  // Exchange code for access_token
  const tokenRes = await fetch(ORCID_TOKEN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
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
    return NextResponse.redirect(
      new URL(backTo('/manage-profile?import=orcid_exchange'), url.origin),
    );
  }
  const token = (await tokenRes.json()) as TokenResponse;

  // Fetch works summary
  const worksRes = await fetch(`${ORCID_API}/${token.orcid}/works`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token.access_token}` },
    cache: 'no-store',
  });
  if (!worksRes.ok) {
    return NextResponse.redirect(new URL(backTo('/manage-profile?import=orcid_fetch'), url.origin));
  }
  const works = (await worksRes.json()) as OrcidWorksSummary;

  const items = (works.group ?? []).flatMap((g) =>
    (g['work-summary'] ?? []).map((w) => {
      const ids = w['external-ids']?.['external-id'] ?? [];
      const doi = ids.find((x) => x['external-id-type'] === 'doi')?.['external-id-value'] ?? null;
      const isbn = ids.find((x) => x['external-id-type'] === 'isbn')?.['external-id-value'] ?? null;
      return {
        title: w.title?.title?.value ?? null,
        journal_name: w['journal-title']?.value ?? null,
        publication_year: w['publication-date']?.year?.value
          ? Number(w['publication-date'].year.value)
          : null,
        doi,
        isbn,
        url: w.url?.value ?? null,
      };
    }),
  );

  // Now write under caller's session.
  const supabase = await createClient();
  const { data: ownerRow } = await supabase.from('researchers_owner').select('id').maybeSingle();
  if (!ownerRow?.id) {
    return NextResponse.redirect(new URL(backTo('/manage-profile?import=no_profile'), url.origin));
  }

  const { data, error } = await supabase.rpc('update_researcher_publications_orcid', {
    p_researcher_id: ownerRow.id,
    p_publications: items,
  });

  const params = new URLSearchParams({
    import: error ? 'orcid_rpc' : 'orcid_ok',
    n: String((data as { inserted?: number; updated?: number })?.inserted ?? 0),
  });
  return NextResponse.redirect(
    new URL(`/${routing.defaultLocale}/manage-profile?${params.toString()}`, url.origin),
  );
}
