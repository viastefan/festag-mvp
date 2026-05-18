import './globals.css'
import type { Metadata, Viewport } from 'next'
import ThemeProvider from '@/components/ThemeProvider'
import ServiceWorkerCleanup from '@/components/ServiceWorkerCleanup'
import AuthSessionMemory from '@/components/AuthSessionMemory'

export const metadata: Metadata = {
  title: 'Festag — AI-native Softwareproduktion',
  description: 'Kein Informationsverlust mehr. Die KI versteht, plant und liefert.',
  manifest: '/manifest.json',
  applicationName: 'Festag',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Festag' },
  icons: {
    icon: [
      { url: '/brand/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/apple-touch-icon.png', sizes: '180x180' },
      { url: '/brand/icon-152.png', sizes: '152x152' },
    ],
  },
  formatDetection: { telephone: false, email: false },
}

export const viewport: Viewport = {
  themeColor: '#0F141B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Festag" />
        <link rel="icon" type="image/png" sizes="16x16" href="/brand/favicon-16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/brand/icon-192.png" />
        <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
        {/* Pre-paint theme + bg sync — eliminates white flash between auth pages */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){try{
  var t = localStorage.getItem('festag_theme');
  if (t === 'magic-blue') { t = 'dark'; try { localStorage.setItem('festag_theme','dark'); } catch(_){} }
  if (t !== 'light' && t !== 'dark' && t !== 'read') t = 'dark';
  var attr = (t === 'read') ? 'read' : t;
  document.documentElement.setAttribute('data-theme', attr);
  var bg = t === 'dark' ? '#0F141B' : t === 'read' ? '#F7F4EC' : '#F6F9FC';
  document.documentElement.style.backgroundColor = bg;
  document.documentElement.style.colorScheme = (t === 'dark') ? 'dark' : 'light';
}catch(e){}})();
            `.trim(),
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: `
          /* Force scrollbar track always visible so content width never jumps
             when navigating between pages of different scroll height. */
          html { overflow-y: scroll; }
          html[data-theme="dark"]  { background:#0F141B; color-scheme:dark; }
          html[data-theme="read"]  { background:#F7F4EC; color-scheme:light; }
          html[data-theme="light"] { background:#F6F9FC; color-scheme:light; }
          html[data-theme="dark"]  body { background:#0F141B; }
          html[data-theme="read"]  body { background:#F7F4EC; }
          html[data-theme="light"] body { background:#F6F9FC; }
        `}} />
      </head>
      <body>
        <ServiceWorkerCleanup />
        <AuthSessionMemory />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
