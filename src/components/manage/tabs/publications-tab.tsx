'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash } from 'lucide-react';
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
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled title={t('import_phase10')}>
              {t('import_scholar')}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled title={t('import_phase10')}>
              {t('import_orcid')}
            </Button>
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
