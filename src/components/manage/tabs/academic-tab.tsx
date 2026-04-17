'use client';

import { useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FormRow } from '@/components/manage/form-row';
import { ErrorsDialog, type FieldErrorEntry } from '@/components/manage/errors-dialog';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { academicSchema, type AcademicInput } from '@/lib/manage/schemas';
import { saveAcademic } from '@/lib/manage/actions';
import type { BilingualLookup, DepartmentLookup } from '@/lib/profile/types';

interface AcademicTabProps {
  initial: AcademicInput;
  workplaceTypes: BilingualLookup[];
  colleges: BilingualLookup[];
  departments: DepartmentLookup[];
  universityCenters: BilingualLookup[];
  locale: 'en' | 'ar';
}

const NULL_VALUE = '__none__';

function lookupName(items: BilingualLookup[], id: string | null | undefined, locale: 'en' | 'ar') {
  if (!id) return '—';
  const item = items.find((i) => i.id === id);
  return item ? (locale === 'ar' ? item.name_ar : item.name_en) : '—';
}

export function AcademicTab({
  initial,
  workplaceTypes,
  colleges,
  departments,
  universityCenters,
  locale,
}: AcademicTabProps) {
  const t = useTranslations('manage.academic');
  const tManage = useTranslations('manage');
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrorEntry[]>([]);
  const [errorsOpen, setErrorsOpen] = useState(false);

  const form = useForm<AcademicInput>({
    resolver: zodResolver(academicSchema),
    defaultValues: initial,
  });

  useUnsavedChanges(form.formState.isDirty, tManage('unsaved_warning'));

  const collegeId = form.watch('college_id');
  const visibleDepartments = useMemo(() => {
    if (!collegeId) return departments;
    return departments.filter((d) => d.college_id === collegeId);
  }, [collegeId, departments]);

  function setSelect(key: keyof AcademicInput, value: string) {
    form.setValue(key, value === NULL_VALUE ? null : value, { shouldDirty: true });
    if (key === 'college_id') {
      const dept = form.getValues('department_id');
      if (
        dept &&
        !departments.some(
          (d) => d.id === dept && d.college_id === (value === NULL_VALUE ? null : value),
        )
      ) {
        form.setValue('department_id', null, { shouldDirty: true });
      }
    }
  }

  function onSubmit(values: AcademicInput) {
    startTransition(async () => {
      const res = await saveAcademic(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          setErrors(
            Object.entries(res.fieldErrors).map(([field, message]) => ({ field, message })),
          );
          setErrorsOpen(true);
        } else {
          toast.error(res.error ?? 'Save failed');
        }
        return;
      }
      toast.success(tManage('saved'));
      form.reset(values);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow label={t('workplace_type')} htmlFor="workplace_type_id">
          <Select
            value={form.watch('workplace_type_id') ?? NULL_VALUE}
            onValueChange={(v) => setSelect('workplace_type_id', v ?? NULL_VALUE)}
          >
            <SelectTrigger id="workplace_type_id">
              <SelectValue placeholder="—">
                {lookupName(workplaceTypes, form.watch('workplace_type_id'), locale)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NULL_VALUE}>—</SelectItem>
              {workplaceTypes.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {locale === 'ar' ? w.name_ar : w.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow label={t('university_center')} htmlFor="university_center_id">
          <Select
            value={form.watch('university_center_id') ?? NULL_VALUE}
            onValueChange={(v) => setSelect('university_center_id', v ?? NULL_VALUE)}
          >
            <SelectTrigger id="university_center_id">
              <SelectValue placeholder="—">
                {lookupName(universityCenters, form.watch('university_center_id'), locale)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NULL_VALUE}>—</SelectItem>
              {universityCenters.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {locale === 'ar' ? u.name_ar : u.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow label={t('college')} htmlFor="college_id">
          <Select
            value={form.watch('college_id') ?? NULL_VALUE}
            onValueChange={(v) => setSelect('college_id', v ?? NULL_VALUE)}
          >
            <SelectTrigger id="college_id">
              <SelectValue placeholder="—">
                {lookupName(colleges, form.watch('college_id'), locale)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NULL_VALUE}>—</SelectItem>
              {colleges.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {locale === 'ar' ? c.name_ar : c.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow label={t('department')} htmlFor="department_id">
          <Select
            value={form.watch('department_id') ?? NULL_VALUE}
            onValueChange={(v) => setSelect('department_id', v ?? NULL_VALUE)}
            disabled={visibleDepartments.length === 0}
          >
            <SelectTrigger id="department_id">
              <SelectValue placeholder="—">
                {lookupName(departments, form.watch('department_id'), locale)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NULL_VALUE}>—</SelectItem>
              {visibleDepartments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {locale === 'ar' ? d.name_ar : d.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow label={t('degree_en')} htmlFor="degree_en">
          <Input id="degree_en" {...form.register('degree_en')} />
        </FormRow>
        <FormRow label={t('degree_ar')} htmlFor="degree_ar">
          <Input id="degree_ar" dir="rtl" {...form.register('degree_ar')} />
        </FormRow>
        <FormRow label={t('degree_minor_en')} htmlFor="degree_minor_en">
          <Input id="degree_minor_en" {...form.register('degree_minor_en')} />
        </FormRow>
        <FormRow label={t('degree_minor_ar')} htmlFor="degree_minor_ar">
          <Input id="degree_minor_ar" dir="rtl" {...form.register('degree_minor_ar')} />
        </FormRow>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !form.formState.isDirty}>
          {isPending ? tManage('saving') : tManage('save')}
        </Button>
      </div>

      <ErrorsDialog open={errorsOpen} onOpenChange={setErrorsOpen} errors={errors} />
    </form>
  );
}
