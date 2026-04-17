# Deployment Guide — Coolify + Self-hosted Supabase

## Prerequisites

- VPS: 8 vCPU, 16 GB RAM, 200 GB SSD, Ubuntu 22.04 LTS
- Domain name pointed to VPS IP
- GitHub repo: `haydary1986/ris-platform`

## Step 1 — Install Coolify

```bash
ssh root@YOUR_VPS_IP

# Install
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Access Coolify UI
# Open http://YOUR_VPS_IP:8000 in browser
# Create admin account
```

## Step 2 — Firewall

```bash
sudo ufw allow 22,80,443/tcp
sudo ufw enable
```

## Step 3 — Connect GitHub

1. Coolify UI → **Sources** → **GitHub App** → Install
2. Select the `ris-platform` repository
3. Grant access

## Step 4 — Deploy Supabase

1. Coolify → **Resources** → **Deploy from template** → **Supabase**
2. Set environment variables:
   ```
   POSTGRES_PASSWORD=<openssl rand -hex 24>
   JWT_SECRET=<openssl rand -hex 24>
   SITE_URL=https://yourdomain.com
   API_EXTERNAL_URL=https://api-ris.yourdomain.com
   ```
3. Click **Deploy**
4. Wait for all services to be `Running`
5. Note the generated `ANON_KEY` and `SERVICE_ROLE_KEY`

## Step 5 — Apply Database Migrations

From your local machine:

```bash
# Connect to the Supabase PostgreSQL on your VPS
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_VPS_IP:5432/postgres"

# Apply all 30 migrations in order
for f in supabase/migrations/*.sql; do
  echo "Applying $f..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

# Verify RLS
psql "$DATABASE_URL" -f supabase/tests/rls_smoke.sql
```

Or paste each file manually in Coolify → Supabase → PostgreSQL → Terminal.

## Step 6 — Deploy Next.js App

1. Coolify → **New Resource** → **Application** → **From GitHub**
2. Select `ris-platform`, branch `main`
3. Build Pack: **Dockerfile**
4. Port: **3000**
5. Add environment variables:

```
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://api-ris.yourdomain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Step 4>
SUPABASE_SERVICE_ROLE_KEY=<from Step 4>
```

6. Domain: `yourdomain.com` + `www.yourdomain.com`
7. Enable **Generate SSL**
8. Enable **Auto Deploy** on push to main
9. Click **Deploy**

## Step 7 — DNS (Cloudflare)

1. Add domain to Cloudflare
2. Update nameservers at registrar
3. DNS records:
   - `A yourdomain.com → VPS_IP` (Proxied)
   - `A api-ris.yourdomain.com → VPS_IP` (Proxied)
4. SSL/TLS: **Full (Strict)**
5. Enable: Always HTTPS, HSTS, Brotli, HTTP/3

## Step 8 — Configure Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create OAuth 2.0 Client
2. Redirect URI: `https://api-ris.yourdomain.com/auth/v1/callback`
3. Supabase Studio → Authentication → Providers → Google → Enable → Paste keys
4. URL Configuration → Site URL: `https://yourdomain.com`
5. Redirect URLs: `https://yourdomain.com/auth/callback`

## Step 9 — First Admin

```sql
-- Connect to PostgreSQL
-- Sign in via Google first, then:
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;

INSERT INTO public.admins (user_id, role, created_by)
VALUES ('<your-user-id>', 'super_admin', '<your-user-id>');
```

## Step 10 — Verify

1. Open `https://yourdomain.com` → Landing page loads
2. Open `https://yourdomain.com/en/sign-in` → Google button works
3. Sign in → redirected to `/manage-profile`
4. Open `https://yourdomain.com/en/admin/setup` → Check service status
5. Open `https://yourdomain.com/robots.txt` → Rules visible
6. Open `https://yourdomain.com/sitemap.xml` → XML index
7. Open `https://yourdomain.com/api/health` → `{"status":"ok","db":true}`

## Step 11 — Optional Services

Configure these from `/admin/setup`:

- **Sentry** — error monitoring
- **ORCID** — publication import
- **Scopus** — publication import
- **Google Search Console** — SEO indexing
- **IndexNow** — Bing/Yandex fast indexing

## Step 12 — Python Pipelines (Optional)

```bash
# On the same VPS or a separate one:
cd pipelines
docker build -t ris-pipelines .
docker run -d --restart=unless-stopped \
  -e SUPABASE_URL=https://api-ris.yourdomain.com \
  -e SUPABASE_SERVICE_KEY=<service_role_key> \
  -e SCOPUS_API_KEY=<optional> \
  ris-pipelines
```

## Monitoring

- **Coolify UI** → container status, logs, resource usage
- **Sentry** → errors + performance
- **/api/health** → uptime monitoring (point UptimeRobot/BetterStack here)
- **Cloudflare** → analytics, WAF, rate limiting
