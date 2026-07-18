#!/usr/bin/env npx tsx
/**
 * One-shot: provision Stefan Dev invite + send credentials email.
 *
 *   npx tsx scripts/send-stefan-dev-invite.ts
 *   npx tsx scripts/send-stefan-dev-invite.ts --resend-only
 *
 * Loads mail from .env.vercel.festag when present (never prints secrets).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { sendDevCredentialsEmail } from '../lib/email/send'
import { genDevPin } from '../lib/dev-provision'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PIN_FILE = resolve(root, '.local-dev-invite-pin.txt')
const resendOnly = process.argv.includes('--resend-only')

function loadEnvFile(path: string, overwrite = false) {
  try {
    const raw = readFileSync(path, 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (!m) continue
      const key = m[1].trim()
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (overwrite || !process.env[key]) process.env[key] = val
    }
  } catch { /* optional */ }
}

function parsePinFile(): { username: string; pin: string; to: string } | null {
  if (!existsSync(PIN_FILE)) return null
  const raw = readFileSync(PIN_FILE, 'utf8')
  const username = (raw.match(/^username=(.+)$/m) || [])[1]?.trim()
  const pin = (raw.match(/^pin=(.+)$/m) || [])[1]?.trim()
  const to = (raw.match(/^to=(.+)$/m) || [])[1]?.trim()
  if (!username || !pin || !to) return null
  return { username, pin, to }
}

async function main() {
  loadEnvFile(resolve(root, '.env.local'))
  loadEnvFile(resolve(root, '.env.vercel.festag'), true)
  loadEnvFile(resolve(root, '../New project/festag-mvp/.env.local'))
  // Prefer real local SMTP secret over Vercel-pulled [SENSITIVE] placeholders.
  loadEnvFile(resolve(root, '.env.local'), true)

  // Vercel currently stores a short FROM token — use the real mailbox for SMTP.
  process.env.FESTAG_MAIL_FROM = 'Festag <stefandirnberger@viawen.com>'
  process.env.FESTAG_MAIL_USER = 'stefandirnberger@viawen.com'
  process.env.FESTAG_MAIL_FOUNDER = 'stefandirnberger@viawen.com'

  const TO = process.env.DEV_INVITE_EMAIL || 'stefandirnberger@viawen.com'
  const USERNAME = 'stefan'
  const FULL_NAME = 'Stefan Dirnberger'
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://festag.app'
  const loginUrl = `${base}/dev/login?register=1&prefill=${encodeURIComponent(USERNAME)}&welcome=1`

  let pin: string
  let userId: string | undefined

  if (resendOnly) {
    const saved = parsePinFile()
    if (!saved) {
      console.error('No .local-dev-invite-pin.txt — run without --resend-only first')
      process.exit(1)
    }
    pin = saved.pin
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      console.error('Missing SUPABASE env')
      process.exit(1)
    }

    pin = genDevPin()
    const sb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: existing, error: findErr } = await sb
      .from('profiles')
      .select('id,email,dev_username,role,approval_status')
      .eq('dev_username', USERNAME)
      .maybeSingle()

    if (findErr) {
      console.error('lookup failed:', findErr.message)
      process.exit(1)
    }

    userId = existing?.id as string | undefined
    if (!userId) {
      const { data: byEmail } = await sb
        .from('profiles')
        .select('id')
        .ilike('email', TO)
        .maybeSingle()
      userId = byEmail?.id as string | undefined
    }

    if (!userId) {
      console.error('No profile found for stefan /', TO)
      process.exit(1)
    }

    const { error: updErr } = await sb.from('profiles').update({
      role: 'admin',
      approval_status: 'approved',
      access_mode: 'pool',
      dev_username: USERNAME,
      dev_pin: pin,
      dev_pin_setup_required: true,
      dev_workspace_name: null,
      full_name: FULL_NAME,
      first_name: 'Stefan',
      email: TO,
      onboarding_completed: true,
    }).eq('id', userId)

    if (updErr) {
      console.error('update failed:', updErr.message)
      process.exit(1)
    }

    const { data: verifyRows, error: verifyErr } = await sb.rpc('verify_dev_pin', {
      username_input: USERNAME,
      pin_input: pin,
    })
    if (verifyErr || !verifyRows?.length) {
      console.error('verify failed:', verifyErr?.message || 'no row')
      process.exit(1)
    }
    const row: any = Array.isArray(verifyRows) ? verifyRows[0] : verifyRows
    if (!row?.setup_required) {
      console.error('setup_required flag not set')
      process.exit(1)
    }

    writeFileSync(PIN_FILE, `username=${USERNAME}\npin=${pin}\nto=${TO}\n`, { mode: 0o600 })
  }

  const ionosKey = (process.env.FESTAG_MAIL_IONOS_KEY || '').trim()
  const ionosPlaceholder = !ionosKey || /^(?:\[?SENSITIVE\]?|redacted|changeme|xxx+)$/i.test(ionosKey)
  if (ionosPlaceholder) {
    console.error(
      'FESTAG_MAIL_IONOS_KEY missing or redacted. Put the real IONOS/1&1 SMTP password in .env.local. ' +
        'Mailbox inbox access (“mit 1&1 verbunden”) is not enough — the app needs SMTP auth. ' +
        'Then: npx tsx scripts/send-stefan-dev-invite.ts --resend-only',
    )
    process.exit(1)
  }

  const mailResult = await sendDevCredentialsEmail({
    to: TO,
    devName: FULL_NAME,
    username: USERNAME,
    pin,
    loginUrl,
    fromName: 'Festag',
  })

  if (!mailResult.ok) {
    console.error('MAIL_FAILED', mailResult.error)
    process.exit(2)
  }

  console.log(JSON.stringify({
    ok: true,
    username: USERNAME,
    email: TO,
    userId: userId || null,
    setup_required: true,
    subject: 'Festag Dev Panel — Zugang',
    loginUrl,
    mailMessageId: mailResult.messageId,
    mailed: true,
    resendOnly,
  }))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
