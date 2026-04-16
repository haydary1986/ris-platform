'use client';

import { useState, useTransition } from 'react';
import { Pencil, Plus, Trash } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  saveWork,
  deleteWork,
  saveCert,
  deleteCert,
  saveAward,
  deleteAward,
  saveProject,
  deleteProject,
} from '@/lib/manage/actions';
import type {
  AwardRow,
  CertificationRow,
  ProjectRow,
  WorkExperienceRow,
} from '@/lib/profile/types';

interface ExperienceTabProps {
  work: WorkExperienceRow[];
  certifications: CertificationRow[];
  awards: AwardRow[];
  projects: ProjectRow[];
}

export function ExperienceTab({ work, certifications, awards, projects }: ExperienceTabProps) {
  const t = useTranslations('manage.experience');

  return (
    <div className="space-y-8">
      <RowSection
        title={t('section_work')}
        items={work}
        renderItem={(w) => (
          <>
            <p className="text-sm font-medium">{w.position_en}</p>
            <p className="text-muted-foreground text-xs">
              {w.organization_en} · {w.start_date ?? '?'} –{' '}
              {w.is_current ? t('current') : (w.end_date ?? '…')}
            </p>
          </>
        )}
        renderForm={(item, close) => <WorkForm initial={item} onClose={close} />}
        onDelete={async (id) => {
          const r = await deleteWork(id);
          return r.ok;
        }}
        emptyValues={() => ({
          position_en: '',
          position_ar: '',
          organization_en: '',
          organization_ar: '',
          location: '',
          start_date: '',
          end_date: '',
          is_current: false,
          description_en: '',
          description_ar: '',
        })}
      />

      <RowSection
        title={t('section_certs')}
        items={certifications}
        renderItem={(c) => (
          <>
            <p className="text-sm font-medium">{c.name_en}</p>
            <p className="text-muted-foreground text-xs">
              {c.issuing_org ?? ''} {c.issue_date ? `· ${c.issue_date}` : ''}
            </p>
          </>
        )}
        renderForm={(item, close) => <CertForm initial={item} onClose={close} />}
        onDelete={async (id) => (await deleteCert(id)).ok}
        emptyValues={() => ({
          name_en: '',
          name_ar: '',
          issuing_org: '',
          issue_date: '',
          expiry_date: '',
          credential_id: '',
          credential_url: '',
        })}
      />

      <RowSection
        title={t('section_awards')}
        items={awards}
        renderItem={(a) => (
          <>
            <p className="text-sm font-medium">{a.name_en}</p>
            <p className="text-muted-foreground text-xs">
              {a.issuer_en ?? ''} {a.year ? `· ${a.year}` : ''}
            </p>
          </>
        )}
        renderForm={(item, close) => <AwardForm initial={item} onClose={close} />}
        onDelete={async (id) => (await deleteAward(id)).ok}
        emptyValues={() => ({
          name_en: '',
          name_ar: '',
          issuer_en: '',
          issuer_ar: '',
          year: null,
          description_en: '',
          description_ar: '',
        })}
      />

      <RowSection
        title={t('section_projects')}
        items={projects}
        renderItem={(p) => (
          <>
            <p className="text-sm font-medium">{p.title_en}</p>
            <p className="text-muted-foreground text-xs">
              {p.status} {p.funding_agency ? `· ${p.funding_agency}` : ''}
            </p>
          </>
        )}
        renderForm={(item, close) => <ProjectForm initial={item} onClose={close} />}
        onDelete={async (id) => (await deleteProject(id)).ok}
        emptyValues={() => ({
          title_en: '',
          title_ar: '',
          description_en: '',
          description_ar: '',
          role: '',
          funding_agency: '',
          status: 'active',
          start_date: '',
          end_date: '',
          url: '',
        })}
      />
    </div>
  );
}

// ---------- Generic row section ----------
interface RowSectionProps<T extends { id: string }, F> {
  title: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  renderForm: (item: F, close: () => void) => React.ReactNode;
  onDelete: (id: string) => Promise<boolean>;
  emptyValues: () => F;
}

function RowSection<T extends { id: string }, F>({
  title,
  items,
  renderItem,
  renderForm,
  onDelete,
  emptyValues,
}: RowSectionProps<T, F>) {
  const t = useTranslations('manage.experience');
  const [editing, setEditing] = useState<F | null>(null);
  const [open, setOpen] = useState(false);

  function openAdd() {
    setEditing(emptyValues());
    setOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item as unknown as F);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm uppercase tracking-wide">{title}</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={openAdd}>
          <Plus className="size-4" />
          {t('add_row')}
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">—</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">{renderItem(item)}</div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <DeleteButton id={item.id} onDelete={onDelete} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(v) : close())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {editing ? renderForm(editing, close) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DeleteButton({
  id,
  onDelete,
}: {
  id: string;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const ok = await onDelete(id);
          if (!ok) toast.error('Delete failed');
        })
      }
    >
      <Trash className="text-destructive size-3.5" />
    </Button>
  );
}

// ---------- Per-entity forms (compact) ----------

interface FormProps<T> {
  initial: T;
  onClose: () => void;
}

function WorkForm({ initial, onClose }: FormProps<Record<string, unknown>>) {
  const tManage = useTranslations('manage');
  const [values, setValues] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function update(k: string, v: unknown) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  function submit() {
    startTransition(async () => {
      const r = await saveWork(values as Parameters<typeof saveWork>[0]);
      if (!r.ok) {
        toast.error(r.error ?? Object.values(r.fieldErrors ?? {}).join('; '));
        return;
      }
      toast.success(tManage('saved'));
      onClose();
    });
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Position (English)"
        value={String(values.position_en ?? '')}
        onChange={(e) => update('position_en', e.target.value)}
      />
      <Input
        placeholder="Position (Arabic)"
        dir="rtl"
        value={String(values.position_ar ?? '')}
        onChange={(e) => update('position_ar', e.target.value)}
      />
      <Input
        placeholder="Organization (English)"
        value={String(values.organization_en ?? '')}
        onChange={(e) => update('organization_en', e.target.value)}
      />
      <Input
        placeholder="Organization (Arabic)"
        dir="rtl"
        value={String(values.organization_ar ?? '')}
        onChange={(e) => update('organization_ar', e.target.value)}
      />
      <Input
        placeholder="Location"
        value={String(values.location ?? '')}
        onChange={(e) => update('location', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={String(values.start_date ?? '')}
          onChange={(e) => update('start_date', e.target.value)}
        />
        <Input
          type="date"
          value={String(values.end_date ?? '')}
          onChange={(e) => update('end_date', e.target.value)}
          disabled={Boolean(values.is_current)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={Boolean(values.is_current)}
          onCheckedChange={(v) => update('is_current', v)}
          id="is_current"
        />
        <Label htmlFor="is_current" className="text-sm">
          {tManage('experience.current')}
        </Label>
      </div>
      <Textarea
        placeholder="Description (English)"
        rows={2}
        value={String(values.description_en ?? '')}
        onChange={(e) => update('description_en', e.target.value)}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {tManage('discard')}
        </Button>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? tManage('saving') : tManage('save')}
        </Button>
      </DialogFooter>
    </div>
  );
}

function CertForm({ initial, onClose }: FormProps<Record<string, unknown>>) {
  const tManage = useTranslations('manage');
  const [values, setValues] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const update = (k: string, v: unknown) => setValues((p) => ({ ...p, [k]: v }));
  const submit = () =>
    startTransition(async () => {
      const r = await saveCert(values as Parameters<typeof saveCert>[0]);
      if (!r.ok) {
        toast.error(r.error ?? Object.values(r.fieldErrors ?? {}).join('; '));
        return;
      }
      toast.success(tManage('saved'));
      onClose();
    });

  return (
    <div className="space-y-3">
      <Input
        placeholder="Name (English)"
        value={String(values.name_en ?? '')}
        onChange={(e) => update('name_en', e.target.value)}
      />
      <Input
        placeholder="Name (Arabic)"
        dir="rtl"
        value={String(values.name_ar ?? '')}
        onChange={(e) => update('name_ar', e.target.value)}
      />
      <Input
        placeholder="Issuing organization"
        value={String(values.issuing_org ?? '')}
        onChange={(e) => update('issuing_org', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={String(values.issue_date ?? '')}
          onChange={(e) => update('issue_date', e.target.value)}
        />
        <Input
          type="date"
          value={String(values.expiry_date ?? '')}
          onChange={(e) => update('expiry_date', e.target.value)}
        />
      </div>
      <Input
        placeholder="Credential URL"
        type="url"
        value={String(values.credential_url ?? '')}
        onChange={(e) => update('credential_url', e.target.value)}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {tManage('discard')}
        </Button>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? tManage('saving') : tManage('save')}
        </Button>
      </DialogFooter>
    </div>
  );
}

function AwardForm({ initial, onClose }: FormProps<Record<string, unknown>>) {
  const tManage = useTranslations('manage');
  const [values, setValues] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const update = (k: string, v: unknown) => setValues((p) => ({ ...p, [k]: v }));
  const submit = () =>
    startTransition(async () => {
      const r = await saveAward(values as Parameters<typeof saveAward>[0]);
      if (!r.ok) {
        toast.error(r.error ?? Object.values(r.fieldErrors ?? {}).join('; '));
        return;
      }
      toast.success(tManage('saved'));
      onClose();
    });

  return (
    <div className="space-y-3">
      <Input
        placeholder="Name (English)"
        value={String(values.name_en ?? '')}
        onChange={(e) => update('name_en', e.target.value)}
      />
      <Input
        placeholder="Name (Arabic)"
        dir="rtl"
        value={String(values.name_ar ?? '')}
        onChange={(e) => update('name_ar', e.target.value)}
      />
      <Input
        placeholder="Issuer"
        value={String(values.issuer_en ?? '')}
        onChange={(e) => update('issuer_en', e.target.value)}
      />
      <Input
        type="number"
        placeholder="Year"
        value={String(values.year ?? '')}
        onChange={(e) => update('year', e.target.value === '' ? null : Number(e.target.value))}
      />
      <Textarea
        placeholder="Description"
        rows={2}
        value={String(values.description_en ?? '')}
        onChange={(e) => update('description_en', e.target.value)}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {tManage('discard')}
        </Button>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? tManage('saving') : tManage('save')}
        </Button>
      </DialogFooter>
    </div>
  );
}

function ProjectForm({ initial, onClose }: FormProps<Record<string, unknown>>) {
  const tManage = useTranslations('manage');
  const [values, setValues] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const update = (k: string, v: unknown) => setValues((p) => ({ ...p, [k]: v }));
  const submit = () =>
    startTransition(async () => {
      const r = await saveProject(values as Parameters<typeof saveProject>[0]);
      if (!r.ok) {
        toast.error(r.error ?? Object.values(r.fieldErrors ?? {}).join('; '));
        return;
      }
      toast.success(tManage('saved'));
      onClose();
    });

  return (
    <div className="space-y-3">
      <Input
        placeholder="Title (English)"
        value={String(values.title_en ?? '')}
        onChange={(e) => update('title_en', e.target.value)}
      />
      <Input
        placeholder="Title (Arabic)"
        dir="rtl"
        value={String(values.title_ar ?? '')}
        onChange={(e) => update('title_ar', e.target.value)}
      />
      <Textarea
        placeholder="Description"
        rows={2}
        value={String(values.description_en ?? '')}
        onChange={(e) => update('description_en', e.target.value)}
      />
      <Input
        placeholder="Role"
        value={String(values.role ?? '')}
        onChange={(e) => update('role', e.target.value)}
      />
      <Input
        placeholder="Funding agency"
        value={String(values.funding_agency ?? '')}
        onChange={(e) => update('funding_agency', e.target.value)}
      />
      <select
        className="h-8 w-full rounded-md border bg-transparent px-2 text-sm"
        value={String(values.status ?? 'active')}
        onChange={(e) => update('status', e.target.value)}
      >
        <option value="active">active</option>
        <option value="completed">completed</option>
        <option value="planned">planned</option>
        <option value="paused">paused</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={String(values.start_date ?? '')}
          onChange={(e) => update('start_date', e.target.value)}
        />
        <Input
          type="date"
          value={String(values.end_date ?? '')}
          onChange={(e) => update('end_date', e.target.value)}
        />
      </div>
      <Input
        type="url"
        placeholder="URL"
        value={String(values.url ?? '')}
        onChange={(e) => update('url', e.target.value)}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {tManage('discard')}
        </Button>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? tManage('saving') : tManage('save')}
        </Button>
      </DialogFooter>
    </div>
  );
}
