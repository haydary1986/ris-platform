'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  upsertCollege,
  deleteCollege,
  upsertDepartment,
  deleteDepartment,
} from '@/lib/admin/actions';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';

interface College {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
}

interface Department {
  id: string;
  college_id: string;
  name_en: string;
  name_ar: string;
  slug: string;
}

interface Translations {
  addCollege: string;
  editCollege: string;
  deleteCollege: string;
  addDepartment: string;
  editDepartment: string;
  deleteDepartment: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  save: string;
  cancel: string;
  departments: string;
  noDepartments: string;
  noColleges: string;
  confirmDelete: string;
  success: string;
  error: string;
}

type FormTarget = 'college' | 'department';

interface FormState {
  open: boolean;
  target: FormTarget;
  collegeId?: string;
  editing?: { id: string; name_en: string; name_ar: string; slug: string };
}

const INITIAL_FORM: FormState = { open: false, target: 'college' };

interface CollegesManagerClientProps {
  colleges: College[];
  departments: Department[];
  translations: Translations;
}

export function CollegesManagerClient({
  colleges,
  departments,
  translations: t,
}: CollegesManagerClientProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [slug, setSlug] = useState('');
  const [isPending, startTransition] = useTransition();

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openForm(target: FormTarget, collegeId?: string, editing?: College | Department) {
    setForm({
      open: true,
      target,
      collegeId,
      editing: editing
        ? { id: editing.id, name_en: editing.name_en, name_ar: editing.name_ar, slug: editing.slug }
        : undefined,
    });
    setNameEn(editing?.name_en ?? '');
    setNameAr(editing?.name_ar ?? '');
    setSlug(editing?.slug ?? '');
  }

  function closeForm() {
    setForm(INITIAL_FORM);
    setNameEn('');
    setNameAr('');
    setSlug('');
  }

  function handleSave() {
    startTransition(async () => {
      const result =
        form.target === 'college'
          ? await upsertCollege({
              id: form.editing?.id,
              name_en: nameEn,
              name_ar: nameAr,
              slug,
            })
          : await upsertDepartment({
              id: form.editing?.id,
              college_id: form.collegeId!,
              name_en: nameEn,
              name_ar: nameAr,
              slug,
            });

      if (result.ok) {
        toast.success(t.success);
        closeForm();
      } else {
        toast.error(result.error ?? t.error);
      }
    });
  }

  function handleDeleteCollege(id: string) {
    if (!confirm(t.confirmDelete)) return;
    startTransition(async () => {
      const result = await deleteCollege(id);
      if (result.ok) toast.success(t.success);
      else toast.error(result.error ?? t.error);
    });
  }

  function handleDeleteDepartment(id: string) {
    if (!confirm(t.confirmDelete)) return;
    startTransition(async () => {
      const result = await deleteDepartment(id);
      if (result.ok) toast.success(t.success);
      else toast.error(result.error ?? t.error);
    });
  }

  const dialogTitle =
    form.target === 'college'
      ? form.editing
        ? t.editCollege
        : t.addCollege
      : form.editing
        ? t.editDepartment
        : t.addDepartment;

  return (
    <div className="space-y-4">
      <Button onClick={() => openForm('college')} disabled={isPending}>
        <Plus data-icon="inline-start" />
        {t.addCollege}
      </Button>

      {colleges.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.noColleges}</p>
      ) : (
        <div className="space-y-2">
          {colleges.map((college) => {
            const isExpanded = expanded.has(college.id);
            const collegeDepts = departments.filter((d) => d.college_id === college.id);

            return (
              <div key={college.id} className="rounded-lg border">
                <div className="flex items-center gap-2 px-4 py-3">
                  <Button variant="ghost" size="icon-sm" onClick={() => toggleExpand(college.id)}>
                    {isExpanded ? <ChevronDown /> : <ChevronRight />}
                  </Button>
                  <span className="flex-1 font-medium">{college.name_en}</span>
                  <span className="text-muted-foreground text-sm">{college.name_ar}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openForm('college', undefined, college)}
                    disabled={isPending}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => handleDeleteCollege(college.id)}
                    disabled={isPending}
                  >
                    <Trash2 />
                  </Button>
                </div>

                {isExpanded && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-muted-foreground text-xs font-medium uppercase">
                        {t.departments}
                      </span>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => openForm('department', college.id)}
                        disabled={isPending}
                      >
                        <Plus data-icon="inline-start" />
                        {t.addDepartment}
                      </Button>
                    </div>
                    {collegeDepts.length === 0 ? (
                      <p className="text-muted-foreground text-xs">{t.noDepartments}</p>
                    ) : (
                      <div className="space-y-1">
                        {collegeDepts.map((dept) => (
                          <div
                            key={dept.id}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                          >
                            <span className="flex-1">{dept.name_en}</span>
                            <span className="text-muted-foreground text-xs">{dept.name_ar}</span>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => openForm('department', college.id, dept)}
                              disabled={isPending}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon-xs"
                              onClick={() => handleDeleteDepartment(dept.id)}
                              disabled={isPending}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={form.open} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="name-en">{t.nameEn}</Label>
              <Input
                id="name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="name-ar">{t.nameAr}</Label>
              <Input
                id="name-ar"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                dir="rtl"
                disabled={isPending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="slug">{t.slug}</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm} disabled={isPending}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={isPending || !nameEn.trim() || !slug.trim()}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
