#!/usr/bin/env node
/**
 * Festag OS (Phase 1) test account — confirmed email, onboarded, NO workspace.
 * Lands on /overview after login.
 *
 *   node scripts/provision-os-qa.mjs
 *   node scripts/provision-os-qa.mjs --email=you+os@gmail.com
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

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
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : null
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://festag.app'
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const email = arg('email') || `dirnbergerstefan8+os${stamp}@gmail.com`
const password = arg('password') || `FestagOs!${randomBytes(4).toString('hex')}`
const fullName = arg('name') || 'Stefan Overview'
const now = new Date().toISOString()

if (!url || !serviceKey?.startsWith('eyJ')) {
  console.error('✗ SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local')
  process.exit(1)
}

const sb = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let userId = null
{
  const { data: listed } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
  const existing = listed?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    userId = existing.id
    await sb.auth.admin.updateUserById(userId, {
      email_confirm: true,
      password,
      user_metadata: { ...(existing.user_metadata || {}), full_name: fullName },
    })
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (error) {
      console.error('✗ createUser:', error.message)
      process.exit(1)
    }
    userId = data.user.id
  }
}

await sb.from('profiles').upsert(
  {
    id: userId,
    email,
    full_name: fullName,
    first_name: fullName.split(/\s+/)[0] || 'Stefan',
    onboarded: true,
    onboarding_completed: true,
    updated_at: now,
  },
  { onConflict: 'id' },
)

await sb.from('onboarding_state').upsert(
  {
    user_id: userId,
    completed_at: now,
    workspace_done: false,
    current_step: 'done',
    updated_at: now,
  },
  { onConflict: 'user_id' },
)

{
  const { data: owned } = await sb.from('workspaces').select('id').eq('primary_owner_id', userId)
  for (const w of owned || []) {
    await sb.from('workspace_members').delete().eq('workspace_id', w.id)
    await sb.from('workspaces').delete().eq('id', w.id)
  }
  await sb.from('workspace_members').delete().eq('user_id', userId)
  await sb.from('project_members').delete().eq('user_id', userId)
}

const { data, error } = await sb.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: { redirectTo: `${origin}/auth/callback?next=/overview` },
})
if (error) {
  console.error('✗ generateLink:', error.message)
  process.exit(1)
}
const props = data?.properties || data

console.log('\n=== FESTAG OS TEST ACCOUNT (no workspace) ===')
console.log('Email:     ', email)
console.log('Password:  ', password)
console.log('OTP:       ', props?.email_otp)
console.log('Magic link:', props?.action_link)
console.log('Expect:    ', `${origin}/overview`)
console.log('============================================\n')
