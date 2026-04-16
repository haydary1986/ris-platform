'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { addAdmin, removeAdmin } from '@/lib/admin/actions';
import { Trash2 } from 'lucide-react';

interface Admin {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email: string | null;
}

interface Translations {
  email: string;
  role: string;
  createdAt: string;
  actions: string;
  remove: string;
  addPlaceholder: string;
  addButton: string;
  confirmRemove: string;
  success: string;
  error: string;
  noAdmins: string;
}

interface ManageAdminsClientProps {
  admins: Admin[];
  translations: Translations;
}

export function ManageAdminsClient({ admins, translations: t }: ManageAdminsClientProps) {
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!email.trim()) return;
    startTransition(async () => {
      const result = await addAdmin(email.trim());
      if (result.ok) {
        toast.success(t.success);
        setEmail('');
      } else {
        toast.error(result.error ?? t.error);
      }
    });
  }

  function handleRemove(id: string) {
    if (!confirm(t.confirmRemove)) return;
    startTransition(async () => {
      const result = await removeAdmin(id);
      if (result.ok) {
        toast.success(t.success);
      } else {
        toast.error(result.error ?? t.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder={t.addPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          disabled={isPending}
        />
        <Button onClick={handleAdd} disabled={isPending || !email.trim()}>
          {t.addButton}
        </Button>
      </div>

      {admins.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.noAdmins}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-start font-medium">{t.email}</th>
                <th className="px-4 py-2 text-start font-medium">{t.role}</th>
                <th className="px-4 py-2 text-start font-medium">{t.createdAt}</th>
                <th className="px-4 py-2 text-end font-medium">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{admin.email ?? admin.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary">{admin.role}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(admin.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-end">
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => handleRemove(admin.id)}
                      disabled={isPending}
                    >
                      <Trash2 />
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
