import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, LogIn, LogOut, UserPlus, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

const ACTION_CONFIG: Record<
  string,
  {
    label: string;
    labelAr: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof LogIn;
  }
> = {
  login: { label: 'Login', labelAr: 'تسجيل دخول', variant: 'default', icon: LogIn },
  logout: { label: 'Logout', labelAr: 'تسجيل خروج', variant: 'secondary', icon: LogOut },
  user_signedup: { label: 'Sign Up', labelAr: 'تسجيل جديد', variant: 'outline', icon: UserPlus },
  token_refreshed: {
    label: 'Token Refresh',
    labelAr: 'تجديد الجلسة',
    variant: 'secondary',
    icon: Shield,
  },
  user_deleted: {
    label: 'User Deleted',
    labelAr: 'حذف مستخدم',
    variant: 'destructive',
    icon: AlertTriangle,
  },
};

export default async function AuthLogsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const isAr = locale === 'ar';
  const supabase = await createClient();

  const { data: logs } = await supabase.rpc('get_auth_logs', { p_limit: 200 });

  const entries = (logs ?? []) as Array<{
    id: string;
    action: string;
    email: string | null;
    actor_name: string | null;
    ip_address: string | null;
    created_at: string;
  }>;

  const loginCount = entries.filter((e) => e.action === 'login').length;
  const signupCount = entries.filter((e) => e.action === 'user_signedup').length;
  const uniqueEmails = new Set(entries.filter((e) => e.email).map((e) => e.email)).size;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isAr ? 'سجل المصادقة والأمان' : 'Authentication & Security Log'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAr
            ? 'جميع عمليات تسجيل الدخول والخروج والتسجيل'
            : 'All login, logout, and signup events'}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{loginCount}</p>
            <p className="text-xs text-muted-foreground">{isAr ? 'عمليات دخول' : 'Logins'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{signupCount}</p>
            <p className="text-xs text-muted-foreground">{isAr ? 'تسجيلات جديدة' : 'Sign-ups'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{uniqueEmails}</p>
            <p className="text-xs text-muted-foreground">
              {isAr ? 'مستخدمون فريدون' : 'Unique users'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-start font-medium">{isAr ? 'الحدث' : 'Event'}</th>
              <th className="px-4 py-2 text-start font-medium">{isAr ? 'المستخدم' : 'User'}</th>
              <th className="px-4 py-2 text-start font-medium">{isAr ? 'عنوان IP' : 'IP'}</th>
              <th className="px-4 py-2 text-start font-medium">{isAr ? 'الوقت' : 'Time'}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((e) => {
              const config = ACTION_CONFIG[e.action];
              return (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <Badge variant={config?.variant ?? 'outline'} className="text-[10px]">
                      {isAr ? (config?.labelAr ?? e.action) : (config?.label ?? e.action)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-xs font-medium">{e.actor_name ?? '—'}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {e.email ?? '—'}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                    {e.ip_address ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground tabular-nums">
                    {new Date(e.created_at).toLocaleString(locale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
