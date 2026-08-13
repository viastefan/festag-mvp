/**
 * One-off seed script — creates a client + a developer test account,
 * already joined into the same workspace, onboarding pre-completed so
 * both land straight in the (new) app instead of the onboarding flow.
 * Usage: node scripts/seed-test-accounts.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

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
  } catch {
    // optional
  }
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supa = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

function genPassword() {
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, 'x') + 'Aa1!'
}

async function findOrCreateUser(email, password, meta) {
  // Idempotent: reuse the account if this script already ran before.
  const { data: existing } = await supa.from('profiles').select('id,email').eq('email', email).maybeSingle()
  if (existing?.id) {
    console.log(`Existing user reused: ${email} (${existing.id})`)
    return { id: existing.id, password: null }
  }
  const { data, error } = await supa.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  })
  if (error) throw new Error(`createUser(${email}): ${error.message}`)
  console.log(`Created user: ${email} (${data.user.id})`)
  return { id: data.user.id, password }
}

async function main() {
  const clientEmail = 'client-test@festag.dev'
  const devEmail = 'dev-test@festag.dev'
  const clientPassword = genPassword()
  const devPassword = genPassword()

  const client = await findOrCreateUser(clientEmail, clientPassword, { full_name: 'Stefan (Test-Client)' })
  const dev = await findOrCreateUser(devEmail, devPassword, { full_name: 'Alex (Test-Dev)' })

  await supa.from('profiles').update({
    role: 'client',
    full_name: 'Stefan (Test-Client)',
    first_name: 'Stefan',
    onboarded: true,
    onboarding_completed: true,
    onboarding_step: 99,
  }).eq('id', client.id)

  await supa.from('profiles').update({
    role: 'dev',
    full_name: 'Alex (Test-Dev)',
    first_name: 'Alex',
    onboarded: true,
    onboarding_completed: true,
    onboarding_step: 99,
    dev_pin_setup_required: false,
  }).eq('id', dev.id)

  // Reuse an existing workspace owned by the client if the script already ran.
  const { data: existingWs } = await supa
    .from('workspaces')
    .select('id, slug, name')
    .eq('primary_owner_id', client.id)
    .eq('is_personal', true)
    .maybeSingle()

  let workspace = existingWs
  if (!workspace) {
    const { data: ws, error: wsErr } = await supa
      .from('workspaces')
      .insert({
        slug: `test-workspace-${Date.now()}`,
        name: 'Test Workspace',
        mode: 'delivery',
        primary_owner_id: client.id,
        is_personal: true,
      })
      .select('id, slug, name')
      .single()
    if (wsErr) throw new Error(`workspace insert: ${wsErr.message}`)
    workspace = ws
    console.log(`Created workspace: ${workspace.name} (${workspace.id})`)
  } else {
    console.log(`Existing workspace reused: ${workspace.name} (${workspace.id})`)
  }

  await supa.from('workspace_members').upsert(
    { workspace_id: workspace.id, user_id: client.id, role: 'owner' },
    { onConflict: 'workspace_id,user_id' },
  )
  await supa.from('workspace_members').upsert(
    { workspace_id: workspace.id, user_id: dev.id, role: 'festag_developer' },
    { onConflict: 'workspace_id,user_id' },
  )

  console.log('\n--- Test accounts ready ---')
  console.log('Client login:')
  console.log(`  email:    ${clientEmail}`)
  console.log(`  password: ${client.password || '(unchanged — account already existed)'}`)
  console.log('Developer login:')
  console.log(`  email:    ${devEmail}`)
  console.log(`  password: ${dev.password || '(unchanged — account already existed)'}`)
  console.log(`\nBoth joined into workspace "${workspace.name}" (${workspace.id}).`)
  console.log('Log in as either at /login — onboarding is pre-completed, both land in the app.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
