'use client';

import { useState, useTransition } from 'react';
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
import { ImageUpload } from '@/components/manage/image-upload';
import { FormRow } from '@/components/manage/form-row';
import { ErrorsDialog, type FieldErrorEntry } from '@/components/manage/errors-dialog';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { basicSchema, type BasicInput } from '@/lib/manage/schemas';
import { saveBasic } from '@/lib/manage/actions';
import type { BilingualLookup, AcademicTitleLookup } from '@/lib/profile/types';

interface BasicTabProps {
  initial: BasicInput & { full_name_initial: string };
  genders: BilingualLookup[];
  academicTitles: AcademicTitleLookup[];
  locale: 'en' | 'ar';
}

const NULL_VALUE = '__none__';

function lookupName(items: BilingualLookup[], id: string | null | undefined, locale: 'en' | 'ar') {
  if (!id) return '—';
  const item = items.find((i) => i.id === id);
  return item ? (locale === 'ar' ? item.name_ar : item.name_en) : '—';
}

export function BasicTab({ initial, genders, academicTitles, locale }: BasicTabProps) {
  const t = useTranslations('manage.basic');
  const tManage = useTranslations('manage');
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrorEntry[]>([]);
  const [errorsOpen, setErrorsOpen] = useState(false);

  const form = useForm<BasicInput>({
    resolver: zodResolver(basicSchema),
    defaultValues: initial,
  });

  useUnsavedChanges(form.formState.isDirty, tManage('unsaved_warning'));

  function onSubmit(values: BasicInput) {
    startTransition(async () => {
      const res = await saveBasic(values);
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

  const profileImage = form.watch('profile_image');

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FormRow label={t('profile_image')} htmlFor="profile_image">
        <ImageUpload
          current={profileImage ?? null}
          fallback={(initial.full_name_initial ?? '?').slice(0, 1).toUpperCase()}
          onChange={(url) =>
            form.setValue('profile_image', url ?? undefined, { shouldDirty: true })
          }
        />
      </FormRow>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow
          label={t('full_name_en')}
          htmlFor="full_name_en"
          error={form.formState.errors.full_name_en?.message}
        >
          <Input id="full_name_en" {...form.register('full_name_en')} />
        </FormRow>
        <FormRow
          label={t('full_name_ar')}
          htmlFor="full_name_ar"
          error={form.formState.errors.full_name_ar?.message}
        >
          <Input id="full_name_ar" dir="rtl" {...form.register('full_name_ar')} />
        </FormRow>

        <FormRow label={t('employee_id')} htmlFor="employee_id">
          <Input id="employee_id" {...form.register('employee_id')} />
        </FormRow>
        <FormRow label={t('birthdate')} htmlFor="birthdate">
          <Input id="birthdate" type="date" {...form.register('birthdate')} />
        </FormRow>

        <FormRow label={t('gender')} htmlFor="gender_id">
          <Select
            value={form.watch('gender_id') ?? NULL_VALUE}
            onValueChange={(v) =>
              form.setValue('gender_id', v === NULL_VALUE ? null : v, { shouldDirty: true })
            }
          >
            <SelectTrigger id="gender_id">
              <SelectValue placeholder="—">
                {lookupName(genders, form.watch('gender_id'), locale)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NULL_VALUE}>—</SelectItem>
              {genders.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {locale === 'ar' ? g.name_ar : g.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow label={t('academic_title')} htmlFor="academic_title_id">
          <Select
            value={form.watch('academic_title_id') ?? NULL_VALUE}
            onValueChange={(v) =>
              form.setValue('academic_title_id', v === NULL_VALUE ? null : v, { shouldDirty: true })
            }
          >
            <SelectTrigger id="academic_title_id">
              <SelectValue placeholder="—">
                {lookupName(academicTitles, form.watch('academic_title_id'), locale)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NULL_VALUE}>—</SelectItem>
              {academicTitles.map((at) => (
                <SelectItem key={at.id} value={at.id}>
                  {locale === 'ar' ? at.name_ar : at.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
