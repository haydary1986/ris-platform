export interface ProfileCompleteness {
  complete: boolean;
  missing: string[];
}

export function checkProfileComplete(profile: {
  college_id: string | null;
  department_id: string | null;
  academic_title_id: string | null;
  full_name_en: string | null;
  full_name_ar: string | null;
}): ProfileCompleteness {
  const missing: string[] = [];

  if (!profile.full_name_en?.trim()) missing.push('full_name_en');
  if (!profile.full_name_ar?.trim()) missing.push('full_name_ar');
  if (!profile.college_id) missing.push('college_id');
  if (!profile.department_id) missing.push('department_id');
  if (!profile.academic_title_id) missing.push('academic_title_id');

  return { complete: missing.length === 0, missing };
}
