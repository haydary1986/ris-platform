'use client';

import { useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { BookOpen, GraduationCap, FlaskConical, Globe, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FormRow } from '@/components/manage/form-row';
import { ErrorsDialog, type FieldErrorEntry } from '@/components/manage/errors-dialog';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { researchSchema, type ResearchInput } from '@/lib/manage/schemas';
import { saveResearch } from '@/lib/manage/actions';

const ACADEMIC_PLATFORMS = [
  {
    key: 'scopus',
    label: 'Scopus',
    placeholder: 'https://www.scopus.com/authid/detail.uri?authorId=...',
    icon: FlaskConical,
  },
  {
    key: 'google_scholar',
    label: 'Google Scholar',
    placeholder: 'https://scholar.google.com/citations?user=...',
    icon: GraduationCap,
  },
  {
    key: 'orcid',
    label: 'ORCID',
    placeholder: 'https://orcid.org/0000-0000-0000-0000',
    icon: BookOpen,
  },
  {
    key: 'researchgate',
    label: 'ResearchGate',
    placeholder: 'https://www.researchgate.net/profile/...',
    icon: Globe,
  },
  {
    key: 'academia',
    label: 'Academia.edu',
    placeholder: 'https://www.academia.edu/...',
    icon: GraduationCap,
  },
  {
    key: 'webofscience',
    label: 'Web of Science',
    placeholder: 'https://www.webofscience.com/wos/author/record/...',
    icon: FlaskConical,
  },
] as const;

const SOCIAL_PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/...', icon: Globe },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/...', icon: Globe },
  { key: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/...', icon: Globe },
] as const;

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

      <SocialsEditor
        value={form.watch('socials_block') ?? ''}
        onChange={(v) => form.setValue('socials_block', v, { shouldDirty: true })}
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !form.formState.isDirty}>
          {isPending ? tManage('saving') : tManage('save')}
        </Button>
      </div>

      <ErrorsDialog open={errorsOpen} onOpenChange={setErrorsOpen} errors={errors} />
    </form>
  );
}

function parseSocialsBlock(block: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const [platform, ...urlParts] = line.split('|');
    const url = urlParts.join('|').trim();
    if (platform && url) map[platform.trim()] = url;
  }
  return map;
}

function socialsMapToBlock(map: Record<string, string>): string {
  return Object.entries(map)
    .filter(([, url]) => url.trim())
    .map(([platform, url]) => `${platform}|${url.trim()}`)
    .join('\n');
}

function SocialsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = useMemo(() => parseSocialsBlock(value), [value]);
  const [customLinks, setCustomLinks] = useState<Array<{ platform: string; url: string }>>(() => {
    const knownKeys = new Set<string>([
      ...ACADEMIC_PLATFORMS.map((p) => p.key),
      ...SOCIAL_PLATFORMS.map((p) => p.key),
    ]);
    return Object.entries(parsed)
      .filter(([k]) => !knownKeys.has(k))
      .map(([platform, url]) => ({ platform, url }));
  });

  function updatePlatform(key: string, url: string) {
    const next = { ...parseSocialsBlock(value), [key]: url };
    if (!url.trim()) delete next[key];
    onChange(socialsMapToBlock(next));
  }

  function addCustomLink() {
    setCustomLinks((prev) => [...prev, { platform: '', url: '' }]);
  }

  function updateCustom(index: number, field: 'platform' | 'url', val: string) {
    const updated = [...customLinks];
    updated[index] = { ...updated[index]!, [field]: val };
    setCustomLinks(updated);
    syncCustom(updated);
  }

  function removeCustom(index: number) {
    const updated = customLinks.filter((_, i) => i !== index);
    setCustomLinks(updated);
    syncCustom(updated);
  }

  function syncCustom(links: Array<{ platform: string; url: string }>) {
    const knownKeys = new Set<string>([
      ...ACADEMIC_PLATFORMS.map((p) => p.key),
      ...SOCIAL_PLATFORMS.map((p) => p.key),
    ]);
    const next = { ...parseSocialsBlock(value) };
    for (const k of Object.keys(next)) {
      if (!knownKeys.has(k)) delete next[k];
    }
    for (const l of links) {
      if (l.platform.trim() && l.url.trim()) {
        next[l.platform.trim()] = l.url.trim();
      }
    }
    onChange(socialsMapToBlock(next));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Research Platforms / المنصات البحثية</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACADEMIC_PLATFORMS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.key} className="flex items-center gap-2">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  placeholder={p.placeholder}
                  defaultValue={parsed[p.key] ?? ''}
                  onBlur={(e) => updatePlatform(p.key, e.target.value)}
                  className="text-xs"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">Social Media / التواصل الاجتماعي</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_PLATFORMS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.key} className="flex items-center gap-2">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  placeholder={p.placeholder}
                  defaultValue={parsed[p.key] ?? ''}
                  onBlur={(e) => updatePlatform(p.key, e.target.value)}
                  className="text-xs"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Other Links / روابط أخرى</Label>
          <Button type="button" variant="outline" size="sm" onClick={addCustomLink}>
            <Plus className="size-3" />
            Add
          </Button>
        </div>
        {customLinks.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Platform name"
              value={link.platform}
              onChange={(e) => updateCustom(i, 'platform', e.target.value)}
              className="w-32 text-xs"
            />
            <Input
              placeholder="https://..."
              value={link.url}
              onChange={(e) => updateCustom(i, 'url', e.target.value)}
              className="flex-1 text-xs"
            />
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeCustom(i)}>
              <X className="size-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
