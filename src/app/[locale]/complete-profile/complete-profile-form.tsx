'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { GraduationCap, Building2, User, CheckCircle } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { saveBasicOnboarding } from '@/lib/manage/actions';
import type { BilingualLookup, DepartmentLookup, AcademicTitleLookup } from '@/lib/profile/types';
import type { Locale } from '@/i18n/routing';

interface Props {
  initial: {
    full_name_en: string;
    full_name_ar: string;
    college_id: string;
    department_id: string;
    academic_title_id: string;
  };
  colleges: BilingualLookup[];
  departments: DepartmentLookup[];
  academicTitles: AcademicTitleLookup[];
  locale: Locale;
}

function lookupName(items: BilingualLookup[], id: string, locale: Locale) {
  if (!id) return '—';
  const item = items.find((i) => i.id === id);
  return item ? (locale === 'ar' ? item.name_ar : item.name_en) : '—';
}

export function CompleteProfileForm({
  initial,
  colleges,
  departments,
  academicTitles,
  locale,
}: Props) {
  const isAr = locale === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [fullNameEn, setFullNameEn] = useState(initial.full_name_en);
  const [fullNameAr, setFullNameAr] = useState(initial.full_name_ar);
  const [collegeId, setCollegeId] = useState(initial.college_id);
  const [departmentId, setDepartmentId] = useState(initial.department_id);
  const [titleId, setTitleId] = useState(initial.academic_title_id);

  const visibleDepts = useMemo(() => {
    if (!collegeId) return departments;
    return departments.filter((d) => d.college_id === collegeId);
  }, [collegeId, departments]);

  const isValid = fullNameEn.trim() && fullNameAr.trim() && collegeId && departmentId && titleId;

  function handleSubmit() {
    if (!isValid) return;
    startTransition(async () => {
      const res = await saveBasicOnboarding({
        full_name_en: fullNameEn.trim(),
        full_name_ar: fullNameAr.trim(),
        college_id: collegeId,
        department_id: departmentId,
        academic_title_id: titleId,
      });
      if (!res.ok) {
        toast.error(res.error ?? (isAr ? 'فشل الحفظ' : 'Save failed'));
        return;
      }
      toast.success(isAr ? 'تم حفظ الملف الشخصي' : 'Profile saved');
      router.push('/manage-profile');
    });
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
          <User className="size-7 text-primary" />
        </div>
        <CardTitle className="text-xl">
          {isAr ? 'أكمل ملفك الشخصي' : 'Complete Your Profile'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? 'يرجى ملء هذه المعلومات الأساسية للمتابعة'
            : 'Please fill in these required fields to continue'}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Names */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{isAr ? 'الاسم (إنجليزي) *' : 'Full Name (English) *'}</Label>
            <Input
              value={fullNameEn}
              onChange={(e) => setFullNameEn(e.target.value)}
              placeholder="Hayder Abdulameer"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{isAr ? 'الاسم (عربي) *' : 'Full Name (Arabic) *'}</Label>
            <Input
              value={fullNameAr}
              onChange={(e) => setFullNameAr(e.target.value)}
              dir="rtl"
              placeholder="حيدر عبدالأمير"
            />
          </div>
        </div>

        {/* Academic Title */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <GraduationCap className="size-4 text-muted-foreground" />
            {isAr ? 'اللقب العلمي *' : 'Academic Title *'}
          </Label>
          <Select value={titleId} onValueChange={(v) => setTitleId(v ?? '')}>
            <SelectTrigger>
              <span className="flex flex-1 text-start">
                {titleId
                  ? lookupName(academicTitles, titleId, locale)
                  : isAr
                    ? 'اختر...'
                    : 'Select...'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {academicTitles.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {locale === 'ar' ? t.name_ar : t.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* College */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Building2 className="size-4 text-muted-foreground" />
            {isAr ? 'الكلية *' : 'College *'}
          </Label>
          <Select
            value={collegeId}
            onValueChange={(v) => {
              setCollegeId(v ?? '');
              setDepartmentId('');
            }}
          >
            <SelectTrigger>
              <span className="flex flex-1 text-start">
                {collegeId
                  ? lookupName(colleges, collegeId, locale)
                  : isAr
                    ? 'اختر...'
                    : 'Select...'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {colleges.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {locale === 'ar' ? c.name_ar : c.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Department */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Building2 className="size-4 text-muted-foreground" />
            {isAr ? 'القسم *' : 'Department *'}
          </Label>
          <Select
            value={departmentId}
            onValueChange={(v) => setDepartmentId(v ?? '')}
            disabled={!collegeId}
          >
            <SelectTrigger>
              <span className="flex flex-1 text-start">
                {departmentId
                  ? lookupName(departments, departmentId, locale)
                  : isAr
                    ? 'اختر الكلية أولاً...'
                    : 'Select college first...'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {visibleDepts.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {locale === 'ar' ? d.name_ar : d.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isValid || isPending}
          className="w-full"
          size="lg"
        >
          {isPending ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <CheckCircle className="size-4" />
          )}
          {isAr ? 'حفظ والمتابعة' : 'Save & Continue'}
        </Button>

        <p className="text-center text-[10px] text-muted-foreground">
          {isAr ? '* جميع الحقول مطلوبة' : '* All fields are required'}
        </p>
      </CardContent>
    </Card>
  );
}
