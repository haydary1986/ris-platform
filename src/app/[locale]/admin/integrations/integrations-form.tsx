'use client';

import { useState, useTransition } from 'react';
import { Eye, EyeOff, ExternalLink, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { updateSetting } from '@/lib/admin/actions';

interface IntegrationsFormProps {
  settings: Record<string, string>;
  locale: string;
}

interface ServiceConfig {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  link?: string;
  linkLabel?: string;
  fields: Array<{
    key: string;
    label: string;
    labelAr: string;
    placeholder?: string;
    secret?: boolean;
    type?: 'text' | 'toggle';
    hintAr?: string;
    hintEn?: string;
  }>;
}

const SERVICES: ServiceConfig[] = [
  {
    id: 'sentry',
    title: 'Sentry (Error Monitoring)',
    titleAr: 'Sentry (مراقبة الأخطاء)',
    description: 'Sign up at sentry.io → Create Next.js project → Copy DSN + Auth Token.',
    descriptionAr: 'سجّل في sentry.io → أنشئ مشروع Next.js → انسخ DSN + Auth Token.',
    link: 'https://sentry.io',
    linkLabel: 'Sentry',
    fields: [
      {
        key: 'integration.sentry.dsn',
        label: 'DSN',
        labelAr: 'DSN',
        placeholder: 'https://xxx@xxx.ingest.sentry.io/xxx',
      },
      {
        key: 'integration.sentry.org',
        label: 'Organization',
        labelAr: 'المنظمة',
        placeholder: 'my-org',
      },
      {
        key: 'integration.sentry.project',
        label: 'Project',
        labelAr: 'المشروع',
        placeholder: 'ris-platform',
      },
    ],
  },
  {
    id: 'orcid',
    title: 'ORCID (Publication Import)',
    titleAr: 'ORCID (استيراد المنشورات)',
    description:
      'Sign up at orcid.org/developer-tools → Register app → Redirect URI: https://ris.uoturath.edu.iq/api/auth/orcid/callback',
    descriptionAr:
      'سجّل في orcid.org/developer-tools → أنشئ تطبيق → Redirect URI: https://ris.uoturath.edu.iq/api/auth/orcid/callback',
    link: 'https://orcid.org/developer-tools',
    linkLabel: 'ORCID Developer Portal',
    fields: [
      {
        key: 'integration.orcid.client_id',
        label: 'Client ID',
        labelAr: 'Client ID',
        placeholder: 'APP-XXXXXXXXXXXXXXXX',
      },
      {
        key: 'integration.orcid.client_secret',
        label: 'Client Secret',
        labelAr: 'Client Secret',
        placeholder: '********',
        secret: true,
      },
    ],
  },
  {
    id: 'deepseek',
    title: 'DeepSeek (AI Chat Assistant)',
    titleAr: 'DeepSeek (مساعد محادثة ذكي)',
    description:
      'Powers the floating AI assistant that helps visitors find researchers and publications. Get an API key at platform.deepseek.com/api_keys.',
    descriptionAr:
      'يُشغّل المساعد الذكي العائم الذي يساعد الزوار على إيجاد الباحثين والمنشورات. احصل على مفتاح من platform.deepseek.com/api_keys.',
    link: 'https://platform.deepseek.com/api_keys',
    linkLabel: 'DeepSeek API Keys',
    fields: [
      {
        key: 'integration.deepseek.api_key',
        label: 'API Key',
        labelAr: 'مفتاح API',
        placeholder: 'sk-********',
        secret: true,
      },
      {
        key: 'integration.deepseek.enabled',
        label: 'Enabled',
        labelAr: 'مفعَّل',
        type: 'toggle',
        hintEn:
          'When off, the floating widget shows a "Launching soon" message instead of replying.',
        hintAr: 'عند الإيقاف، تعرض الأيقونة العائمة "قريباً جداً الإطلاق" بدلاً من الردّ.',
      },
    ],
  },
  {
    id: 'push',
    title: 'Web Push Notifications (VAPID)',
    titleAr: 'إشعارات الويب (VAPID)',
    description:
      'Send browser push notifications to subscribed users. Generate a keypair once with `npx web-push generate-vapid-keys` and paste both halves here. Subject should be a mailto: URL your users can reach — Google/Mozilla push services require it.',
    descriptionAr:
      'أرسل إشعارات متصفح للمستخدمين المشتركين. ولّد زوج مفاتيح مرة واحدة بـ `npx web-push generate-vapid-keys` والصقهما هنا. Subject يجب أن يكون mailto: فعّال — شرط من خدمات Google/Mozilla push.',
    fields: [
      {
        key: 'integration.push.vapid_public',
        label: 'VAPID Public Key',
        labelAr: 'المفتاح العام VAPID',
        placeholder: 'BA77zN60...',
      },
      {
        key: 'integration.push.vapid_private',
        label: 'VAPID Private Key',
        labelAr: 'المفتاح الخاص VAPID',
        placeholder: '********',
        secret: true,
      },
      {
        key: 'integration.push.vapid_subject',
        label: 'Contact Subject (mailto:)',
        labelAr: 'جهة الاتصال (mailto:)',
        placeholder: 'mailto:admin@uoturath.edu.iq',
      },
    ],
  },
  {
    id: 'scopus',
    title: 'Scopus API (Publication Import)',
    titleAr: 'Scopus API (استيراد المنشورات)',
    description: 'Sign up at dev.elsevier.com → Create API Key (free for academic use).',
    descriptionAr: 'سجّل في dev.elsevier.com → أنشئ API Key (مجاني للجامعات).',
    link: 'https://dev.elsevier.com/',
    linkLabel: 'Elsevier Developer Portal',
    fields: [
      {
        key: 'integration.scopus.api_key',
        label: 'API Key',
        labelAr: 'مفتاح API',
        placeholder: '********',
        secret: true,
      },
    ],
  },
  {
    id: 'wos',
    title: 'Web of Science (Clarivate)',
    titleAr: 'Web of Science (كلاريفيت)',
    description:
      'Apply at developer.clarivate.com for WoS Starter API (free for institutions). Enter your API key to enable WoS publication import and metrics.',
    descriptionAr:
      'قدّم طلباً في developer.clarivate.com للحصول على WoS Starter API (مجاني للمؤسسات). أدخل مفتاح API لتفعيل استيراد المنشورات ومؤشرات WoS.',
    link: 'https://developer.clarivate.com/apis/wos-starter',
    linkLabel: 'Clarivate Developer Portal',
    fields: [
      {
        key: 'integration.wos.api_key',
        label: 'API Key',
        labelAr: 'مفتاح API',
        placeholder: '********',
        secret: true,
      },
    ],
  },
  {
    id: 'openalex',
    title: 'OpenAlex (Open Research Data)',
    titleAr: 'OpenAlex (بيانات بحثية مفتوحة)',
    description:
      'Free and open — no API key needed. Used automatically for institution stats, leaderboard, and SDG data. Enter your institution ID to customize.',
    descriptionAr:
      'مجاني ومفتوح — لا يحتاج مفتاح. يُستخدم تلقائياً للإحصائيات والتصنيف وأهداف التنمية. أدخل معرّف المؤسسة للتخصيص.',
    link: 'https://openalex.org',
    linkLabel: 'OpenAlex',
    fields: [
      {
        key: 'integration.openalex.institution_id',
        label: 'Institution ID',
        labelAr: 'معرّف المؤسسة',
        placeholder: 'I2801460691',
      },
    ],
  },
  {
    id: 'semantic_scholar',
    title: 'Semantic Scholar (AI-Powered Research)',
    titleAr: 'Semantic Scholar (بحث مدعوم بالذكاء الاصطناعي)',
    description:
      'Free API — 100 req/sec. Provides influential citations, paper recommendations, and AI-generated TLDRs. Get API key at semanticscholar.org/product/api.',
    descriptionAr:
      'API مجاني — 100 طلب/ثانية. يوفر الاقتباسات المؤثرة وتوصيات الأبحاث وملخصات AI. احصل على مفتاح من semanticscholar.org/product/api.',
    link: 'https://www.semanticscholar.org/product/api',
    linkLabel: 'Semantic Scholar API',
    fields: [
      {
        key: 'integration.semantic_scholar.api_key',
        label: 'API Key (optional — increases rate limit)',
        labelAr: 'مفتاح API (اختياري — يزيد حد الطلبات)',
        placeholder: '********',
        secret: true,
      },
    ],
  },
  {
    id: 'unpaywall',
    title: 'Unpaywall (Open Access PDF Links)',
    titleAr: 'Unpaywall (روابط PDF المجانية)',
    description:
      'Free API — finds legal Open Access PDFs for any DOI. Just needs your email. 100,000 req/day.',
    descriptionAr:
      'API مجاني — يجد روابط PDF مفتوحة لأي DOI. يحتاج بريدك الإلكتروني فقط. 100,000 طلب/يوم.',
    link: 'https://unpaywall.org/products/api',
    linkLabel: 'Unpaywall API',
    fields: [
      {
        key: 'integration.unpaywall.email',
        label: 'Contact Email',
        labelAr: 'البريد الإلكتروني',
        placeholder: 'admin@uoturath.edu.iq',
      },
    ],
  },
  {
    id: 'crossref',
    title: 'CrossRef (DOI Metadata)',
    titleAr: 'CrossRef (بيانات DOI)',
    description:
      'Free API — verify DOIs, fetch publication metadata, citation counts. Polite pool with email gets better rate limits.',
    descriptionAr:
      'API مجاني — التحقق من DOI، جلب بيانات المنشورات، عدد الاقتباسات. أضف بريدك للحصول على حد أعلى.',
    link: 'https://www.crossref.org/documentation/retrieve-metadata/rest-api/',
    linkLabel: 'CrossRef API',
    fields: [
      {
        key: 'integration.crossref.email',
        label: 'Contact Email (for polite pool)',
        labelAr: 'البريد الإلكتروني (للحصول على أولوية)',
        placeholder: 'admin@uoturath.edu.iq',
      },
    ],
  },
  {
    id: 'dimensions',
    title: 'Dimensions (Digital Science)',
    titleAr: 'Dimensions (ديجيتال ساينس)',
    description:
      'Free API for non-commercial use — publications, grants, patents, clinical trials, policy documents. Apply at dimensions.ai.',
    descriptionAr:
      'API مجاني للاستخدام غير التجاري — منشورات، منح، براءات اختراع. قدّم طلباً في dimensions.ai.',
    link: 'https://www.dimensions.ai/products/free/',
    linkLabel: 'Dimensions Free API',
    fields: [
      {
        key: 'integration.dimensions.api_key',
        label: 'API Key',
        labelAr: 'مفتاح API',
        placeholder: '********',
        secret: true,
      },
    ],
  },
  {
    id: 'gsc',
    title: 'Google Search Console (SEO)',
    titleAr: 'Google Search Console (فهرسة SEO)',
    description:
      'Go to search.google.com/search-console → Add property → HTML tag verification → Copy content value.',
    descriptionAr:
      'افتح search.google.com/search-console → أضف property → تحقق HTML tag → انسخ قيمة content.',
    link: 'https://search.google.com/search-console',
    linkLabel: 'Google Search Console',
    fields: [
      {
        key: 'integration.google.site_verification',
        label: 'Verification Code',
        labelAr: 'رمز التحقق',
        placeholder: 'xxxxxxxxxx',
      },
    ],
  },
  {
    id: 'indexnow',
    title: 'IndexNow (Bing/Yandex Fast Indexing)',
    titleAr: 'IndexNow (فهرسة سريعة Bing/Yandex)',
    description:
      'Generate a key: openssl rand -hex 16. Also create a file public/{key}.txt with the key.',
    descriptionAr:
      'ولّد مفتاحاً: openssl rand -hex 16. أنشئ أيضاً ملف public/{key}.txt يحتوي المفتاح.',
    fields: [
      {
        key: 'integration.indexnow.key',
        label: 'Key',
        labelAr: 'المفتاح',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
    ],
  },
];

export function IntegrationsForm({ settings, locale }: IntegrationsFormProps) {
  const isAr = locale === 'ar';
  const [values, setValues] = useState<Record<string, string>>(settings);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [savingService, setSavingService] = useState<string | null>(null);

  function updateValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSecret(key: string) {
    setShowSecret((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function saveService(service: ServiceConfig) {
    setSavingService(service.id);
    startTransition(async () => {
      let hasError = false;
      for (const field of service.fields) {
        const val = values[field.key] ?? '';
        const res = await updateSetting(field.key, val);
        if (!res.ok) {
          toast.error(`Failed: ${field.label}`);
          hasError = true;
        }
      }
      if (!hasError) {
        toast.success(isAr ? 'تم الحفظ' : 'Saved');
      }
      setSavingService(null);
    });
  }

  return (
    <div className="space-y-4">
      {SERVICES.map((service) => {
        // "Configured" = every text/secret field has a value. Toggles aren't
        // part of the completeness check — absence of a toggle value just
        // means "off", not "unconfigured".
        const configured = service.fields
          .filter((f) => f.type !== 'toggle')
          .every((f) => values[f.key]?.trim());
        return (
          <Card key={service.id}>
            <CardHeader className="flex-row items-center gap-3">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  {isAr ? service.titleAr : service.title}
                  {configured ? (
                    <Badge variant="default" className="text-[10px]">
                      {isAr ? 'مُهيّأ' : 'Configured'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      {isAr ? 'غير مُهيّأ' : 'Not configured'}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-xs">
                  {isAr ? service.descriptionAr : service.description}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {service.fields.map((field) => {
                if (field.type === 'toggle') {
                  const enabled = values[field.key] === 'true';
                  return (
                    <div
                      key={field.key}
                      className="bg-muted/40 flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <Label htmlFor={field.key} className="text-sm font-medium">
                          {isAr ? field.labelAr : field.label}
                        </Label>
                        {(isAr ? field.hintAr : field.hintEn) ? (
                          <p className="text-muted-foreground text-xs">
                            {isAr ? field.hintAr : field.hintEn}
                          </p>
                        ) : null}
                      </div>
                      <Switch
                        id={field.key}
                        checked={enabled}
                        onCheckedChange={(v) => updateValue(field.key, v ? 'true' : 'false')}
                      />
                    </div>
                  );
                }
                return (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={field.key} className="text-xs">
                      {isAr ? field.labelAr : field.label}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={field.key}
                        type={field.secret && !showSecret[field.key] ? 'password' : 'text'}
                        value={values[field.key] ?? ''}
                        onChange={(e) => updateValue(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="font-mono text-xs"
                      />
                      {field.secret ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSecret(field.key)}
                        >
                          {showSecret[field.key] ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2">
                {service.link ? (
                  <a
                    href={service.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    {service.linkLabel}
                  </a>
                ) : (
                  <span />
                )}
                <Button
                  size="sm"
                  onClick={() => saveService(service)}
                  disabled={isPending && savingService === service.id}
                >
                  {isPending && savingService === service.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {isAr ? 'حفظ' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
