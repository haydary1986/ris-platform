'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FormRow } from '@/components/manage/form-row';
import { ErrorsDialog, type FieldErrorEntry } from '@/components/manage/errors-dialog';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { contactSchema, type ContactInput } from '@/lib/manage/schemas';
import { saveContact } from '@/lib/manage/actions';

interface ContactTabProps {
  initial: ContactInput;
}

export function ContactTab({ initial }: ContactTabProps) {
  const t = useTranslations('manage.contact');
  const tManage = useTranslations('manage');
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrorEntry[]>([]);
  const [errorsOpen, setErrorsOpen] = useState(false);

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: initial,
  });

  useUnsavedChanges(form.formState.isDirty, tManage('unsaved_warning'));

  const showPublic = form.watch('show_public_contact');

  function onSubmit(values: ContactInput) {
    startTransition(async () => {
      const res = await saveContact(values);
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
      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <Label htmlFor="show_public_contact" className="text-sm">
            {t('show_public')}
          </Label>
          <Switch
            id="show_public_contact"
            checked={showPublic}
            onCheckedChange={(v) => form.setValue('show_public_contact', v, { shouldDirty: true })}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('private_section')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FormRow label={t('email')} htmlFor="private_email">
              <Input id="private_email" type="email" {...form.register('private_email')} />
            </FormRow>
            <FormRow label={t('phone')} htmlFor="private_phone">
              <Input id="private_phone" type="tel" {...form.register('private_phone')} />
            </FormRow>
            <FormRow label={t('office_location')} htmlFor="private_office_location">
              <Input id="private_office_location" {...form.register('private_office_location')} />
            </FormRow>
            <FormRow label={t('office_hours')} htmlFor="private_office_hours">
              <Input id="private_office_hours" {...form.register('private_office_hours')} />
            </FormRow>
            <FormRow label={t('mailing_address')} htmlFor="private_mailing_address">
              <Textarea
                id="private_mailing_address"
                rows={2}
                {...form.register('private_mailing_address')}
              />
            </FormRow>
          </CardContent>
        </Card>

        <Card data-disabled={!showPublic} className="data-[disabled=true]:opacity-60">
          <CardHeader>
            <CardTitle className="text-sm">{t('public_section')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FormRow label={t('email')} htmlFor="public_email">
              <Input id="public_email" type="email" {...form.register('public_email')} />
            </FormRow>
            <FormRow label={t('phone')} htmlFor="public_phone">
              <Input id="public_phone" type="tel" {...form.register('public_phone')} />
            </FormRow>
            <FormRow label={t('office_location')} htmlFor="public_office_location">
              <Input id="public_office_location" {...form.register('public_office_location')} />
            </FormRow>
            <FormRow label={t('office_hours')} htmlFor="public_office_hours">
              <Input id="public_office_hours" {...form.register('public_office_hours')} />
            </FormRow>
            <FormRow label={t('mailing_address')} htmlFor="public_mailing_address">
              <Textarea
                id="public_mailing_address"
                rows={2}
                {...form.register('public_mailing_address')}
              />
            </FormRow>
          </CardContent>
        </Card>
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
