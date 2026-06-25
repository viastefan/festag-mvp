/** Festag Chrome extension — metadata shared by app + marketing site. */

export const FESTAG_CHROME_EXTENSION = {
  name: 'Festag — Tagro',
  shortName: 'Tagro Schreibhilfe',
  version: '0.2.3',
  description:
    'Tagro verbessert deine Texte überall im Browser. Plus Live-Feedback auf Projekt-Vorschauen.',
  downloadPath: '/downloads/festag-chrome-extension.zip',
  anchorId: 'chrome-extension',
  appDownloadPath: '/download#chrome-extension',
} as const

export const EXTENSION_PROMO_DISMISS_KEY = 'festag-extension-promo-dismissed'

export const CHROME_EXTENSION_INSTALL_STEPS = [
  {
    title: 'ZIP herunterladen und entpacken',
    detail: 'Doppelklick auf die ZIP. Es entsteht der Ordner festag-chrome-extension — nicht die ZIP-Datei selbst laden.',
  },
  {
    title: 'INSTALLIEREN.html öffnen',
    detail: 'Im entpackten Ordner die Datei INSTALLIEREN.html öffnen — dort alle Schritte mit Direktlinks.',
  },
  {
    title: 'Chrome-Erweiterungen öffnen',
    detail: 'chrome://extensions in der Adresszeile — oder den Button in INSTALLIEREN.html.',
  },
  {
    title: 'Entwicklermodus und Ordner laden',
    detail: 'Entwicklermodus an, dann „Entpackte Erweiterung laden“ und den Ordner festag-chrome-extension wählen.',
  },
  {
    title: 'Bei Festag anmelden',
    detail: 'Im selben Browser bei festag.app einloggen. Extension unter 🧩 anpinnen.',
  },
] as const

export function festagChromeExtensionDownloadUrl(origin = ''): string {
  const base = origin.replace(/\/$/, '')
  return `${base}${FESTAG_CHROME_EXTENSION.downloadPath}`
}

export function festagChromeExtensionAppUrl(origin = 'https://festag.app'): string {
  const base = origin.replace(/\/$/, '')
  return `${base}${FESTAG_CHROME_EXTENSION.appDownloadPath}`
}

export function isChromiumBrowser(userAgent: string): boolean {
  return /Chrome|Chromium|Edg\//i.test(userAgent) && !/Firefox/i.test(userAgent)
}
