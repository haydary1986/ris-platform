'use client';

import { useRef, useState, useTransition } from 'react';
import { Copy, Download, FileUp, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ScholarSectionProps {
  consoleScript: string;
}

export function ScholarSection({ consoleScript }: ScholarSectionProps) {
  const t = useTranslations('import.scholar');
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function copyScript() {
    void navigator.clipboard.writeText(consoleScript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function uploadFile(file: File) {
    startTransition(async () => {
      const text = await file.text();
      const res = await fetch('/api/import/scholar', { method: 'POST', body: text });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        inserted?: number;
        updated?: number;
        skipped?: number;
      };
      if (!res.ok || !json.ok) {
        toast.error(
          json.error === 'unsupported_version'
            ? t('upload.error_version')
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
          <h3 className="text-sm font-semibold">{t('extension.title')}</h3>
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
          <h3 className="text-sm font-semibold">{t('console.title')}</h3>
          <p className="text-muted-foreground text-sm">{t('console.intro')}</p>
          <ol className="text-muted-foreground ms-5 list-decimal space-y-1 text-sm">
            <li>{t('console.step_1')}</li>
            <li>{t('console.step_2')}</li>
            <li>{t('console.step_3')}</li>
            <li>{t('console.step_4')}</li>
          </ol>
          <pre className="bg-muted max-h-48 overflow-auto rounded-md p-3 text-xs">
            <code>{consoleScript}</code>
          </pre>
          <Button type="button" variant="outline" size="sm" onClick={copyScript}>
            <Copy className="size-4" />
            {copied ? t('console.copied') : t('console.copy_script')}
          </Button>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('upload.title')}</h3>
          <input
            ref={fileRef}
            type="file"
            accept=".mrhenc,application/octet-stream"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={isPending}
            onClick={() => fileRef.current?.click()}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileUp className="size-4" />
            )}
            {isPending ? t('upload.uploading') : t('upload.drop')}
          </Button>
        </section>
      </CardContent>
    </Card>
  );
}
