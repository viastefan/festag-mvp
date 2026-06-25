#!/usr/bin/env node
/**
 * Packages extension/ into public/downloads/festag-chrome-extension.zip
 *
 * The ZIP contains a single root folder `festag-chrome-extension/` so users
 * can unzip and load that folder in chrome://extensions (not the .zip itself).
 */
import { execSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  readdirSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const extDir = join(root, 'extension')
const brandDir = join(root, 'public', 'brand')
const outDir = join(root, 'public', 'downloads')
const outFile = join(outDir, 'festag-chrome-extension.zip')
const pkgName = 'festag-chrome-extension'
const stageRoot = join(outDir, '.extension-stage')
const stageDir = join(stageRoot, pkgName)

if (!existsSync(extDir)) {
  console.error('extension/ folder not found')
  process.exit(1)
}

function copyIcons(targetIconsDir) {
  mkdirSync(targetIconsDir, { recursive: true })
  const map = [
    ['favicon-16.png', 'icon-16.png', null],
    ['favicon-32.png', 'icon-32.png', null],
    ['favicon-48.png', 'icon-48.png', null],
    ['icon-192.png', 'icon-128.png', '128'],
  ]
  for (const [srcName, destName, resize] of map) {
    const src = join(brandDir, srcName)
    const dest = join(targetIconsDir, destName)
    if (!existsSync(src)) {
      console.warn(`Missing brand icon: ${srcName}`)
      continue
    }
    if (resize) {
      execSync(`sips -z ${resize} ${resize} "${src}" --out "${dest}"`, { stdio: 'pipe' })
    } else {
      cpSync(src, dest)
    }
  }
}

// Keep dev folder icons in sync for "load unpacked" from extension/.
copyIcons(join(extDir, 'icons'))

rmSync(stageRoot, { recursive: true, force: true })
mkdirSync(stageDir, { recursive: true })

for (const entry of readdirSync(extDir)) {
  if (entry === '.DS_Store') continue
  cpSync(join(extDir, entry), join(stageDir, entry), { recursive: true })
}

copyIcons(join(stageDir, 'icons'))
mkdirSync(outDir, { recursive: true })
rmSync(outFile, { force: true })

execSync(
  `cd "${stageRoot}" && zip -r "${outFile}" "${pkgName}" -x "*.DS_Store"`,
  { stdio: 'inherit' },
)

rmSync(stageRoot, { recursive: true, force: true })

console.log(`Wrote ${outFile}`)
console.log(`Unzip → open ${pkgName}/INSTALLIEREN.html → load folder in chrome://extensions`)
