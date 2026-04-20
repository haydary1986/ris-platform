'use client';

// Signed-in users see this banner at the bottom of the page exactly once
// per browser (or until they accept). We lead with a clear explanation
// BEFORE the browser's native prompt — this "double opt-in" pattern is
// the only thing that meaningfully improves acceptance rates, and it's
// required for compliance with best-practice anti-spam guidance.
//
// Flow:
//   1. Probe /api/push/config — get VAPID public key
//   2. Probe Notification.permission + this-user subscription status
//   3. If default (not asked yet) and not dismissed → show banner
//   4. On "Enable" click → trigger browser's native prompt
//   5. If granted → subscribe + POST to /api/push/subscribe
//   6. Store state so we don't re-prompt

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Sparkles, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'ris.push.prompt.dismissed_at';
const SUPPRESS_DAYS = 14;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export function PushPrompt() {
  const t = useTranslations('push');
  const locale = useLocale() as 'ar' | 'en';
  const [shouldShow, setShouldShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (typeof window === 'undefined') return;
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      if (!('Notification' in window)) return;

      // Already granted (existing subscription) or already denied → do nothing.
      if (Notification.permission !== 'default') return;

      // Respect recent dismissal.
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (dismissedAt && Date.now() - dismissedAt < SUPPRESS_DAYS * 864e5) return;

      // Fetch public key — no point prompting if the server isn't wired up.
      try {
        const res = await fetch('/api/push/config', { cache: 'no-store' });
        const { publicKey: pk } = (await res.json()) as { publicKey: string | null };
        if (!pk || cancelled) return;
        setPublicKey(pk);
        setShouldShow(true);
      } catch {
        /* silently skip */
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (!publicKey || pending) return;
    setPending(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        if (permission === 'denied') toast.error(t('denied'));
        setShouldShow(false);
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // pushManager.subscribe types want BufferSource with a plain
        // ArrayBuffer; casting via a Buffer copy keeps TS happy without
        // a lib bump.
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });

      const p256dh = arrayBufferToBase64(sub.getKey('p256dh'));
      const auth = arrayBufferToBase64(sub.getKey('auth'));

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh,
          auth,
          locale,
        }),
      });
      if (!res.ok) throw new Error('subscribe_failed');

      toast.success(t('enabled'));
      setShouldShow(false);
    } catch {
      toast.error(t('enable_failed'));
    } finally {
      setPending(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShouldShow(false);
  }

  if (!shouldShow) return null;

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-40 mx-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border bg-background p-4 shadow-2xl sm:inset-x-auto sm:right-4 rtl:sm:right-auto rtl:sm:left-4"
      role="dialog"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="from-primary/20 to-primary/5 flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br">
          <Sparkles className="text-primary size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{t('banner_title')}</p>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t('dismiss')}
              className="hover:bg-accent -me-1 -mt-1 rounded p-1"
            >
              <X className="size-4 opacity-60" />
            </button>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">{t('banner_body')}</p>
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={enable}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
              {t('enable')}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
              <BellOff className="size-4" />
              {t('later')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
