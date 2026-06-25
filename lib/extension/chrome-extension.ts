/** Festag Chrome extension — metadata shared by app + marketing site. */

export const FESTAG_CHROME_EXTENSION = {
  name: 'Festag — Tagro',
  shortName: 'Tagro Schreibhilfe',
  version: '0.2.0',
  description:
    'Tagro verbessert deine Texte überall im Browser. Plus Live-Feedback auf Projekt-Vorschauen.',
  downloadPath: '/downloads/festag-chrome-extension.zip',
  anchorId: 'chrome-extension',
  appDownloadPath: '/download#chrome-extension',
} as const

export const CHROME_EXTENSION_INSTALL_STEPS = [
  {
    title: 'ZIP herunterladen',
    detail: 'Die Erweiterung als Archiv speichern und in einen Ordner entpacken.',
  },
  {
    title: 'Chrome-Erweiterungen öffnen',
    detail: 'In Chrome die Adresszeile öffnen und chrome://extensions eingeben.',
  },
  {
    title: 'Entwicklermodus aktivieren',
    detail: 'Oben rechts den Schalter „Entwicklermodus“ einschalten.',
  },
  {
    title: 'Entpackte Erweiterung laden',
    detail: '„Entpackte Erweiterung laden“ wählen und den entpackten Ordner auswählen.',
  },
  {
    title: 'Bei Festag anmelden',
    detail: 'Im selben Browser bei festag.app einloggen — für Schreibhilfe und Live-Feedback.',
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
