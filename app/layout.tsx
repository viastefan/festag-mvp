import './globals.css'
import type { Metadata, Viewport } from 'next'
import ThemeProvider from '@/components/ThemeProvider'
import LanguageProvider from '@/components/LanguageProvider'
import ServiceWorkerCleanup from '@/components/ServiceWorkerCleanup'
import AuthSessionMemory from '@/components/AuthSessionMemory'

const brandIconVersion = '20260722-start-enter'
const siteUrl = 'https://festag.app'
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Festag — AI-native Softwareproduktion',
  description: 'Kein Informationsverlust mehr. Die KI versteht, plant und liefert.',
  manifest: `/manifest.json?v=${brandIconVersion}`,
  applicationName: 'Festag',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Festag' },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: siteUrl,
    siteName: 'Festag',
    title: 'Festag — AI-native Softwareproduktion',
    description: 'Kein Informationsverlust mehr. Die KI versteht, plant und liefert.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Festag — AI-native Softwareproduktion',
    description: 'Kein Informationsverlust mehr. Die KI versteht, plant und liefert.',
  },
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    shortcut: [`/favicon.ico?v=${brandIconVersion}`],
    icon: [
      { url: `/brand/favicon.svg?v=${brandIconVersion}`, type: 'image/svg+xml' },
      { url: `/favicon.ico?v=${brandIconVersion}`, sizes: 'any' },
      { url: `/favicon-16.png?v=${brandIconVersion}`, sizes: '16x16', type: 'image/png' },
      { url: `/favicon-32.png?v=${brandIconVersion}`, sizes: '32x32', type: 'image/png' },
      { url: `/brand/favicon-16.png?v=${brandIconVersion}`, sizes: '16x16', type: 'image/png' },
      { url: `/brand/favicon-32.png?v=${brandIconVersion}`, sizes: '32x32', type: 'image/png' },
      { url: `/brand/favicon-48.png?v=${brandIconVersion}`, sizes: '48x48', type: 'image/png' },
      { url: `/brand/favicon-64.png?v=${brandIconVersion}`, sizes: '64x64', type: 'image/png' },
      { url: `/icon-192.png?v=${brandIconVersion}`, sizes: '192x192', type: 'image/png' },
      { url: `/icon-512.png?v=${brandIconVersion}`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: `/apple-touch-icon.png?v=${brandIconVersion}`, sizes: '180x180' },
      { url: `/brand/icon-152.png?v=${brandIconVersion}`, sizes: '152x152' },
    ],
  },
  formatDetection: { telephone: false, email: false },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="light" data-theme-surface="client" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Festag" />
        <link rel="shortcut icon" href={`/favicon.ico?v=${brandIconVersion}`} />
        <link rel="icon" type="image/svg+xml" href={`/brand/favicon.svg?v=${brandIconVersion}`} />
        <link rel="icon" href={`/favicon.ico?v=${brandIconVersion}`} sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href={`/favicon-16.png?v=${brandIconVersion}`} />
        <link rel="icon" type="image/png" sizes="32x32" href={`/favicon-32.png?v=${brandIconVersion}`} />
        <link rel="icon" type="image/png" sizes="16x16" href={`/brand/favicon-16.png?v=${brandIconVersion}`} />
        <link rel="icon" type="image/png" sizes="32x32" href={`/brand/favicon-32.png?v=${brandIconVersion}`} />
        <link rel="icon" type="image/png" sizes="48x48" href={`/brand/favicon-48.png?v=${brandIconVersion}`} />
        <link rel="icon" type="image/png" sizes="64x64" href={`/brand/favicon-64.png?v=${brandIconVersion}`} />
        <link rel="icon" type="image/png" sizes="192x192" href={`/icon-192.png?v=${brandIconVersion}`} />
        <link rel="icon" type="image/png" sizes="512x512" href={`/icon-512.png?v=${brandIconVersion}`} />
        <link rel="apple-touch-icon" href={`/apple-touch-icon.png?v=${brandIconVersion}`} />
        {/* Pre-paint theme + bg sync — eliminates white flash between auth pages */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){try{
  var path = window.location.pathname || '';
  var surface = path.indexOf('/dev') === 0 ? 'dev' : 'client';
  var key = surface === 'dev' ? 'festag_theme_dev' : 'festag_theme_client';
  var t = localStorage.getItem(key);
  if (!t) {
    var legacy = localStorage.getItem('festag_theme');
    if (legacy === 'magic-blue') legacy = 'dark';
    t = legacy || (surface === 'dev' ? 'dark' : 'light');
  }
  if (t === 'magic-blue') { t = 'dark'; }
  if (t === 'pure-light') t = 'light';
  if (t === 'classic-dark' || t === 'custom') t = 'dark';
  if (t !== 'light' && t !== 'dark' && t !== 'read') t = surface === 'dev' ? 'dark' : 'light';
  var attr = (t === 'read') ? 'read' : t;
  var authLanding = path === '/login' || path === '/register' || path === '/create-workspace' || path === '/onboarding' || path === '/enter' || path === '/dev/login' || path === '/dev/pending' || path.indexOf('/login/') === 0 || path.indexOf('/register/') === 0 || path.indexOf('/create-workspace/') === 0 || path.indexOf('/onboarding/') === 0 || path.indexOf('/enter/') === 0 || path.indexOf('/dev/login/') === 0 || path.indexOf('/dev/pending/') === 0;
  var docsLanding = path === '/docs' || path.indexOf('/docs/') === 0;
  var legalLanding = path === '/agb' || path === '/datenschutz' || path === '/nutzungsbedingungen' || path === '/impressum' || path === '/widerruf' || path === '/privacy' || path === '/terms' || path === '/terms-of-use' || path.indexOf('/agb/') === 0 || path.indexOf('/datenschutz/') === 0 || path.indexOf('/nutzungsbedingungen/') === 0 || path.indexOf('/impressum/') === 0 || path.indexOf('/widerruf/') === 0 || path.indexOf('/privacy/') === 0 || path.indexOf('/terms/') === 0 || path.indexOf('/terms-of-use/') === 0;
  // Legal docs are always-light — force data-theme=light (not only canvas bg).
  if (legalLanding) attr = 'light';
  document.documentElement.setAttribute('data-theme', attr);
  document.documentElement.setAttribute('data-theme-choice', t);
  document.documentElement.setAttribute('data-theme-surface', surface);
  var bg = legalLanding
    ? '#ffffff'
    : docsLanding
      ? (t === 'dark' ? '#000000' : t === 'read' ? '#F7F4EC' : '#FCFCFD')
    : t === 'dark'
      ? (authLanding ? '#0f0f11' : '#000000')
      : t === 'read'
        ? '#F7F4EC'
        : authLanding
          ? '#f7f8f8'
          : '#F5F5F7';
  document.documentElement.style.backgroundColor = bg;
  document.documentElement.style.colorScheme = legalLanding ? 'light' : (t === 'dark') ? 'dark' : 'light';
  if (authLanding) document.documentElement.setAttribute('data-auth-landing', '');
  else document.documentElement.removeAttribute('data-auth-landing');
  if (docsLanding) document.documentElement.setAttribute('data-docs-landing', '');
  else document.documentElement.removeAttribute('data-docs-landing');
  if (document.body) document.body.style.backgroundColor = bg;
  var lang = localStorage.getItem('festag_language');
  if (lang !== 'en' && lang !== 'de') lang = 'de';
  document.documentElement.lang = lang;
  document.documentElement.setAttribute('data-language', lang);
}catch(e){}})();
            `.trim(),
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: `
          /* Force scrollbar track always visible so content width never jumps
             when navigating between pages of different scroll height. */
          html { overflow-y: scroll; }
          html[data-theme="dark"]  { background:#000000; color-scheme:dark; }
          html[data-theme="read"]  { background:#F7F4EC; color-scheme:light; }
          html[data-theme="light"] { background:#F5F5F7; color-scheme:light; }
          html[data-theme="light"][data-auth-landing] { background:#f7f8f8; }
          html[data-theme="dark"][data-auth-landing] { background:#0f0f11; }
          html[data-theme="light"][data-docs-landing] { background:#FCFCFD; }
          html[data-theme="dark"][data-docs-landing] { background:#000000; }
          html[data-theme="read"][data-docs-landing] { background:#F7F4EC; }
          html[data-theme="dark"]  body { background:#000000; }
          html[data-theme="read"]  body { background:#F7F4EC; }
          html[data-theme="light"] body { background:#F5F5F7; }
          html[data-theme="light"][data-auth-landing] body { background:#f7f8f8; }
          html[data-theme="dark"][data-auth-landing] body { background:#0f0f11; }
          html[data-theme="light"][data-docs-landing] body { background:#FCFCFD; }
          html[data-theme="dark"][data-docs-landing] body { background:#000000; }
          html[data-theme="read"][data-docs-landing] body { background:#F7F4EC; }
        `}} />
      </head>
      <body>
        <ServiceWorkerCleanup />
        <AuthSessionMemory />
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
