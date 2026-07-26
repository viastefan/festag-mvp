#!/usr/bin/env node
/**
 * Safari Web Extension source package for Apple's converter.
 * Run on macOS: xcrun safari-web-extension-converter ./festag-safari-extension
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const extDir = join(root, 'extension')
const outDir = join(root, 'public', 'downloads')
const pkgName = 'festag-safari-extension'
const stageRoot = join(outDir, '.safari-stage')
const stageDir = join(stageRoot, pkgName)
const outFile = join(outDir, 'festag-safari-extension.zip')

const EXCLUDE = new Set(['INSTALLIEREN.html', 'LESE-MICH.txt', 'README.md', 'store-listing.json', '.DS_Store'])

function hasCommand(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

if (!existsSync(extDir)) {
  console.error('extension/ not found')
  process.exit(1)
}

rmSync(stageRoot, { recursive: true, force: true })
mkdirSync(stageDir, { recursive: true })

for (const entry of readdirSync(extDir)) {
  if (EXCLUDE.has(entry) || entry === 'manifest.safari.json') continue
  cpSync(join(extDir, entry), join(stageDir, entry), { recursive: true })
}

const safariManifest = join(extDir, 'manifest.safari.json')
if (existsSync(safariManifest)) {
  writeFileSync(join(stageDir, 'manifest.json'), readFileSync(safariManifest, 'utf8'))
}

writeFileSync(
  join(stageDir, 'SAFARI-INSTALL.txt'),
  `Festag Tagro — Safari Web Extension
=====================================

1. ZIP entpacken → Ordner "${pkgName}"
2. Terminal (macOS):

   xcrun safari-web-extension-converter "${pkgName}" \\
     --app-name "Festag Tagro" \\
     --bundle-identifier app.festag.tagro.safari \\
     --copy-resources

3. Xcode öffnet sich → Product → Run (lädt Extension in Safari)
4. Safari → Einstellungen → Erweiterungen → Festag Tagro aktivieren
5. Bei festag.app im selben Browser anmelden

Hinweis: Safari nutzt dieselbe Tagro-Oberfläche wie die Chrome-Erweiterung.
`,
  'utf8',
)

mkdirSync(outDir, { recursive: true })
rmSync(outFile, { force: true })

if (!hasCommand('zip')) {
  console.error('zip command not found')
  process.exit(1)
}

execSync(`cd "${stageRoot}" && zip -r "${outFile}" "${pkgName}" -x "*.DS_Store"`, { stdio: 'inherit' })
rmSync(stageRoot, { recursive: true, force: true })

console.log(`Wrote ${outFile}`)
console.log('On macOS: unzip and run safari-web-extension-converter (see SAFARI-INSTALL.txt)')
