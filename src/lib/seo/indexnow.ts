/**
 * Task 85 — IndexNow client.
 *
 * Setup:
 *   1. Generate a 32-char hex key.
 *   2. Save it as INDEXNOW_KEY env var.
 *   3. Create public/{key}.txt containing only the key (verifies ownership).
 *
 * Call submitToIndexNow([url1, url2, ...]) whenever a researcher profile or
 * publication is created/updated. Bing, Yandex, Seznam, and others share the
 * same endpoint — Google ignores it but it doesn't hurt.
 */

import { siteUrl } from './site';

const ENDPOINT = 'https://api.indexnow.org/indexnow';

export async function submitToIndexNow(urls: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || urls.length === 0) return;

  const host = new URL(siteUrl()).host;

  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${siteUrl()}/${key}.txt`,
        urlList: urls,
      }),
      cache: 'no-store',
    });
  } catch {
    // IndexNow is best-effort; never block the caller on failure.
  }
}
