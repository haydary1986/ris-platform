import type { Metadata } from 'next';
import { Inter, Cairo, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/seo/site';
import '../globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['arabic', 'latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'RIS — University of AL-Turath Researcher Directory',
    template: '%s · RIS',
  },
  description: 'Research Information System for the University of AL-Turath.',
  applicationName: 'RIS',
  authors: [{ name: 'University of AL-Turath' }],
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} ${cairo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__SUPABASE_CONFIG__=${JSON.stringify({
              url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
              anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            })}`,
          }}
        />
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Header />
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer />
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
