'use client';

// Bell icon + dropdown showing recent broadcasts targeted at this user.
// Unread count = broadcasts created after the last time the user opened
// the dropdown (tracked in localStorage). No "read" column in the DB
// because that would require an extra write per user per notification —
// overkill for a directory with a handful of broadcasts per month.

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

interface HistoryItem {
  id: string;
  title: string;
  body: string;
  url: string | null;
  target_locale: string;
  created_at: string;
}

const LAST_SEEN_KEY = 'ris.notifications.last_seen_at';

export function NotificationBell() {
  const t = useTranslations('notifications');
  const locale = useLocale() as 'ar' | 'en';
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    // Deferred so the sync setState-in-effect rule is satisfied; the
    // tiny paint delay is imperceptible.
    const seenTimer = setTimeout(() => {
      if (!cancelled) {
        setLastSeen(Number(window.localStorage.getItem(LAST_SEEN_KEY) || 0));
      }
    }, 0);

    fetch(`/api/push/history?locale=${locale}`, { cache: 'no-store' })
      .then((r) => r.json() as Promise<{ items: HistoryItem[] }>)
      .then((d) => {
        if (!cancelled) setItems(d.items ?? []);
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      cancelled = true;
      clearTimeout(seenTimer);
    };
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  function toggle() {
    if (!open) {
      // Mark-as-seen when opening. New broadcasts after this moment will
      // produce a badge again.
      const now = Date.now();
      window.localStorage.setItem(LAST_SEEN_KEY, String(now));
      setLastSeen(now);
    }
    setOpen((v) => !v);
  }

  const unread = items.filter((i) => new Date(i.created_at).getTime() > lastSeen).length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={t('open')}
        className="hover:bg-accent relative flex size-9 items-center justify-center rounded-full"
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -end-0.5 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute end-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-background shadow-2xl z-50"
          role="menu"
        >
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">{t('title')}</p>
            <p className="text-muted-foreground text-[11px]">{t('subtitle')}</p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-muted-foreground px-4 py-8 text-center text-xs">{t('empty')}</p>
            ) : (
              <ul className="divide-y">
                {items.map((n) => {
                  const unreadDot = new Date(n.created_at).getTime() > lastSeen;
                  const content = (
                    <div className="flex items-start gap-2 px-4 py-3 hover:bg-accent">
                      <span
                        className={`mt-1.5 block size-1.5 shrink-0 rounded-full ${
                          unreadDot ? 'bg-rose-500' : 'bg-transparent'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-muted-foreground line-clamp-2 text-xs">{n.body}</p>
                        <p className="text-muted-foreground mt-1 text-[10px] tabular-nums">
                          {new Intl.DateTimeFormat(locale, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(n.created_at))}
                        </p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.url ? (
                        <a
                          href={n.url}
                          target={n.url.startsWith('/') ? '_self' : '_blank'}
                          rel="noopener"
                          onClick={() => setOpen(false)}
                        >
                          {content}
                        </a>
                      ) : (
                        content
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
