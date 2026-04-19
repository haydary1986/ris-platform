FROM node:20-alpine AS deps
WORKDIR /app
# Pin npm to 11.x — the lockfile is generated against npm 11's peer
# resolver, and npm 10 (shipped with Node 20) rejects it with
# "Missing: @swc/helpers@0.5.21 from lock file".
RUN npm install -g npm@11
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_PUBLIC_SUPABASE_URL=https://api-ris.uoturath.edu.iq
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NjM4OTg4MCwiZXhwIjo0OTMyMDYzNDgwLCJyb2xlIjoiYW5vbiJ9.2hrE9SyjjqktVCmVitmR0w37uRln1kmdrkfVhX7qrak
ENV NEXT_PUBLIC_SITE_URL=https://ris.uoturath.edu.iq
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
