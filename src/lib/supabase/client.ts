import { createBrowserClient } from '@supabase/ssr';

let cachedUrl: string | null = null;
let cachedKey: string | null = null;

function getEnv(key: string): string {
  const val = typeof process !== 'undefined' ? process.env[key] : undefined;
  return val ?? '';
}

export function createClient() {
  const url = cachedUrl || getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = cachedKey || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (!url || !key) {
    throw new Error(
      `Missing Supabase config. URL=${url ? 'set' : 'missing'} KEY=${key ? 'set' : 'missing'}`,
    );
  }

  return createBrowserClient(url, key);
}

export async function initSupabaseConfig(): Promise<void> {
  if (cachedUrl && cachedKey) return;
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (url && key) {
    cachedUrl = url;
    cachedKey = key;
    return;
  }
  try {
    const res = await fetch('/api/config');
    const data = (await res.json()) as { supabaseUrl: string; supabaseAnonKey: string };
    cachedUrl = data.supabaseUrl;
    cachedKey = data.supabaseAnonKey;
  } catch {
    // Config not available
  }
}
