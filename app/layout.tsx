import './globals.css'
import type { Metadata, Viewport } from 'next'
import ThemeProvider from '@/components/ThemeProvider'
import ServiceWorkerCleanup from '@/components/ServiceWorkerCleanup'

export const metadata: Metadata = {
  title: 'Festag — AI-native Softwareproduktion',
  description: 'Kein Informationsverlust mehr. Die KI versteht, plant und liefert.',
  manifest: '/manifest.json',
  applicationName: 'Festag',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Festag' },
  icons: {
    icon: '/brand/icon-192.png',
    apple: [
      { url: '/brand/apple-touch-icon.png', sizes: '180x180' },
      { url: '/brand/icon-152.png', sizes: '152x152' },
    ],
  },
  formatDetection: { telephone: false, email: false },
}

export const viewport: Viewport = {
  themeColor: '#181D1C',
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
        <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
        {/* Pre-paint theme + bg sync — eliminates white flash between auth pages */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){try{
  var t = localStorage.getItem('festag_theme');
  if (t !== 'light' && t !== 'dark') t = 'dark';
  document.documentElement.setAttribute('data-theme', t);
  var bg = t === 'dark' ? '#0F141B' : '#fcfcfd';
  document.documentElement.style.backgroundColor = bg;
  document.documentElement.style.colorScheme = t;
}catch(e){}})();
            `.trim(),
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: `
          html { scrollbar-gutter: stable both-edges; }
          html[data-theme="dark"]  { background:#0F141B; color-scheme:dark; }
          html[data-theme="light"] { background:#fcfcfd; color-scheme:light; }
          html[data-theme="dark"]  body { background:#0F141B; }
          html[data-theme="light"] body { background:#fcfcfd; }
        `}} />
      </head>
      <body>
        <ServiceWorkerCleanup />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
