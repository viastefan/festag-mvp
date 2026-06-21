#!/usr/bin/env node
/**
 * Provision PIN login for the Dev Panel (/dev/login).
 *
 * Usage:
 *   node scripts/provision-dev-access.mjs --username=stefan
 *   node scripts/provision-dev-access.mjs --username=stefan --email=you@example.com --pin=642021
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (JWT eyJ… from Supabase Dashboard).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (!m) continue
      const key = m[1].trim()
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* optional */ }
}

function arg(name) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : null
}

function genPin() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function slugUsername(input) {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'dev'
}

async function uniqueUsername(sb, base) {
  const root = slugUsername(base)
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? root : `${root}${Math.floor(10 + Math.random() * 90)}`
    const { data } = await sb.from('profiles').select('id').eq('dev_username', candidate).maybeSingle()
    if (!data) return candidate
  }
  return `${root}${Date.now().toString().slice(-4)}`
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const username = slugUsername(arg('username') || 'stefan')
const pin = (arg('pin') || genPin()).trim()
const email = arg('email')
const fullName = arg('name') || 'Stefan'
const role = arg('role') || 'admin'

if (!url || !serviceKey?.startsWith('eyJ')) {
  console.error('\n✗ SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local')
  console.error('  Dashboard → Settings → API → service_role (JWT eyJ…)\n')
  process.exit(1)
}

const sb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

console.log('\nFestag — Dev-Zugang provisionieren\n')

// Ensure RPC exists (migration may not be pushed yet)
const { error: rpcProbe } = await sb.rpc('verify_dev_pin', { username_input: '__probe__', pin_input: '000000' })
if (rpcProbe && /function.*does not exist/i.test(rpcProbe.message)) {
  console.error('✗ verify_dev_pin RPC fehlt in Supabase.')
  console.error('  Bitte Migration pushen: npm run db:push')
  console.error('  Oder SQL aus supabase/migrations/20260621_dev_pin_login.sql im SQL Editor ausführen.\n')
  process.exit(1)
}

let existing = null
const { data: byUsername } = await sb.from('profiles').select('*').eq('dev_username', username).maybeSingle()
existing = byUsername

if (!existing && email) {
  const { data: byEmail } = await sb.from('profiles').select('*').ilike('email', email.trim().toLowerCase()).maybeSingle()
  existing = byEmail
}

if (!existing) {
  const { data: byName } = await sb
    .from('profiles')
    .select('*')
    .or(`first_name.ilike.${username},full_name.ilike.${username}%`)
    .limit(1)
    .maybeSingle()
  existing = byName
}

let userId
let finalUsername = username

if (existing?.id) {
  userId = existing.id
  finalUsername = username
  const { error } = await sb.from('profiles').update({
    role,
    approval_status: 'approved',
    access_mode: existing.access_mode ?? 'pool',
    dev_username: finalUsername,
    dev_pin: pin,
    onboarding_completed: true,
    full_name: fullName,
    first_name: fullName.split(/\s+/)[0],
    ...(email && !existing.email ? { email: email.trim().toLowerCase() } : {}),
  }).eq('id', userId)
  if (error) {
    console.error('✗ Profil-Update fehlgeschlagen:', error.message)
    process.exit(1)
  }
  console.log('✓ Bestehendes Profil aktualisiert')
} else {
  userId = randomUUID()
  finalUsername = await uniqueUsername(sb, username)
  const { error } = await sb.from('profiles').insert({
    id: userId,
    email: email?.trim().toLowerCase() || `${finalUsername}@festag.dev`,
    full_name: fullName,
    first_name: fullName.split(/\s+/)[0],
    role,
    approval_status: 'approved',
    access_mode: 'pool',
    dev_username: finalUsername,
    dev_pin: pin,
    onboarding_completed: true,
  })
  if (error) {
    console.error('✗ Neues Profil konnte nicht angelegt werden:', error.message)
    console.error('  Tipp: --email=deine@mail.de angeben, falls ein Client-Profil existiert.\n')
    process.exit(1)
  }
  console.log('✓ Neues Dev-Profil angelegt')
}

// Verify login path
const { data: verifyRows, error: verifyErr } = await sb.rpc('verify_dev_pin', {
  username_input: finalUsername,
  pin_input: pin,
})
if (verifyErr || !verifyRows?.length) {
  console.error('✗ verify_dev_pin schlägt nach Provision fehl:', verifyErr?.message || 'no row')
  process.exit(1)
}

console.log('\n── Dev Panel Zugang ──')
console.log(`  URL:      ${process.env.NEXT_PUBLIC_APP_URL || 'https://festag.app'}/dev/login`)
console.log(`  User:     ${finalUsername}`)
console.log(`  PIN:      ${pin}`)
console.log(`  Rolle:    ${role}`)
console.log(`  User-ID:  ${userId}`)
console.log('\nPIN ist 6-stellig — bitte vollständig eingeben.\n')
