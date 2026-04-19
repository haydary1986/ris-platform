'use client';

import { useRef, useState, useTransition } from 'react';
import {
  AlertTriangle,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileUp,
  Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ScholarSectionProps {
  consoleScript: string;
}

type UploadResponse = {
  ok?: boolean;
  error?: string;
  inserted?: number;
  updated?: number;
  skipped?: number;
  count?: number;
  warnings?: string[];
};

export function ScholarSection({ consoleScript }: ScholarSectionProps) {
  const t = useTranslations('import.scholar');
  const csvFileRef = useRef<HTMLInputElement>(null);
  const mrhencFileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [scholarId, setScholarId] = useState('');

  function copyScript() {
    void navigator.clipboard.writeText(consoleScript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function openScholarProfile() {
    const trimmed = scholarId.trim();
    if (!trimmed) {
      window.open('https://scholar.google.com/', '_blank', 'noopener,noreferrer');
      return;
    }
    const url = `https://scholar.google.com/citations?user=${encodeURIComponent(trimmed)}&hl=en`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function upload(endpoint: '/api/import/scholar' | '/api/import/scholar-csv', file: File) {
    startTransition(async () => {
      const text = await file.text();
      const res = await fetch(endpoint, { method: 'POST', body: text });
      const json = (await res.json().catch(() => ({}))) as UploadResponse;
      if (!res.ok || !json.ok) {
        toast.error(
          json.error === 'unsupported_version'
            ? t('upload.error_version')
            : json.error === 'empty'
              ? t('upload.error_empty')
              : t('upload.error_format'),
        );
        return;
      }
      toast.success(
        t('upload.ok', {
          inserted: json.inserted ?? 0,
          updated: json.updated ?? 0,
          skipped: json.skipped ?? 0,
        }),
      );
      if (json.warnings && json.warnings.length > 0) {
        toast.warning(
          t('upload.warnings', {
            count: json.warnings.length,
            first: json.warnings[0] ?? '',
          }),
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground text-sm">{t('intro')}</p>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('open_profile.title')}</h3>
          <p className="text-muted-foreground text-xs">{t('open_profile.intro')}</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              inputMode="text"
              value={scholarId}
              onChange={(e) => setScholarId(e.target.value)}
              placeholder={t('open_profile.id_placeholder')}
              className="border-input bg-background min-w-0 flex-1 rounded-md border px-3 py-1.5 text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={openScholarProfile}>
              <ExternalLink className="size-4" />
              {t('open_profile.open')}
            </Button>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet
              className="text-emerald-600 dark:text-emerald-400 size-5"
              aria-hidden
            />
            <h3 className="text-sm font-semibold">{t('csv.title')}</h3>
            <span className="ms-auto rounded-full bg-emerald-600/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {t('csv.recommended_badge')}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">{t('csv.intro')}</p>
          <ol className="text-muted-foreground ms-5 list-decimal space-y-1 text-sm">
            <li>{t('csv.step_1')}</li>
            <li>{t('csv.step_2')}</li>
            <li>{t('csv.step_3')}</li>
            <li>{t('csv.step_4')}</li>
          </ol>
          <input
            ref={csvFileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload('/api/import/scholar-csv', f);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={isPending}
            onClick={() => csvFileRef.current?.click()}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            {isPending ? t('upload.uploading') : t('csv.upload_button')}
          </Button>
        </section>

        <details className="group space-y-3 rounded-lg border p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold select-none">
            <span className="inline-flex items-center gap-2">
              <span className="text-muted-foreground transition-transform group-open:rotate-90">
                ›
              </span>
              {t('advanced.title')}
            </span>
          </summary>

          <div className="mt-4 space-y-6">
            <div
              role="note"
              className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="space-y-1">
                <p className="font-medium">{t('bookmarklet_warning.title')}</p>
                <p className="text-xs opacity-90">{t('bookmarklet_warning.body')}</p>
              </div>
            </div>

            <section className="space-y-2">
              <h4 className="text-sm font-semibold">{t('extension.title')}</h4>
              <ol className="text-muted-foreground ms-5 list-decimal space-y-1 text-sm">
                <li>{t('extension.step_1')}</li>
                <li>{t('extension.step_2')}</li>
                <li>{t('extension.step_3')}</li>
                <li>{t('extension.step_4')}</li>
              </ol>
              <a
                href="/extension/ris-scholar-importer.zip"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Download className="size-4" />
                {t('extension.download_zip')}
              </a>
            </section>

            <section className="space-y-2">
              <h4 className="text-sm font-semibold">{t('console.title')}</h4>
              <p className="text-muted-foreground text-sm">{t('console.intro')}</p>
              <ol className="text-muted-foreground ms-5 list-decimal space-y-1 text-sm">
                <li>{t('console.step_1')}</li>
                <li>{t('console.step_2')}</li>
                <li>
                  {t('console.step_3')}
                  <code className="bg-muted mx-1 rounded px-1 py-0.5 text-xs">allow pasting</code>
                  {t('console.step_3_suffix')}
                </li>
                <li>{t('console.step_4')}</li>
                <li>{t('console.step_5')}</li>
              </ol>
              <pre className="bg-muted max-h-48 overflow-auto rounded-md p-3 text-xs" dir="ltr">
                <code>{consoleScript}</code>
              </pre>
              <Button type="button" variant="outline" size="sm" onClick={copyScript}>
                <Copy className="size-4" />
                {copied ? t('console.copied') : t('console.copy_script')}
              </Button>
            </section>

            <section className="space-y-2">
              <h4 className="text-sm font-semibold">{t('upload.title')}</h4>
              <input
                ref={mrhencFileRef}
                type="file"
                accept=".mrhenc,application/octet-stream"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload('/api/import/scholar', f);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => mrhencFileRef.current?.click()}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileUp className="size-4" />
                )}
                {isPending ? t('upload.uploading') : t('upload.drop')}
              </Button>
            </section>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
