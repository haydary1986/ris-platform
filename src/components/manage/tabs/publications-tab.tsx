'use client';

import { useRef, useState, useTransition } from 'react';
import { Plus, Trash, Download, FileUp, Upload, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { savePublication, deletePublication } from '@/lib/manage/actions';
import type { PublicationRow, BilingualLookup, PublicationSourceLookup } from '@/lib/profile/types';
import type { PublicationInput } from '@/lib/manage/schemas';

interface PublicationsTabProps {
  publications: PublicationRow[];
  publicationTypes: BilingualLookup[];
  publicationSources: PublicationSourceLookup[];
}

const NULL_VALUE = '__none__';

export function PublicationsTab({
  publications,
  publicationTypes,
  publicationSources,
}: PublicationsTabProps) {
  const t = useTranslations('manage.publications');
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-wide">{t('list_title')}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <ScholarQuickImport />
            <Button type="button" size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              {t('add_manual')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {publications.length === 0 ? (
            <p className="text-muted-foreground text-sm">—</p>
          ) : (
            <ul className="divide-y">
              {publications.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium leading-snug">{p.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {p.journal_name ?? p.conference_name ?? p.publisher ?? '—'}
                      {p.publication_year ? ` · ${p.publication_year}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {p.is_scopus ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Scopus
                        </Badge>
                      ) : null}
                      {p.is_wos ? (
                        <Badge variant="secondary" className="text-[10px]">
                          WoS
                        </Badge>
                      ) : null}
                      {p.is_open_access ? (
                        <Badge variant="outline" className="text-[10px]">
                          OA
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <DeletePubButton id={p.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddPublicationDialog
        open={open}
        onOpenChange={setOpen}
        publicationTypes={publicationTypes}
        publicationSources={publicationSources}
      />
    </div>
  );
}

function DeletePubButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const r = await deletePublication(id);
          if (!r.ok) toast.error('Delete failed');
        })
      }
    >
      <Trash className="text-destructive size-3.5" />
    </Button>
  );
}

interface AddPublicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicationTypes: BilingualLookup[];
  publicationSources: PublicationSourceLookup[];
}

function AddPublicationDialog({
  open,
  onOpenChange,
  publicationTypes,
  publicationSources,
}: AddPublicationDialogProps) {
  const t = useTranslations('manage.publications.form');
  const tManage = useTranslations('manage');
  const [values, setValues] = useState<Partial<PublicationInput>>({
    title: '',
    abstract: '',
    publication_type_id: null,
    source_id: null,
    journal_name: '',
    conference_name: '',
    publisher: '',
    publication_year: null,
    doi: '',
    url: '',
    is_open_access: false,
    authors: '',
  });
  const [isPending, startTransition] = useTransition();

  function set(key: keyof PublicationInput, value: unknown) {
    setValues((p) => ({ ...p, [key]: value }));
  }

  function submit() {
    startTransition(async () => {
      const r = await savePublication(values as PublicationInput);
      if (!r.ok) {
        toast.error(r.error ?? Object.values(r.fieldErrors ?? {}).join('; '));
        return;
      }
      toast.success(tManage('saved'));
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder={t('title')}
            value={values.title ?? ''}
            onChange={(e) => set('title', e.target.value)}
          />
          <Textarea
            placeholder={t('abstract')}
            rows={3}
            value={values.abstract ?? ''}
            onChange={(e) => set('abstract', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={values.publication_type_id ?? NULL_VALUE}
              onValueChange={(v) => set('publication_type_id', v === NULL_VALUE ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_VALUE}>{t('type')}</SelectItem>
                {publicationTypes.map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>
                    {pt.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={values.source_id ?? NULL_VALUE}
              onValueChange={(v) => set('source_id', v === NULL_VALUE ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('source')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_VALUE}>{t('source')}</SelectItem>
                {publicationSources.map((ps) => (
                  <SelectItem key={ps.id} value={ps.id}>
                    {ps.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder={t('journal_name')}
              value={values.journal_name ?? ''}
              onChange={(e) => set('journal_name', e.target.value)}
            />
            <Input
              placeholder={t('conference_name')}
              value={values.conference_name ?? ''}
              onChange={(e) => set('conference_name', e.target.value)}
            />
          </div>
          <Input
            placeholder={t('publisher')}
            value={values.publisher ?? ''}
            onChange={(e) => set('publisher', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder={t('year')}
              value={values.publication_year ?? ''}
              onChange={(e) =>
                set('publication_year', e.target.value === '' ? null : Number(e.target.value))
              }
            />
            <Input
              placeholder={t('doi')}
              value={values.doi ?? ''}
              onChange={(e) => set('doi', e.target.value)}
            />
          </div>
          <Input
            type="url"
            placeholder="URL"
            value={values.url ?? ''}
            onChange={(e) => set('url', e.target.value)}
          />
          <Textarea
            placeholder={t('authors')}
            rows={4}
            value={values.authors ?? ''}
            onChange={(e) => set('authors', e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Switch
              id="is_open_access"
              checked={Boolean(values.is_open_access)}
              onCheckedChange={(v) => set('is_open_access', v)}
            />
            <Label htmlFor="is_open_access" className="text-sm">
              {t('is_open_access')}
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tManage('discard')}
          </Button>
          <Button onClick={submit} disabled={isPending || !values.title}>
            {isPending ? tManage('saving') : tManage('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Google Scholar Quick Import (one-click upload) ---
function ScholarQuickImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [showGuide, setShowGuide] = useState(false);

  function uploadFile(file: File) {
    startTransition(async () => {
      const text = await file.text();
      const res = await fetch('/api/import/scholar', { method: 'POST', body: text });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        inserted?: number;
        updated?: number;
        skipped?: number;
        error?: string;
      };
      if (res.ok && json.ok) {
        toast.success(`Imported ${json.inserted ?? 0} new, ${json.updated ?? 0} updated`);
      } else {
        toast.error(json.error ?? 'Import failed');
      }
    });
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".mrhenc"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadFile(f);
          e.target.value = '';
        }}
      />

      <Button type="button" variant="outline" size="sm" onClick={() => setShowGuide(true)}>
        <Upload className="size-4" />
        Google Scholar
      </Button>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from Google Scholar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="font-semibold">Step 1: Get your publications</p>
              <ol className="list-decimal ms-5 space-y-2 text-muted-foreground">
                <li>
                  Open your{' '}
                  <a
                    href="https://scholar.google.com/citations"
                    target="_blank"
                    rel="noopener"
                    className="text-primary underline"
                  >
                    Google Scholar profile
                  </a>
                </li>
                <li>Click &quot;Show more&quot; until all publications are visible</li>
                <li>
                  Open browser DevTools (<kbd className="rounded bg-muted px-1 text-xs">F12</kbd> →
                  Console)
                </li>
                <li>Paste this script and press Enter:</li>
              </ol>
              <div className="relative">
                <pre className="bg-muted rounded-md p-3 text-[10px] max-h-32 overflow-auto">
                  <code>{`(function(){var p=[];document.querySelectorAll('#gsc_a_b .gsc_a_tr').forEach(function(r){var t=r.querySelector('.gsc_a_at');var g=r.querySelectorAll('.gs_gray');var y=r.querySelector('.gsc_a_h');var c=r.querySelector('.gsc_a_ac');if(!t)return;p.push({title:t.textContent.trim(),authors:g[0]?g[0].textContent.split(',').map(s=>s.trim()):[],journal_name:g[1]?g[1].textContent.trim():null,publication_year:y&&/^\\d{4}$/.test(y.textContent)?+y.textContent:null,scholar_citations:c&&/^\\d+$/.test(c.textContent.trim())?+c.textContent:0})});var d={version:1,provider:'scholar',scraped_at:new Date().toISOString(),publications:p};var e=btoa(unescape(encodeURIComponent(JSON.stringify(d))));var b=new Blob([e]);var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='scholar-'+Date.now()+'.mrhenc';a.click();console.log('Exported',p.length,'publications')})();`}</code>
                </pre>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="absolute top-1 end-1"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `(function(){var p=[];document.querySelectorAll('#gsc_a_b .gsc_a_tr').forEach(function(r){var t=r.querySelector('.gsc_a_at');var g=r.querySelectorAll('.gs_gray');var y=r.querySelector('.gsc_a_h');var c=r.querySelector('.gsc_a_ac');if(!t)return;p.push({title:t.textContent.trim(),authors:g[0]?g[0].textContent.split(',').map(s=>s.trim()):[],journal_name:g[1]?g[1].textContent.trim():null,publication_year:y&&/^\\\\d{4}$/.test(y.textContent)?+y.textContent:null,scholar_citations:c&&/^\\\\d+$/.test(c.textContent.trim())?+c.textContent:0})});var d={version:1,provider:'scholar',scraped_at:new Date().toISOString(),publications:p};var e=btoa(unescape(encodeURIComponent(JSON.stringify(d))));var b=new Blob([e]);var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='scholar-'+Date.now()+'.mrhenc';a.click();console.log('Exported',p.length,'publications')})();`,
                    );
                    toast.success('Copied!');
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-muted-foreground">
                A <code>.mrhenc</code> file will download automatically.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="font-semibold">Step 2: Upload the file</p>
              <Button
                type="button"
                onClick={() => {
                  setShowGuide(false);
                  fileRef.current?.click();
                }}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileUp className="size-4" />
                )}
                Upload .mrhenc file
              </Button>
            </div>

            <div className="text-center">
              <a
                href="/extension/ris-scholar-importer.zip"
                download
                className="text-primary text-xs inline-flex items-center gap-1 hover:underline"
              >
                <Download className="size-3" />
                Or download Chrome extension (alternative)
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
