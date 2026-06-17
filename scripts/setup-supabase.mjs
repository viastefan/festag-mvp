#!/usr/bin/env node
/**
 * Festag Supabase setup helper.
 * Usage: node scripts/setup-supabase.mjs
 *
 * 1. Validates .env.local keys
 * 2. Runs npm run check:supabase
 * 3. If Supabase CLI is logged in, pushes pending migrations
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts })
  return r.status ?? 1
}

console.log('\nFestag Supabase Setup\n')

if (!existsSync(resolve(root, '.env.local'))) {
  console.log('✗ .env.local fehlt — kopiere .env.local.example und trage Keys ein.')
  console.log('  Dashboard: https://supabase.com/dashboard/project/xsdkoepwuvpuroijjain/settings/api\n')
  process.exit(1)
}

console.log('→ Env prüfen (npm run check:supabase)…\n')
const check = run('npm', ['run', 'check:supabase'], { shell: true })
if (check !== 0) {
  console.log('\n⚠ Env-Check fehlgeschlagen.')
  console.log('  SUPABASE_SERVICE_ROLE_KEY muss ein JWT (eyJ…) aus Dashboard → API → service_role sein.\n')
}

const login = spawnSync('supabase', ['projects', 'list'], { cwd: root, encoding: 'utf8' })
const cliReady = login.status === 0

if (!cliReady) {
  console.log('Supabase CLI nicht eingeloggt.')
  console.log('  npm run supabase:login')
  console.log('  npm run supabase:link')
  console.log('  npm run db:push\n')
  process.exit(check === 0 ? 0 : 1)
}

console.log('→ Migrationen pushen (supabase db push)…\n')
const push = run('npm', ['run', 'db:push'], { shell: true })
if (push === 0) {
  console.log('\n✓ Migrationen angewendet. Nochmal prüfen: npm run check:supabase\n')
} else {
  console.log('\n✗ db:push fehlgeschlagen — siehe Ausgabe oben.\n')
  process.exit(1)
}
