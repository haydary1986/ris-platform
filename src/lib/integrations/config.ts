import { createAdminClient } from '@/lib/supabase/admin';

const cache: Record<string, { value: string; ts: number }> = {};
const TTL = 60_000; // 1 minute cache

export async function getIntegrationValue(key: string): Promise<string> {
  const now = Date.now();
  const cached = cache[key];
  if (cached && now - cached.ts < TTL) return cached.value;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    const raw = data?.value;
    const value = typeof raw === 'string' ? raw.replace(/^"|"$/g, '') : '';
    cache[key] = { value, ts: now };
    return value;
  } catch {
    return '';
  }
}

// Invalidate the in-memory cache for a specific key (or all keys). Called
// from updateSetting so toggles take effect without waiting for the 60s
// TTL to expire.
export function invalidateIntegrationCache(key?: string): void {
  if (key) {
    delete cache[key];
  } else {
    for (const k of Object.keys(cache)) delete cache[k];
  }
}

export async function getOrcidClientId(): Promise<string> {
  return process.env.ORCID_CLIENT_ID || (await getIntegrationValue('integration.orcid.client_id'));
}

export async function getOrcidClientSecret(): Promise<string> {
  return (
    process.env.ORCID_CLIENT_SECRET ||
    (await getIntegrationValue('integration.orcid.client_secret'))
  );
}

export async function getScopusApiKey(): Promise<string> {
  return process.env.SCOPUS_API_KEY || (await getIntegrationValue('integration.scopus.api_key'));
}

export async function getDeepseekApiKey(): Promise<string> {
  return (
    process.env.DEEPSEEK_API_KEY || (await getIntegrationValue('integration.deepseek.api_key'))
  );
}

// Admin toggle from /admin/integrations. Default is disabled until the
// admin explicitly flips the switch on, so just dropping a key doesn't
// expose the assistant while it's still being verified.
export async function isDeepseekEnabled(): Promise<boolean> {
  const raw = await getIntegrationValue('integration.deepseek.enabled');
  return raw.toLowerCase() === 'true';
}

// Web Push VAPID keys. Public key is safe to expose to clients; private
// key must stay server-side.
export async function getVapidPublicKey(): Promise<string> {
  return (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    process.env.VAPID_PUBLIC_KEY ||
    (await getIntegrationValue('integration.push.vapid_public'))
  );
}

export async function getVapidPrivateKey(): Promise<string> {
  return (
    process.env.VAPID_PRIVATE_KEY || (await getIntegrationValue('integration.push.vapid_private'))
  );
}

export async function getVapidSubject(): Promise<string> {
  const raw = await getIntegrationValue('integration.push.vapid_subject');
  return raw || process.env.VAPID_SUBJECT || 'mailto:admin@uoturath.edu.iq';
}
