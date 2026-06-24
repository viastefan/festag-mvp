#!/usr/bin/env node
/**
 * Packages extension/ into public/downloads/festag-chrome-extension.zip
 * for sideload install via chrome://extensions.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const extDir = join(root, 'extension')
const outDir = join(root, 'public', 'downloads')
const outFile = join(outDir, 'festag-chrome-extension.zip')

if (!existsSync(extDir)) {
  console.error('extension/ folder not found')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

execSync(
  `cd "${extDir}" && zip -r "${outFile}" . -x "*.DS_Store"`,
  { stdio: 'inherit' },
)

console.log(`Wrote ${outFile}`)
