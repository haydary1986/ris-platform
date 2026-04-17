# متطلّبات الإعداد — ما يحتاج توفيره يدوياً

> هذا الملف يُلخّص كل شيء خارج الكود يجب أن تُعدّه لتشغيل المنصة.
> الكود جاهز بالكامل — هذه الخطوات تربطه بالخدمات الحقيقية.

---

## 1. Supabase — Self-hosted على سيرفرك (حرج — لا تعمل المنصة بدونه)

> **لا يحتاج اشتراك في أي موقع.** Supabase مفتوح المصدر بالكامل.
> Docker images تُسحب مجاناً من Docker Hub بدون حساب أو ترخيص.
> كل البيانات تبقى على سيرفرك — لا حدود على الحجم أو الطلبات.

### خطوات التثبيت (عبر Coolify)

1. في Coolify → Resources → Deploy from template → **Supabase (self-hosted)**.
2. عدّل المتغيرات:
   - `POSTGRES_PASSWORD` — 32+ حرف عشوائي (ولّده بـ `openssl rand -hex 24`)
   - `JWT_SECRET` — 32+ حرف (ولّده بـ `openssl rand -hex 24`)
   - `SITE_URL` = `https://yourdomain.com`
   - `API_EXTERNAL_URL` = `https://api-ris.yourdomain.com`
3. `ANON_KEY` و `SERVICE_ROLE_KEY` تُولَّد تلقائياً من `JWT_SECRET` (Coolify يتكفّل بذلك).
4. اضغط **Deploy** — ستعمل 5-7 containers (PostgreSQL + Auth + REST + Storage + Kong).
5. بعد التشغيل، طبّق الـ migrations:
   ```bash
   # عبر psql من جهازك (اتصل بـ PostgreSQL المُثبّت على السيرفر):
   for f in supabase/migrations/*.sql; do
     psql "postgresql://postgres:YOUR_PASSWORD@YOUR_VPS_IP:5432/postgres" \
       -v ON_ERROR_STOP=1 -f "$f"
   done
   ```
   أو ألصق كل ملف migration بالترتيب في **Coolify → Services → Supabase → Postgres → Terminal/SQL**.
6. تحقق من RLS:
   ```bash
   psql "$DATABASE_URL" -f supabase/tests/rls_smoke.sql
   ```

### من أين أحصل على المفاتيح؟

| المفتاح                         | المصدر                                                           |
| ------------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://api-ris.yourdomain.com` (عنوان Kong gateway على سيرفرك) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | يُولَّد تلقائياً في Coolify عند deploy — انسخه من متغيرات البيئة |
| `SUPABASE_SERVICE_ROLE_KEY`     | نفس المكان — **سرّي، لا تشاركه!**                                |

---

## 2. Google OAuth (مطلوب لتسجيل الدخول)

1. افتح [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. أنشئ **OAuth 2.0 Client ID** (نوع: Web application).
3. أضف:
   - **Authorized JavaScript origins:**
     - `https://yourdomain.com`
     - `https://staging.yourdomain.com` (إن وُجد)
     - `http://localhost:3000` (للتطوير)
   - **Authorized redirect URIs:**
     - `https://<your-supabase>.supabase.co/auth/v1/callback`
     - (أو إذا self-hosted: `https://api-ris.yourdomain.com/auth/v1/callback`)
4. انسخ `Client ID` و `Client Secret`.
5. في Supabase Dashboard → **Authentication → Providers → Google** → فعّل وألصق المفاتيح.
6. في Supabase → **Authentication → URL Configuration:**
   - **Site URL:** `https://yourdomain.com`
   - **Additional Redirect URLs:**
     - `https://yourdomain.com/auth/callback`
     - `https://staging.yourdomain.com/auth/callback`
     - `http://localhost:3000/auth/callback`

---

## 3. متغيرات البيئة في Coolify

أضفها في **Coolify → Application → Environment Variables**:

### حرجة (Required)

| المتغيّر                        | القيمة                   | Public/Secret |
| ------------------------------- | ------------------------ | ------------- |
| `NEXT_PUBLIC_SITE_URL`          | `https://yourdomain.com` | Public        |
| `NEXT_PUBLIC_SUPABASE_URL`      | من Supabase              | Public        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | من Supabase              | Public        |
| `SUPABASE_SERVICE_ROLE_KEY`     | من Supabase              | **Secret**    |

### Sentry (للرصد)

| المتغيّر                 | المصدر                               | Public/Secret |
| ------------------------ | ------------------------------------ | ------------- |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry → Project → Client Keys → DSN | Public        |
| `SENTRY_DSN`             | نفسه (للـ server runtime)            | Public        |
| `SENTRY_ORG`             | اسم الـ org                          | Public        |
| `SENTRY_PROJECT`         | اسم المشروع                          | Public        |
| `SENTRY_AUTH_TOKEN`      | Sentry → User Auth Tokens            | **Secret**    |

**كيفية التوفير:**

1. سجّل في [sentry.io](https://sentry.io) أو self-host.
2. أنشئ مشروع Next.js.
3. انسخ DSN من Project Settings → Client Keys.
4. أنشئ Auth Token من Settings → User Auth Tokens (لرفع source maps).

### ORCID OAuth (لاستيراد المنشورات)

| المتغيّر              | المصدر                 | Public/Secret |
| --------------------- | ---------------------- | ------------- |
| `ORCID_CLIENT_ID`     | ORCID Developer Portal | Public        |
| `ORCID_CLIENT_SECRET` | ORCID Developer Portal | **Secret**    |

**كيفية التوفير:**

1. سجّل في [ORCID Developer Portal](https://orcid.org/developer-tools).
2. أنشئ app مع:
   - **Redirect URI:** `https://yourdomain.com/api/auth/orcid/callback`
   - **Scope:** `/read-limited`
3. انسخ Client ID و Client Secret.

### Scopus API (لاستيراد المنشورات)

| المتغيّر         | المصدر                    | Public/Secret |
| ---------------- | ------------------------- | ------------- |
| `SCOPUS_API_KEY` | Elsevier Developer Portal | **Secret**    |

**كيفية التوفير:**

1. سجّل في [Elsevier Developer Portal](https://dev.elsevier.com/).
2. أنشئ API Key (مجاني للاستخدام الأكاديمي).
3. الحدود: 20,000 query/week مؤسسي، 9 req/sec.

### SEO

| المتغيّر                   | المصدر                                   | Public/Secret |
| -------------------------- | ---------------------------------------- | ------------- |
| `GOOGLE_SITE_VERIFICATION` | Google Search Console → Meta tag content | Public        |
| `INDEXNOW_KEY`             | ولّد 32 حرف hex عشوائي                   | Public        |

**IndexNow:**

1. ولّد مفتاح: `openssl rand -hex 16`
2. أنشئ ملف `public/{key}.txt` يحتوي فقط المفتاح.
3. أضف `INDEXNOW_KEY` لمتغيرات Coolify.

**Google Search Console:**

1. افتح [GSC](https://search.google.com/search-console).
2. أضف property للنطاق.
3. اختر التحقق بـ HTML tag.
4. انسخ قيمة `content="..."` من الـ meta tag.
5. ألصقها كـ `GOOGLE_SITE_VERIFICATION`.

---

## 4. DNS + Cloudflare

1. سجّل النطاق في [Cloudflare](https://dash.cloudflare.com).
2. حدّث nameservers في registrar.
3. أضف DNS records:
   - `A yourdomain.com → VPS_IP` (Proxied ✓)
   - `A api-ris.yourdomain.com → VPS_IP` (Proxied ✓) — إذا self-hosted Supabase
   - `A *.yourdomain.com → VPS_IP` (Proxied ✓) — للـ PR previews
4. إعدادات Cloudflare:
   - **SSL/TLS:** Full (Strict)
   - **Edge Certificates:** Always Use HTTPS ✓, HSTS ✓
   - **Speed → Optimization:** Brotli ✓, HTTP/3 ✓
   - **Security:** Bot Fight Mode ✓

---

## 5. VPS + Coolify (للنشر)

### المواصفات المطلوبة

| المكوّن | الحد الأدنى      | الموصى           |
| ------- | ---------------- | ---------------- |
| CPU     | 4 vCPU           | 8 vCPU           |
| RAM     | 8 GB             | 16 GB            |
| SSD     | 100 GB           | 200 GB           |
| OS      | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### خطوات التثبيت

```bash
# 1. تثبيت Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# 2. فتح Coolify UI
# http://YOUR_IP:8000 → إنشاء admin account

# 3. ربط GitHub
# Coolify → Sources → GitHub App → Install → اختر repo ris-platform

# 4. إنشاء Project + Application
# New Resource → Application → From GitHub → ris-platform → main → Dockerfile → Port 3000

# 5. إضافة متغيرات البيئة (القسم 3 أعلاه)

# 6. ربط النطاق
# Domain: yourdomain.com + www.yourdomain.com → Generate SSL ✓

# 7. أول Deploy
# Deploy → راقب logs → https://yourdomain.com
```

### Firewall

```bash
sudo ufw allow 22,80,443/tcp
sudo ufw enable
# Coolify UI: قيّد بـ Tailscale أو IP allowlist
```

---

## 6. Browser Extension (اختياري)

لإتاحة استيراد Google Scholar عبر الإضافة:

```bash
cd browser-extension
zip -r ../public/extension/ris-scholar-importer.zip . -x "*.DS_Store" "README.md"
```

ضع `ris-scholar-importer.zip` في `public/extension/`.

---

## 7. Python Pipelines (اختياري — Phase 15)

لتشغيل مزامنة المنشورات تلقائياً:

```bash
cd pipelines
pip install -e .

# متغيرات مطلوبة:
export SUPABASE_URL=https://...
export SUPABASE_SERVICE_KEY=...
export SCOPUS_API_KEY=...          # اختياري

# تشغيل يدوي:
python -m pipelines.jobs.openalex_sync
python -m pipelines.jobs.embed_researchers

# تشغيل عبر Prefect:
prefect server start
python -m pipelines.flows.daily
```

---

## 8. أول super_admin

بعد تطبيق الـ migrations وتسجيل الدخول لأول مرة عبر Google:

```sql
-- ابحث عن user_id الخاص بك
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- أضف نفسك كـ super_admin
INSERT INTO public.admins (user_id, role, created_by)
VALUES ('<your-user-id>', 'super_admin', '<your-user-id>');
```

بعدها يمكنك إدارة الباقي من `/admin`.

---

## 9. بيانات أولية (Seed Data)

الـ migrations تبذر تلقائياً:

- ✅ الأنواع (genders, academic_titles, workplace_types)
- ✅ مصادر المنشورات (scopus, wos, openalex, scholar, manual)
- ✅ أنواع المنشورات (journal, conference, book, etc.)
- ✅ أهداف SDG الـ 17

**يجب إضافتها يدوياً:**

- الكليات (`colleges`) — من لوحة الإدارة `/admin/colleges`
- الأقسام (`departments`) — من نفس الصفحة
- المراكز الجامعية (`university_centers`) — عبر SQL:
  ```sql
  INSERT INTO university_centers (name_en, name_ar, slug)
  VALUES ('Remote Sensing Center', 'مركز الاستشعار عن بعد', 'remote-sensing');
  ```
- سجلات الباحثين (`researchers`) — تُنشأ عبر:
  1. استيراد CSV عبر SQL
  2. أو يسجّل كل باحث بنفسه عبر Google OAuth (trigger يربطه تلقائياً)

---

## قائمة التحقق قبل الإطلاق

- [ ] Supabase مُعدّ ومتّصل
- [ ] Google OAuth يعمل (اختبر sign-in)
- [ ] Migrations مطبَّقة (كل 28+ ملف)
- [ ] RLS smoke test ينجح
- [ ] أول super_admin مُضاف
- [ ] كليات وأقسام مُضافة
- [ ] بعض الباحثين مُضافين (seed أو تسجيل)
- [ ] DNS يشير لـ VPS عبر Cloudflare
- [ ] SSL شهادة صالحة
- [ ] `NEXT_PUBLIC_SITE_URL` يشير للنطاق الحقيقي
- [ ] Sentry DSN موصول
- [ ] `sitemap.xml` يُرجع XML صالح
- [ ] `robots.txt` يعمل
- [ ] OG image يُرجع PNG عند الفتح
- [ ] IndexNow key file موجود في `/public/{key}.txt`
- [ ] Google Search Console مُتحقّق ومُقدَّم sitemap
