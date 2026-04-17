// Admin Setup Guide — shows which services are configured + how to configure them.
// Reads env vars server-side and renders status badges.

import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import {
  CheckCircle,
  ExternalLink,
  Key,
  Globe,
  Shield,
  Database,
  BarChart3,
  BookOpen,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface ServiceCheck {
  name: string;
  nameAr: string;
  icon: React.ReactNode;
  configured: boolean;
  required: boolean;
  envVars: string[];
  steps: string[];
  stepsAr: string[];
  link?: string;
  linkLabel?: string;
}

async function getServices(): Promise<ServiceCheck[]> {
  const dbSettings: Record<string, string> = {};
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'integration.sentry.dsn',
        'integration.orcid.client_id',
        'integration.orcid.client_secret',
        'integration.wos.api_key',
        'integration.semantic_scholar.api_key',
        'integration.unpaywall.email',
        'integration.crossref.email',
        'integration.dimensions.api_key',
        'integration.scopus.api_key',
        'integration.google.site_verification',
        'integration.indexnow.key',
      ]);
    for (const row of data ?? []) {
      const val = typeof row.value === 'string' ? row.value.replace(/^"|"$/g, '') : '';
      if (val && val !== '""' && val !== 'null') dbSettings[row.key] = val;
    }
  } catch {}

  return [
    {
      name: 'Supabase (Database + Auth + Storage)',
      nameAr: 'Supabase (قاعدة البيانات + المصادقة + التخزين)',
      icon: <Database className="size-5" />,
      configured: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
      required: true,
      envVars: [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ],
      steps: [
        'In Coolify → Resources → Deploy from template → Supabase (self-hosted).',
        'Set POSTGRES_PASSWORD (generate: openssl rand -hex 24).',
        'Set JWT_SECRET (generate: openssl rand -hex 24).',
        'Set SITE_URL = https://yourdomain.com.',
        'Set API_EXTERNAL_URL = https://api-ris.yourdomain.com.',
        'Deploy — ANON_KEY and SERVICE_ROLE_KEY are auto-generated.',
        "Copy the 3 keys to this app's Coolify environment variables.",
        'Apply SQL migrations: run each file in supabase/migrations/ in order.',
      ],
      stepsAr: [
        'في Coolify → Resources → Deploy from template → Supabase (self-hosted).',
        'عيّن POSTGRES_PASSWORD (ولّده بـ openssl rand -hex 24).',
        'عيّن JWT_SECRET (ولّده بـ openssl rand -hex 24).',
        'عيّن SITE_URL = https://yourdomain.com.',
        'عيّن API_EXTERNAL_URL = https://api-ris.yourdomain.com.',
        'انشر — ANON_KEY و SERVICE_ROLE_KEY تُولَّد تلقائياً.',
        'انسخ المفاتيح الثلاثة إلى متغيرات بيئة هذا التطبيق في Coolify.',
        'طبّق الـ SQL migrations: شغّل كل ملف في supabase/migrations/ بالترتيب.',
      ],
    },
    {
      name: 'Google OAuth (Sign-in with Google)',
      nameAr: 'مصادقة Google (تسجيل الدخول بـ Google)',
      icon: <Globe className="size-5" />,
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      required: true,
      envVars: ['(configured in Supabase Auth dashboard, not as app env vars)'],
      steps: [
        'Go to Google Cloud Console → APIs & Services → Credentials.',
        'Create OAuth 2.0 Client ID (Web application).',
        'Authorized redirect URI: https://api-ris.yourdomain.com/auth/v1/callback',
        'Copy Client ID + Client Secret.',
        'In Supabase Studio → Authentication → Providers → Google → Enable → paste keys.',
        'In URL Configuration → Site URL: https://yourdomain.com',
        'Add redirect URLs: https://yourdomain.com/auth/callback',
      ],
      stepsAr: [
        'افتح Google Cloud Console → APIs & Services → Credentials.',
        'أنشئ OAuth 2.0 Client ID (نوع Web application).',
        'Authorized redirect URI: https://api-ris.yourdomain.com/auth/v1/callback',
        'انسخ Client ID و Client Secret.',
        'في Supabase Studio → Authentication → Providers → Google → فعّل وألصق المفاتيح.',
        'في URL Configuration → Site URL: https://yourdomain.com',
        'أضف redirect URLs: https://yourdomain.com/auth/callback',
      ],
      link: 'https://console.cloud.google.com/apis/credentials',
      linkLabel: 'Google Cloud Console',
    },
    {
      name: 'Sentry (Error monitoring)',
      nameAr: 'Sentry (مراقبة الأخطاء)',
      icon: <Shield className="size-5" />,
      configured: Boolean(
        process.env.NEXT_PUBLIC_SENTRY_DSN || dbSettings['integration.sentry.dsn'],
      ),
      required: false,
      envVars: ['NEXT_PUBLIC_SENTRY_DSN'],
      steps: [
        'Go to Admin → Integrations and enter your Sentry DSN.',
        'Or add NEXT_PUBLIC_SENTRY_DSN env var to Coolify.',
      ],
      stepsAr: [
        'اذهب إلى الإدارة → التكاملات وأدخل Sentry DSN.',
        'أو أضف متغير NEXT_PUBLIC_SENTRY_DSN في Coolify.',
      ],
      link: 'https://sentry.io',
      linkLabel: 'Sentry',
    },
    {
      name: 'ORCID (Publication import from ORCID)',
      nameAr: 'ORCID (استيراد المنشورات من ORCID)',
      icon: <BookOpen className="size-5" />,
      configured: Boolean(
        (process.env.ORCID_CLIENT_ID || dbSettings['integration.orcid.client_id']) &&
        (process.env.ORCID_CLIENT_SECRET || dbSettings['integration.orcid.client_secret']),
      ),
      required: false,
      envVars: ['ORCID_CLIENT_ID', 'ORCID_CLIENT_SECRET'],
      steps: [
        'Go to Admin → Integrations and enter your ORCID Client ID and Secret.',
        'Or add env vars to Coolify.',
      ],
      stepsAr: [
        'اذهب إلى الإدارة → التكاملات وأدخل ORCID Client ID و Secret.',
        'أو أضف المتغيرات في Coolify.',
      ],
      link: 'https://orcid.org/developer-tools',
      linkLabel: 'ORCID Developer Portal',
    },
    {
      name: 'Scopus API (Publication import from Scopus)',
      nameAr: 'Scopus API (استيراد المنشورات من Scopus)',
      icon: <BarChart3 className="size-5" />,
      configured: Boolean(process.env.SCOPUS_API_KEY || dbSettings['integration.scopus.api_key']),
      required: false,
      envVars: ['SCOPUS_API_KEY'],
      steps: [
        'Go to Admin → Integrations and enter your Scopus API Key.',
        'Or add SCOPUS_API_KEY env var to Coolify.',
      ],
      stepsAr: [
        'اذهب إلى الإدارة → التكاملات وأدخل Scopus API Key.',
        'أو أضف SCOPUS_API_KEY في Coolify.',
      ],
      link: 'https://dev.elsevier.com/',
      linkLabel: 'Elsevier Developer Portal',
    },
    {
      name: 'Web of Science (Clarivate)',
      nameAr: 'Web of Science (كلاريفيت)',
      icon: <BarChart3 className="size-5" />,
      configured: Boolean(dbSettings['integration.wos.api_key']),
      required: false,
      envVars: ['WOS_API_KEY'],
      steps: [
        'Go to Admin → Integrations and enter your WoS API Key.',
        'Apply at developer.clarivate.com for WoS Starter API (free for institutions).',
      ],
      stepsAr: [
        'اذهب إلى الإدارة → التكاملات وأدخل مفتاح WoS API.',
        'قدّم طلباً في developer.clarivate.com للحصول على WoS Starter API.',
      ],
      link: 'https://developer.clarivate.com/apis/wos-starter',
      linkLabel: 'Clarivate Developer Portal',
    },
    {
      name: 'Semantic Scholar (AI-Powered Research)',
      nameAr: 'Semantic Scholar (بحث مدعوم بالذكاء الاصطناعي)',
      icon: <BookOpen className="size-5" />,
      configured: Boolean(dbSettings['integration.semantic_scholar.api_key']),
      required: false,
      envVars: [],
      steps: ['Go to Admin → Integrations. API key is optional but increases rate limits.'],
      stepsAr: ['اذهب إلى الإدارة → التكاملات. المفتاح اختياري لكنه يزيد حد الطلبات.'],
      link: 'https://www.semanticscholar.org/product/api',
      linkLabel: 'Semantic Scholar',
    },
    {
      name: 'Unpaywall (Open Access PDFs)',
      nameAr: 'Unpaywall (روابط PDF المجانية)',
      icon: <BookOpen className="size-5" />,
      configured: Boolean(dbSettings['integration.unpaywall.email']),
      required: false,
      envVars: [],
      steps: ['Go to Admin → Integrations and enter your contact email. No API key needed.'],
      stepsAr: ['اذهب إلى الإدارة → التكاملات وأدخل بريدك. لا يحتاج مفتاح.'],
      link: 'https://unpaywall.org/products/api',
      linkLabel: 'Unpaywall',
    },
    {
      name: 'CrossRef (DOI Metadata)',
      nameAr: 'CrossRef (بيانات DOI)',
      icon: <BookOpen className="size-5" />,
      configured: Boolean(dbSettings['integration.crossref.email']),
      required: false,
      envVars: [],
      steps: ['Go to Admin → Integrations and enter your contact email for polite pool access.'],
      stepsAr: ['اذهب إلى الإدارة → التكاملات وأدخل بريدك للحصول على أولوية الوصول.'],
      link: 'https://www.crossref.org/documentation/retrieve-metadata/rest-api/',
      linkLabel: 'CrossRef',
    },
    {
      name: 'Dimensions (Digital Science)',
      nameAr: 'Dimensions (ديجيتال ساينس)',
      icon: <BarChart3 className="size-5" />,
      configured: Boolean(dbSettings['integration.dimensions.api_key']),
      required: false,
      envVars: [],
      steps: [
        'Apply at dimensions.ai for free API access (non-commercial). Enter key in Admin → Integrations.',
      ],
      stepsAr: [
        'قدّم طلباً في dimensions.ai للحصول على API مجاني. أدخل المفتاح في الإدارة → التكاملات.',
      ],
      link: 'https://www.dimensions.ai/products/free/',
      linkLabel: 'Dimensions',
    },
    {
      name: 'Google Search Console (SEO indexing)',
      nameAr: 'Google Search Console (فهرسة SEO)',
      icon: <Search className="size-5" />,
      configured: Boolean(
        process.env.GOOGLE_SITE_VERIFICATION || dbSettings['integration.google.site_verification'],
      ),
      required: false,
      envVars: ['GOOGLE_SITE_VERIFICATION'],
      steps: [
        'Go to Admin → Integrations and enter your verification code.',
        'Or add GOOGLE_SITE_VERIFICATION env var to Coolify.',
      ],
      stepsAr: [
        'اذهب إلى الإدارة → التكاملات وأدخل كود التحقق.',
        'أو أضف GOOGLE_SITE_VERIFICATION في Coolify.',
      ],
      link: 'https://search.google.com/search-console',
      linkLabel: 'Google Search Console',
    },
    {
      name: 'IndexNow (Bing/Yandex fast indexing)',
      nameAr: 'IndexNow (فهرسة سريعة لـ Bing/Yandex)',
      icon: <Key className="size-5" />,
      configured: Boolean(process.env.INDEXNOW_KEY || dbSettings['integration.indexnow.key']),
      required: false,
      envVars: ['INDEXNOW_KEY'],
      steps: [
        'Go to Admin → Integrations and enter your IndexNow key.',
        'Or add INDEXNOW_KEY env var to Coolify.',
      ],
      stepsAr: [
        'اذهب إلى الإدارة → التكاملات وأدخل مفتاح IndexNow.',
        'أو أضف INDEXNOW_KEY في Coolify.',
      ],
    },
  ];
}

interface SetupPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SetupPage({ params }: SetupPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const isAr = locale === 'ar';
  const services = await getServices();
  const configuredCount = services.filter((s) => s.configured).length;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isAr ? 'دليل إعداد الخدمات' : 'Service Setup Guide'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isAr
            ? `${configuredCount} من ${services.length} خدمات مُهيّأة. الخدمات المطلوبة مُعلَّمة.`
            : `${configuredCount} of ${services.length} services configured. Required services are marked.`}
        </p>
        <div className="flex gap-2">
          <Badge variant={configuredCount === services.length ? 'default' : 'secondary'}>
            {configuredCount}/{services.length}
          </Badge>
        </div>
      </header>

      <div className="space-y-4">
        {services.map((s) => (
          <ServiceCard key={s.name} service={s} isAr={isAr} />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({ service, isAr }: { service: ServiceCheck; isAr: boolean }) {
  const name = isAr ? service.nameAr : service.name;
  const steps = isAr ? service.stepsAr : service.steps;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <div
          className={`inline-flex size-10 items-center justify-center rounded-full ${
            service.configured
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {service.configured ? <CheckCircle className="size-5" /> : service.icon}
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="flex items-center gap-2 text-base">
            {name}
            {service.required ? (
              <Badge variant="destructive" className="text-[10px]">
                {isAr ? 'مطلوب' : 'Required'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                {isAr ? 'اختياري' : 'Optional'}
              </Badge>
            )}
          </CardTitle>
          <div className="mt-1 flex items-center gap-2">
            {service.configured ? (
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                ✓ {isAr ? 'مُهيّأ' : 'Configured'}
              </span>
            ) : (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                ✗ {isAr ? 'غير مُهيّأ' : 'Not configured'}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      {!service.configured && (
        <CardContent className="space-y-3 border-t pt-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isAr ? 'المتغيرات المطلوبة' : 'Required env vars'}
            </p>
            <div className="flex flex-wrap gap-1">
              {service.envVars.map((v) => (
                <code key={v} className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                  {v}
                </code>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isAr ? 'خطوات الإعداد' : 'Setup steps'}
            </p>
            <ol className="text-muted-foreground ms-5 list-decimal space-y-1 text-sm">
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          {service.link && (
            <a
              href={service.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
            >
              <ExternalLink className="size-3.5" />
              {service.linkLabel}
            </a>
          )}
        </CardContent>
      )}
    </Card>
  );
}
