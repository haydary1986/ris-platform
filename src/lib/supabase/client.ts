import { createBrowserClient } from '@supabase/ssr';

declare global {
  interface Window {
    __SUPABASE_CONFIG__?: { url: string; anonKey: string };
  }
}

export function createClient() {
  const config = typeof window !== 'undefined' ? window.__SUPABASE_CONFIG__ : undefined;

  const url = config?.url || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = config?.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    throw new Error('Missing Supabase config');
  }

  return createBrowserClient(url, key);
}
