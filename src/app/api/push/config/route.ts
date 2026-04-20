// Client needs the VAPID public key to create a subscription. Only the
// public half is exposed here; the private key stays server-side.

import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/integrations/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const publicKey = await getVapidPublicKey();
  return NextResponse.json(
    { publicKey: publicKey || null, enabled: Boolean(publicKey) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
