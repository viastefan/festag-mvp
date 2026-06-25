#!/usr/bin/env node
/**
 * Chrome Web Store upload package — manifest.json at ZIP root (CWS requirement).
 * Excludes dev-only install helpers; includes PRIVACY.md.
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const extDir = join(root, 'extension')
const outDir = join(root, 'public', 'downloads')
const outFile = join(outDir, 'festag-chrome-extension-store.zip')
const stageDir = join(outDir, '.store-stage')

const EXCLUDE = new Set([
  'INSTALLIEREN.html',
  'LESE-MICH.txt',
  'README.md',
  'manifest.safari.json',
  '.DS_Store',
])

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

rmSync(stageDir, { recursive: true, force: true })
mkdirSync(stageDir, { recursive: true })

for (const entry of readdirSync(extDir)) {
  if (EXCLUDE.has(entry)) continue
  cpSync(join(extDir, entry), join(stageDir, entry), { recursive: true })
}

// Store listing metadata for manual CWS dashboard paste
const listing = {
  name: 'Festag — Tagro Schreibhilfe',
  summary: 'Tagro verbessert deine Texte in jedem Eingabefeld — klarer, professioneller, kürzer.',
  category: 'Productivity',
  privacyPolicyUrl: 'https://festag.app/settings/privacy',
  homepageUrl: 'https://festag.app/download#chrome-extension',
  packageNote: 'Upload this ZIP in Chrome Developer Dashboard → Package → Upload new package',
}

cpSync(
  join(root, 'extension', 'store-listing.json'),
  join(stageDir, 'store-listing.json'),
  { force: true },
)

mkdirSync(outDir, { recursive: true })
rmSync(outFile, { force: true })

if (!hasCommand('zip')) {
  console.error('zip command not found')
  process.exit(1)
}

execSync(`cd "${stageDir}" && zip -r "${outFile}" . -x "*.DS_Store"`, { stdio: 'inherit' })
rmSync(stageDir, { recursive: true, force: true })

console.log(`Wrote ${outFile}`)
console.log('Upload in https://chrome.google.com/webstore/devconsole')
