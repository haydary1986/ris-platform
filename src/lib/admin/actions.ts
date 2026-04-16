'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('admins').select('id').eq('user_id', user.id).maybeSingle();
  return data ? user.id : null;
}

export async function addAdmin(email: string): Promise<ActionResult> {
  const adminUserId = await requireAdmin();
  if (!adminUserId) return { ok: false, error: 'forbidden' };

  const supabase = await createClient();
  const { data: target } = await supabase
    .from('researchers')
    .select('user_id')
    .ilike('private_email', email)
    .maybeSingle();
  if (!target?.user_id) return { ok: false, error: 'user_not_found' };

  const { error } = await supabase.from('admins').insert({
    user_id: target.user_id,
    role: 'super_admin',
    created_by: adminUserId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/[locale]/admin', 'layout');
  return { ok: true };
}

export async function removeAdmin(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: 'forbidden' };
  const supabase = await createClient();
  const { error } = await supabase.from('admins').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/[locale]/admin', 'layout');
  return { ok: true };
}

export async function setVisibilityOverride(
  researcherId: string,
  override: 'force_show' | 'force_hide' | null,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: 'forbidden' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('researchers')
    .update({ admin_visibility_override: override })
    .eq('id', researcherId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/[locale]/admin/visibility', 'page');
  return { ok: true };
}

export async function updateSetting(key: string, value: unknown): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: 'forbidden' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('app_settings')
    .update({ value: JSON.stringify(value) })
    .eq('key', key);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/[locale]/admin/settings', 'page');
  return { ok: true };
}

export async function upsertCollege(input: {
  id?: string;
  name_en: string;
  name_ar: string;
  slug: string;
}): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: 'forbidden' };
  const supabase = await createClient();
  if (input.id) {
    const { error } = await supabase
      .from('colleges')
      .update({ name_en: input.name_en, name_ar: input.name_ar, slug: input.slug })
      .eq('id', input.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from('colleges')
      .insert({ name_en: input.name_en, name_ar: input.name_ar, slug: input.slug });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath('/[locale]/admin/colleges', 'page');
  return { ok: true };
}

export async function deleteCollege(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: 'forbidden' };
  const supabase = await createClient();
  const { error } = await supabase.from('colleges').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/[locale]/admin/colleges', 'page');
  return { ok: true };
}

export async function upsertDepartment(input: {
  id?: string;
  college_id: string;
  name_en: string;
  name_ar: string;
  slug: string;
}): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: 'forbidden' };
  const supabase = await createClient();
  if (input.id) {
    const { error } = await supabase
      .from('departments')
      .update({
        college_id: input.college_id,
        name_en: input.name_en,
        name_ar: input.name_ar,
        slug: input.slug,
      })
      .eq('id', input.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from('departments').insert({
      college_id: input.college_id,
      name_en: input.name_en,
      name_ar: input.name_ar,
      slug: input.slug,
    });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath('/[locale]/admin/colleges', 'page');
  return { ok: true };
}

export async function deleteDepartment(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: 'forbidden' };
  const supabase = await createClient();
  const { error } = await supabase.from('departments').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/[locale]/admin/colleges', 'page');
  return { ok: true };
}
