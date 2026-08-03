#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'node:module'

function loadEnv() {
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
}

loadEnv()

const email = process.argv[2] || 'dirnbergerstefan8+qa20260802@gmail.com'
const kind = process.argv[3] === 'signup' ? 'signup' : 'login'

async function main() {
  // Dynamic import of TS email module via tsx register isn't available;
  // call production OTP endpoint instead — real registration path.
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://festag.app'
  const res = await fetch(`${origin}/api/auth/otp/request`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin,
    },
    body: JSON.stringify({
      email,
      kind,
      resend: kind === 'login',
      next: '/dashboard',
    }),
  })
  const body = await res.json().catch(() => ({}))
  console.log('HTTP', res.status, body)

  // Also print fresh OTP from admin for immediate login without inbox.
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${origin}/auth/callback?next=/dashboard` },
  })
  if (error) {
    console.error('generateLink', error.message)
    return
  }
  const props = data?.properties || data
  console.log('fresh_otp', props?.email_otp)
  console.log('magic_link', props?.action_link)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
