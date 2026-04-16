'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormRow } from '@/components/manage/form-row';
import { ErrorsDialog, type FieldErrorEntry } from '@/components/manage/errors-dialog';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { researchSchema, type ResearchInput } from '@/lib/manage/schemas';
import { saveResearch } from '@/lib/manage/actions';

interface ResearchTabProps {
  initial: ResearchInput;
}

export function ResearchTab({ initial }: ResearchTabProps) {
  const t = useTranslations('manage.research');
  const tManage = useTranslations('manage');
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrorEntry[]>([]);
  const [errorsOpen, setErrorsOpen] = useState(false);

  const form = useForm<ResearchInput>({
    resolver: zodResolver(researchSchema),
    defaultValues: initial,
  });

  useUnsavedChanges(form.formState.isDirty, tManage('unsaved_warning'));

  function onSubmit(values: ResearchInput) {
    startTransition(async () => {
      const res = await saveResearch(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          setErrors(Object.entries(res.fieldErrors).map(([f, m]) => ({ field: f, message: m })));
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
      <div className="grid gap-4 md:grid-cols-2">
        <FormRow label={t('bio_en')} htmlFor="bio_en">
          <Textarea id="bio_en" rows={6} {...form.register('bio_en')} />
        </FormRow>
        <FormRow label={t('bio_ar')} htmlFor="bio_ar">
          <Textarea id="bio_ar" dir="rtl" rows={6} {...form.register('bio_ar')} />
        </FormRow>

        <FormRow label={t('interests_en')} htmlFor="field_of_interest_en">
          <Textarea id="field_of_interest_en" rows={3} {...form.register('field_of_interest_en')} />
        </FormRow>
        <FormRow label={t('interests_ar')} htmlFor="field_of_interest_ar">
          <Textarea
            id="field_of_interest_ar"
            dir="rtl"
            rows={3}
            {...form.register('field_of_interest_ar')}
          />
        </FormRow>
      </div>

      <FormRow
        label={t('website')}
        htmlFor="website"
        error={form.formState.errors.website?.message}
      >
        <Input
          id="website"
          type="url"
          placeholder="https://example.com"
          {...form.register('website')}
        />
      </FormRow>

      <FormRow label={t('skills')} htmlFor="skills_csv" hint={t('skills_hint')}>
        <Textarea id="skills_csv" rows={2} {...form.register('skills_csv')} />
      </FormRow>

      <FormRow label={t('languages')} htmlFor="languages_csv" hint={t('languages_hint')}>
        <Input
          id="languages_csv"
          placeholder="en:C1, ar:native"
          {...form.register('languages_csv')}
        />
      </FormRow>

      <FormRow label={t('socials')} htmlFor="socials_block" hint={t('socials_hint')}>
        <Textarea
          id="socials_block"
          rows={4}
          placeholder="orcid|https://orcid.org/..."
          {...form.register('socials_block')}
        />
      </FormRow>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !form.formState.isDirty}>
          {isPending ? tManage('saving') : tManage('save')}
        </Button>
      </div>

      <ErrorsDialog open={errorsOpen} onOpenChange={setErrorsOpen} errors={errors} />
    </form>
  );
}
