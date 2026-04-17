'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
  const { data } = await supabase
    .from('admins')
    .select('id, role')
    .eq('user_id', user.id)
    .maybeSingle();
  return data ? user.id : null;
}

async function requireSuperAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('admins')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .maybeSingle();
  return data ? user.id : null;
}

export async function addAdmin(
  email: string,
  role: 'super_admin' | 'college_admin' | 'department_admin' = 'super_admin',
  scopeId?: string,
): Promise<ActionResult> {
  const adminUserId = await requireSuperAdmin();
  if (!adminUserId) return { ok: false, error: 'forbidden — super_admin required' };

  // Find user by email in auth.users
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient.auth.admin.listUsers();
    const target = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!target) return { ok: false, error: 'user_not_found — they must sign in first' };

    const supabase = await createClient();
    const { error } = await supabase.from('admins').insert({
      user_id: target.id,
      role,
      scope_id: role === 'super_admin' ? null : scopeId || null,
      created_by: adminUserId,
    });
    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }

  revalidatePath('/[locale]/admin', 'layout');
  return { ok: true };
}

export async function removeAdmin(id: string): Promise<ActionResult> {
  if (!(await requireSuperAdmin())) return { ok: false, error: 'forbidden' };
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
  const supabase = createAdminClient();
  const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
  const { error } = await supabase.from('app_settings').update({ value: jsonValue }).eq('key', key);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/[locale]/admin', 'layout');
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
