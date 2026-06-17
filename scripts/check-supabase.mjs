#!/usr/bin/env node
/**
 * Supabase connectivity + security sanity check.
 * Usage: npm run check:supabase
 *
 * Reads .env.local (never prints secret values).
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

const env = { ...loadEnvFile(resolve(root, '.env')), ...loadEnvFile(resolve(root, '.env.local')) }
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim()

let failed = false
const ok = (m) => console.log(`  ✓ ${m}`)
const warn = (m) => console.log(`  ⚠ ${m}`)
const fail = (m) => { console.log(`  ✗ ${m}`); failed = true }

console.log('\nFestag Supabase Check\n')

// ── Env presence ────────────────────────────────────────────────
console.log('Environment:')
if (url?.startsWith('https://') && url.includes('.supabase.co')) ok(`URL set (${url})`)
else fail('NEXT_PUBLIC_SUPABASE_URL missing or invalid')

if (anon?.startsWith('eyJ')) ok(`Anon key set (${anon.length} chars, JWT)`)
else fail('NEXT_PUBLIC_SUPABASE_ANON_KEY missing or not a JWT')

if (!service) fail('SUPABASE_SERVICE_ROLE_KEY missing')
else if (service.startsWith('eyJ')) ok(`Service key set (${service.length} chars, JWT)`)
else {
  fail('SUPABASE_SERVICE_ROLE_KEY is not a JWT — use service_role secret from Supabase Dashboard → API')
  warn('Short sb_secret_* keys do not work for RPC writes (welcome, inbox fan-out)')
}

// ── Source code leak scan ───────────────────────────────────────
console.log('\nSource hygiene:')
const leaked = []
for (const rel of ['next.config.js', 'lib/supabase/client.ts', 'middleware.ts']) {
  const p = resolve(root, rel)
  if (!existsSync(p)) continue
  const c = readFileSync(p, 'utf8')
  if (c.includes('eyJhbGciOiJIUzI1Ni')) leaked.push(rel)
}
if (leaked.length) fail(`Hardcoded JWT found in: ${leaked.join(', ')}`)
else ok('No hardcoded Supabase JWTs in core config files')

// ── Live probes (read-only) ─────────────────────────────────────
if (url && anon) {
  console.log('\nConnectivity (anon):')
  for (const table of ['profiles', 'inbox_items', 'notifications']) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      })
      if (res.ok) ok(`${table} reachable (HTTP ${res.status})`)
      else fail(`${table} HTTP ${res.status}`)
    } catch (e) {
      fail(`${table}: ${e.message}`)
    }
  }
}

if (url && service?.startsWith('eyJ')) {
  console.log('\nMigration status:')
  try {
    const res = await fetch(
      `${url}/rest/v1/inbox_items?select=id&source_table=eq.notifications&limit=1`,
      { headers: { apikey: service, Authorization: `Bearer ${service}` } },
    )
    const rows = await res.json()
    if (Array.isArray(rows) && rows.length > 0) ok('Client notification mirror applied (inbox_items)')
    else warn('No mirrored client inbox_items — run: npm run db:push')

    const decRes = await fetch(`${url}/rest/v1/decisions?select=id&limit=1`, {
      headers: { apikey: service, Authorization: `Bearer ${service}` },
    })
    if (decRes.ok) ok('decisions table reachable (service role)')

    const rpc = await fetch(`${url}/rest/v1/rpc/decisions_tick`, {
      method: 'POST',
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    if (rpc.ok || rpc.status === 204) ok('decisions_tick RPC callable')
    else if (rpc.status === 404) warn('decisions_tick RPC missing — run: npm run db:push')
    else warn(`decisions_tick HTTP ${rpc.status}`)
  } catch (e) {
    warn(`Could not check migration: ${e.message}`)
  }
} else if (url && anon) {
  console.log('\nMigration status:')
  warn('Service role missing — skipping migration/RPC probes (npm run db:push needs service key)')
}

console.log('')
if (failed) {
  console.log('Result: FAILED — fix the items above before deploying.\n')
  process.exit(1)
}
console.log('Result: OK\n')
