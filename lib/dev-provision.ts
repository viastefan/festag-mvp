import { randomUUID } from 'crypto'

export type DevProvisionInput = {
  username: string
  pin?: string
  email?: string | null
  fullName?: string | null
  role?: 'dev' | 'admin' | 'project_owner'
}

export type DevProvisionResult = {
  userId: string
  username: string
  pin: string
  created: boolean
  promoted: boolean
}

export function genDevPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function slugUsername(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'dev'
}

async function uniqueUsername(sb: any, base: string): Promise<string> {
  const root = slugUsername(base)
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? root : `${root}${Math.floor(10 + Math.random() * 90)}`
    const { data } = await sb.from('profiles').select('id').eq('dev_username', candidate).maybeSingle()
    if (!data) return candidate
  }
  return `${root}${Date.now().toString().slice(-4)}`
}

/**
 * Create or refresh PIN-based dev panel access (profiles.dev_username + dev_pin).
 * Requires service-role Supabase client.
 */
export async function provisionDevAccess(sb: any, input: DevProvisionInput): Promise<DevProvisionResult> {
  const username = slugUsername(input.username)
  const pin = (input.pin || genDevPin()).trim()
  const role = input.role ?? 'admin'
  const emailHint = input.email?.trim().toLowerCase() || null
  const fullName = input.fullName?.trim() || null

  let existing: any = null
  const { data: byUsername } = await sb
    .from('profiles')
    .select('id,email,role,full_name,first_name,dev_username,dev_pin,approval_status,access_mode')
    .eq('dev_username', username)
    .maybeSingle()
  existing = byUsername

  if (!existing && emailHint) {
    const { data: byEmail } = await sb
      .from('profiles')
      .select('id,email,role,full_name,first_name,dev_username,dev_pin,approval_status,access_mode')
      .ilike('email', emailHint)
      .maybeSingle()
    existing = byEmail
  }

  if (!existing) {
    const { data: byName } = await sb
      .from('profiles')
      .select('id,email,role,full_name,first_name,dev_username,dev_pin,approval_status,access_mode')
      .or(`first_name.ilike.${username},full_name.ilike.${username}*`)
      .limit(1)
      .maybeSingle()
    existing = byName
  }

  let created = false
  let promoted = false
  let userId: string

  if (existing?.id) {
    userId = existing.id as string
    promoted = existing.role !== role || existing.dev_username !== username || existing.dev_pin !== pin
    await sb.from('profiles').update({
      role,
      approval_status: 'approved',
      access_mode: existing.access_mode ?? 'pool',
      dev_username: username,
      dev_pin: pin,
      onboarding_completed: true,
      ...(fullName ? { full_name: fullName, first_name: fullName.split(/\s+/)[0] } : {}),
      ...(emailHint && !existing.email ? { email: emailHint } : {}),
    }).eq('id', userId)
  } else {
    userId = randomUUID()
    created = true
    const resolvedUsername = await uniqueUsername(sb, username)
    const firstName = fullName ? fullName.split(/\s+/)[0] : username
    const { error } = await sb.from('profiles').insert({
      id: userId,
      email: emailHint || `${resolvedUsername}@festag.dev`,
      full_name: fullName || firstName,
      first_name: firstName,
      role,
      approval_status: 'approved',
      access_mode: 'pool',
      dev_username: resolvedUsername,
      dev_pin: pin,
      onboarding_completed: true,
    })
    if (error) throw new Error(error.message)
    return { userId, username: resolvedUsername, pin, created, promoted: false }
  }

  return { userId, username, pin, created, promoted }
}
