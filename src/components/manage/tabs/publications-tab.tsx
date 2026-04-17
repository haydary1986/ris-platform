'use client';

import { useRef, useState, useTransition } from 'react';
import {
  Plus,
  Trash,
  Download,
  FileUp,
  Upload,
  Loader2,
  FolderOpen,
  FolderArchive,
  ArrowRight,
  Globe,
  Copy,
  ToggleRight,
  Puzzle,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
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

// --- Google Scholar One-Click Import ---
function ScholarQuickImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [showGuide, setShowGuide] = useState(false);
  const [showExtGuide, setShowExtGuide] = useState(false);
  const [extStep, setExtStep] = useState(0);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const bookmarkletCode = `javascript:void(function(){if(!location.host.includes('scholar.google.com')){alert('Open your Google Scholar profile first!');return;}var p=[];document.querySelectorAll('#gsc_a_b .gsc_a_tr').forEach(function(r){var t=r.querySelector('.gsc_a_at');var g=r.querySelectorAll('.gs_gray');var y=r.querySelector('.gsc_a_h');var c=r.querySelector('.gsc_a_ac');if(!t)return;p.push({title:t.textContent.trim(),authors:(g[0]?g[0].textContent:'').split(',').map(function(s){return s.trim()}).filter(Boolean),journal_name:g[1]?g[1].textContent.trim():null,publication_year:y&&/^[0-9]{4}$/.test(y.textContent)?Number(y.textContent):null,scholar_citations:c&&/^[0-9]+$/.test(c.textContent.trim())?Number(c.textContent):0})});if(p.length===0){alert('No publications found. Make sure you are on your Scholar profile and publications are visible.');return;}var d={version:1,provider:'scholar',publications:p};var e=btoa(unescape(encodeURIComponent(JSON.stringify(d))));window.location.href='${siteUrl}/en/import-scholar#'+e;}())`;

  function uploadFile(file: File) {
    startTransition(async () => {
      const text = await file.text();
      const res = await fetch('/api/import/scholar', { method: 'POST', body: text });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        inserted?: number;
        updated?: number;
        error?: string;
      };
      if (res.ok && json.ok) {
        toast.success(`Imported ${json.inserted ?? 0} new, ${json.updated ?? 0} updated`);
      } else {
        toast.error(json.error ?? 'Import failed');
      }
    });
  }

  const extSteps = [
    {
      icon: <Download className="size-6" />,
      titleEn: 'Download the extension',
      titleAr: 'حمّل الإضافة',
      descEn: 'Click the button below to download the extension file.',
      descAr: 'اضغط الزر أدناه لتحميل ملف الإضافة.',
      visual: (
        <a
          href="/extension/ris-scholar-importer.zip"
          download
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90"
          onClick={() => setTimeout(() => setExtStep(1), 500)}
        >
          <Download className="size-4" />
          Download .zip
        </a>
      ),
    },
    {
      icon: <FolderOpen className="size-6" />,
      titleEn: 'Extract the ZIP file',
      titleAr: 'فك ضغط الملف',
      descEn: 'Right-click the downloaded file and choose "Extract All" or double-click it.',
      descAr: 'انقر بزر الماوس الأيمن على الملف واختر "استخراج الكل" أو انقر عليه مرتين.',
      visual: (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          <div className="flex size-10 items-center justify-center rounded bg-yellow-500/20">
            <FolderArchive className="size-5 text-yellow-600" />
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
          <div className="flex size-10 items-center justify-center rounded bg-blue-500/20">
            <FolderOpen className="size-5 text-blue-600" />
          </div>
        </div>
      ),
    },
    {
      icon: <Globe className="size-6" />,
      titleEn: 'Open Extensions page',
      titleAr: 'افتح صفحة الإضافات',
      descEn: "Type this address in Chrome's address bar:",
      descAr: 'اكتب هذا العنوان في شريط العنوان:',
      visual: (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText('chrome://extensions');
            toast.success('Copied!');
          }}
          className="group flex w-full items-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-muted/50 px-4 py-3 text-start transition hover:border-primary/60 hover:bg-muted"
        >
          <div className="flex-1 font-mono text-sm font-bold text-primary">chrome://extensions</div>
          <Copy className="size-4 text-muted-foreground transition group-hover:text-primary" />
        </button>
      ),
    },
    {
      icon: <ToggleRight className="size-6" />,
      titleEn: 'Enable Developer Mode',
      titleAr: 'فعّل وضع المطور',
      descEn: 'Find the toggle in the top-right corner and turn it ON.',
      descAr: 'ابحث عن زر التبديل في الزاوية العلوية وقم بتشغيله.',
      visual: (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
          <span className="text-sm font-medium">Developer mode</span>
          <div className="flex h-6 w-11 items-center rounded-full bg-primary px-0.5">
            <div className="size-5 rounded-full bg-white shadow-sm translate-x-5" />
          </div>
        </div>
      ),
    },
    {
      icon: <Puzzle className="size-6" />,
      titleEn: 'Load unpacked extension',
      titleAr: 'تحميل الإضافة',
      descEn: 'Click "Load unpacked" and select the extracted folder.',
      descAr: 'اضغط "Load unpacked" واختر المجلد المستخرج.',
      visual: (
        <div className="space-y-2">
          <div className="flex gap-2">
            {['Load unpacked', 'Pack extension', 'Update'].map((btn) => (
              <span
                key={btn}
                className={`rounded border px-3 py-1.5 text-xs font-medium ${btn === 'Load unpacked' ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30' : 'border-muted-foreground/30 text-muted-foreground'}`}
              >
                {btn}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight className="size-3" />
            Select the extracted folder
          </div>
        </div>
      ),
    },
    {
      icon: <CheckCircle className="size-6 text-green-500" />,
      titleEn: 'Done! Open Google Scholar',
      titleAr: 'تم! افتح Google Scholar',
      descEn:
        "Go to your Scholar profile — you'll see the import button. Click it and you're done!",
      descAr: 'اذهب إلى ملفك في Scholar — ستجد زر الاستيراد. اضغط عليه وانتهى!',
      visual: (
        <a
          href="https://scholar.google.com/citations"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-green-700"
        >
          <ExternalLink className="size-4" />
          Open Google Scholar
        </a>
      ),
    },
  ];

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

      {/* Main import method chooser */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from Google Scholar</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 text-sm">
            {/* Method 1: One-click bookmarklet */}
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-bold">
                  Easy
                </span>
                <p className="font-semibold">One-click import (recommended)</p>
              </div>
              <ol className="list-decimal ms-5 space-y-2 text-muted-foreground">
                <li>
                  Drag this button to your <strong>bookmarks bar</strong>:
                </li>
              </ol>
              <div className="flex justify-center py-2">
                <a
                  href={bookmarkletCode}
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info('Drag this button to your bookmarks bar!');
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 cursor-grab active:cursor-grabbing"
                  draggable="true"
                >
                  <Upload className="size-4" />
                  Import to RIS
                </a>
              </div>
              <ol className="list-decimal ms-5 space-y-2 text-muted-foreground" start={2}>
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
                <li>
                  Click <strong>&quot;Show more&quot;</strong> until all publications visible
                </li>
                <li>
                  Click the <strong>&quot;Import to RIS&quot;</strong> bookmark
                </li>
              </ol>
            </div>

            {/* Method 2: Chrome Extension */}
            <button
              type="button"
              onClick={() => {
                setShowGuide(false);
                setExtStep(0);
                setShowExtGuide(true);
              }}
              className="flex w-full items-center gap-3 rounded-lg border bg-muted/30 p-4 text-start transition hover:bg-muted/60"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Puzzle className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Chrome Extension</p>
                <p className="text-xs text-muted-foreground">
                  Install once, import with one click from Scholar
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>

            {/* Method 3: File upload */}
            <button
              type="button"
              onClick={() => {
                setShowGuide(false);
                fileRef.current?.click();
              }}
              disabled={isPending}
              className="flex w-full items-center gap-3 rounded-lg border bg-muted/30 p-4 text-start transition hover:bg-muted/60 disabled:opacity-50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                {isPending ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : (
                  <FileUp className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold">Upload .mrhenc file</p>
                <p className="text-xs text-muted-foreground">Exported file from the extension</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extension installation guide — step by step */}
      <Dialog
        open={showExtGuide}
        onOpenChange={(v) => {
          setShowExtGuide(v);
          if (!v) setExtStep(0);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Puzzle className="size-5" />
              Install Extension
              <span className="ms-auto text-xs font-normal text-muted-foreground">
                {extStep + 1} / {extSteps.length}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Progress bar */}
          <div className="flex gap-1">
            {extSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= extStep ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>

          {/* Current step */}
          {(() => {
            const step = extSteps[extStep]!;
            return (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {step.icon}
                  </div>
                  <div>
                    <p className="font-semibold">{step.titleEn}</p>
                    <p className="text-xs text-muted-foreground">{step.titleAr}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{step.descEn}</p>
                <p className="text-sm text-muted-foreground" dir="rtl">
                  {step.descAr}
                </p>

                <div className="flex justify-center py-2">{step.visual}</div>
              </div>
            );
          })()}

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExtStep((s) => Math.max(0, s - 1))}
              disabled={extStep === 0}
              className="flex-1"
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>
            {extStep < extSteps.length - 1 ? (
              <Button size="sm" onClick={() => setExtStep((s) => s + 1)} className="flex-1">
                Next
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowExtGuide(false)} className="flex-1">
                <CheckCircle className="size-4" />
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
