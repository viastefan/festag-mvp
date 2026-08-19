#!/usr/bin/env node
/**
 * Typ-Gate.
 *
 * `next build` ignoriert TS-Fehler (next.config.js: ignoreBuildErrors), ein grüner
 * Build sagt also nichts über Typen aus. Dieses Skript fährt `tsc --noEmit` und
 * vergleicht gegen einen eingefrorenen Altbestand: bekannte Fehler blockieren
 * nicht, neue schon.
 *
 * Baseline aktualisieren, wenn Altlasten behoben wurden:
 *   node scripts/check-types.mjs --update-baseline
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = join(root, 'scripts', 'type-baseline.json')
const update = process.argv.includes('--update-baseline')

function run() {
  try {
    execFileSync('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    })
    return ''
  } catch (err) {
    // tsc beendet mit != 0, sobald es Fehler gibt — die Ausgabe ist das Ergebnis.
    return `${err.stdout || ''}${err.stderr || ''}`
  }
}

/** Nur Datei + Regel, nicht Zeile/Spalte — sonst bricht jede Verschiebung das Gate. */
function fingerprints(output) {
  const found = new Map()
  for (const line of output.split('\n')) {
    const m = line.match(/^(.+?)\(\d+,\d+\): (error TS\d+):/)
    if (!m) continue
    const key = `${m[1]} ${m[2]}`
    found.set(key, (found.get(key) ?? 0) + 1)
  }
  return found
}

const current = fingerprints(run())

if (update) {
  writeFileSync(baselinePath, `${JSON.stringify(Object.fromEntries([...current].sort()), null, 2)}\n`)
  console.log(`Baseline geschrieben: ${current.size} bekannte Fehlerarten.`)
  process.exit(0)
}

const baseline = existsSync(baselinePath)
  ? new Map(Object.entries(JSON.parse(readFileSync(baselinePath, 'utf8'))))
  : new Map()

const regressions = []
for (const [key, count] of current) {
  const allowed = baseline.get(key) ?? 0
  if (count > allowed) regressions.push(`  ${key}  (${count}, erlaubt ${allowed})`)
}

const fixed = [...baseline.keys()].filter(k => !current.has(k))

if (regressions.length) {
  console.error('Neue Typfehler gegenüber der Baseline:\n' + regressions.join('\n'))
  console.error('\nDetails: npx tsc --noEmit -p tsconfig.json')
  process.exit(1)
}

console.log(`Typen ok — ${current.size} bekannte Fehlerarten, keine neuen.`)
if (fixed.length) {
  console.log(`${fixed.length} behoben. Baseline nachziehen: node scripts/check-types.mjs --update-baseline`)
}
