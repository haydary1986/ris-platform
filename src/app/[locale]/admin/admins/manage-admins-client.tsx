'use client';

import { useState, useTransition } from 'react';
import { Trash, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addAdmin, removeAdmin } from '@/lib/admin/actions';

interface Admin {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email: string | null;
  scope_name?: string | null;
}
interface Lookup {
  id: string;
  name_en: string;
  name_ar: string;
}

interface Props {
  admins: Admin[];
  colleges: Lookup[];
  departments: Lookup[];
  translations: Record<string, string>;
  locale: string;
}

const ROLES = [
  { value: 'super_admin', en: 'Super Admin', ar: 'مدير عام' },
  { value: 'college_admin', en: 'College Admin', ar: 'مدير كلية' },
  { value: 'department_admin', en: 'Dept Admin', ar: 'مدير قسم' },
] as const;

export function ManageAdminsClient({
  admins,
  colleges,
  departments,
  translations: t,
  locale,
}: Props) {
  const isAr = locale === 'ar';
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('super_admin');
  const [scopeId, setScopeId] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!email.trim()) return;
    if (role !== 'super_admin' && !scopeId) {
      toast.error(isAr ? 'اختر النطاق' : 'Select scope');
      return;
    }
    startTransition(async () => {
      const res = await addAdmin(
        email.trim(),
        role as 'super_admin' | 'college_admin' | 'department_admin',
        scopeId || undefined,
      );
      if (res.ok) {
        toast.success(t.success);
        setEmail('');
        setRole('super_admin');
        setScopeId('');
      } else toast.error(res.error ?? t.error);
    });
  }

  function handleRemove(id: string) {
    if (!confirm(t.confirmRemove)) return;
    startTransition(async () => {
      const res = await removeAdmin(id);
      if (res.ok) toast.success(t.success);
      else toast.error(res.error ?? t.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border p-4">
        <div className="min-w-48 flex-1 space-y-1">
          <label className="text-xs font-medium">{t.email}</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.addPlaceholder}
            type="email"
          />
        </div>
        <div className="w-40 space-y-1">
          <label className="text-xs font-medium">{t.role}</label>
          <Select
            value={role}
            onValueChange={(v) => {
              setRole(v ?? 'super_admin');
              setScopeId('');
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {isAr ? r.ar : r.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {role === 'college_admin' && (
          <div className="w-48 space-y-1">
            <label className="text-xs font-medium">{isAr ? 'الكلية' : 'College'}</label>
            <Select value={scopeId} onValueChange={(v) => setScopeId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="..." />
              </SelectTrigger>
              <SelectContent>
                {colleges.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {isAr ? c.name_ar : c.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {role === 'department_admin' && (
          <div className="w-48 space-y-1">
            <label className="text-xs font-medium">{isAr ? 'القسم' : 'Department'}</label>
            <Select value={scopeId} onValueChange={(v) => setScopeId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {isAr ? d.name_ar : d.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button onClick={handleAdd} disabled={isPending || !email.trim()}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t.addButton}
        </Button>
      </div>

      {admins.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.noAdmins}</p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-start font-medium">{t.email}</th>
                <th className="px-4 py-2 text-start font-medium">{t.role}</th>
                <th className="px-4 py-2 text-start font-medium">{isAr ? 'النطاق' : 'Scope'}</th>
                <th className="px-4 py-2 text-start font-medium">{t.createdAt}</th>
                <th className="px-4 py-2 text-end font-medium">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {admins.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 text-xs">{a.email ?? a.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-2">
                    <Badge variant={a.role === 'super_admin' ? 'default' : 'secondary'}>
                      {ROLES.find((r) => r.value === a.role)?.[isAr ? 'ar' : 'en'] ?? a.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{a.scope_name ?? '—'}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-end">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemove(a.id)}
                      disabled={isPending}
                    >
                      <Trash className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
