'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

type Status = 'loading' | 'success' | 'error' | 'no_data';

export default function ImportScholarPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [counts, setCounts] = useState({ inserted: 0, updated: 0 });
  const ran = useRef(false);
  const statusRef = useRef<Status>('loading');
  const messageRef = useRef('');

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const hash = window.location.hash.slice(1);
    if (!hash) {
      statusRef.current = 'no_data';
      messageRef.current =
        'No publication data found. Please use the bookmarklet from your Google Scholar profile.';
      queueMicrotask(() => {
        setStatus(statusRef.current);
        setMessage(messageRef.current);
      });
      return;
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(hash);
    } catch {
      decoded = hash;
    }

    let json: unknown;
    try {
      json = JSON.parse(atob(decoded));
    } catch {
      try {
        json = JSON.parse(decoded);
      } catch {
        queueMicrotask(() => {
          setStatus('error');
          setMessage('Failed to decode publication data.');
        });
        return;
      }
    }

    fetch('/api/import/scholar-auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(json),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          inserted?: number;
          updated?: number;
          error?: string;
        };
        if (res.ok && data.ok) {
          setCounts({ inserted: data.inserted ?? 0, updated: data.updated ?? 0 });
          setStatus('success');
        } else if (res.status === 401) {
          window.location.href = '/en/sign-in';
        } else {
          setStatus('error');
          setMessage(data.error ?? 'Import failed');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error. Please try again.');
      });
  }, []);

  return (
    <main className="container mx-auto flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      {status === 'loading' && (
        <>
          <Loader2 className="size-12 animate-spin text-primary" />
          <h1 className="text-xl font-semibold">Importing publications...</h1>
          <p className="text-muted-foreground text-sm">
            جاري استيراد المنشورات من Google Scholar...
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="size-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold">Import Complete!</h1>
          <p className="text-muted-foreground text-sm">تم الاستيراد بنجاح</p>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{counts.inserted}</p>
              <p className="text-muted-foreground">New / جديد</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{counts.updated}</p>
              <p className="text-muted-foreground">Updated / محدّث</p>
            </div>
          </div>
          <Link href="/manage-profile">
            <Button>
              <BookOpen className="size-4" />
              Go to Profile / الذهاب للملف الشخصي
            </Button>
          </Link>
        </>
      )}

      {(status === 'error' || status === 'no_data') && (
        <>
          <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <XCircle className="size-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold">
            {status === 'no_data' ? 'No Data' : 'Import Failed'}
          </h1>
          <p className="text-muted-foreground text-sm max-w-md">{message}</p>
          <Link href="/manage-profile">
            <Button variant="outline">Back to Profile / العودة للملف الشخصي</Button>
          </Link>
        </>
      )}
    </main>
  );
}
