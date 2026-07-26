/** Festag Safari Web Extension — metadata for app + settings. */

export const SAFARI_EXTENSION_INSTALL_STEPS = [
  {
    title: 'Quellpaket entpacken',
    detail: 'Ordner festag-safari-extension — enthält manifest.json und SAFARI-INSTALL.txt.',
  },
  {
    title: 'Apple Converter ausführen',
    detail: 'xcrun safari-web-extension-converter festag-safari-extension --app-name "Festag Tagro" --bundle-identifier app.festag.tagro.safari --copy-resources',
  },
  {
    title: 'In Xcode bauen und starten',
    detail: 'Product → Run lädt die Extension in Safari zum Testen.',
  },
  {
    title: 'In Safari aktivieren',
    detail: 'Safari → Einstellungen → Erweiterungen → Festag Tagro einschalten.',
  },
  {
    title: 'Bei Festag anmelden',
    detail: 'festag.app im selben Browser — Tagro nutzt deine Session.',
  },
] as const

export const FESTAG_SAFARI_EXTENSION = {
  name: 'Tagro für Safari',
  version: '0.8.0',
  description:
    'Dieselbe Tagro-Schreibhilfe wie in Chrome — für Safari auf dem Mac via Apple Web Extension Converter.',
  downloadPath: '/downloads/festag-safari-extension.zip',
  bundleId: 'app.festag.tagro.safari',
  minSafariVersion: '16.4',
  installSteps: SAFARI_EXTENSION_INSTALL_STEPS,
} as const

export function isSafariBrowser(userAgent: string): boolean {
  return /^((?!chrome|android|crios|fxios).)*safari/i.test(userAgent)
}

export function festagSafariExtensionDownloadUrl(origin = ''): string {
  const base = origin.replace(/\/$/, '')
  return `${base}${FESTAG_SAFARI_EXTENSION.downloadPath}`
}
