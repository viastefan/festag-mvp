import { randomInt, randomUUID } from 'crypto'

export type DevProvisionInput = {
  username: string
  pin?: string
  email?: string | null
  fullName?: string | null
  role?: 'dev' | 'admin' | 'project_owner'
  /**
   * When true, rotate PIN and force first-time setup again.
   * Default false: never overwrite an existing PIN (idempotent / safe).
   */
  rotatePin?: boolean
  /** Force the invite/setup flow flag. Defaults to true when rotating or creating. */
  setupRequired?: boolean
}

export type DevProvisionResult = {
  userId: string
  username: string
  pin: string
  created: boolean
  promoted: boolean
  rotated: boolean
}

/** Cryptographically strong 6-digit PIN (100000–999999). */
export function genDevPin(): string {
  return String(randomInt(100000, 1000000))
}

function slugUsername(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'dev'
}

async function uniqueUsername(sb: any, base: string): Promise<string> {
  const root = slugUsername(base)
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? root : `${root}${randomInt(10, 100)}`
    const { data } = await sb.from('profiles').select('id').eq('dev_username', candidate).maybeSingle()
    if (!data) return candidate
  }
  return `${root}${Date.now().toString().slice(-4)}`
}

/**
 * Create or update PIN-based Dev Panel access (profiles.dev_username + dev_pin).
 * Requires service-role Supabase client.
 *
 * Safety:
 * - Never deletes rows.
 * - Does not overwrite an existing PIN unless `rotatePin` or an explicit new `pin` is requested
 *   for a fresh invite — and even then only updates the targeted profile.
 */
export async function provisionDevAccess(sb: any, input: DevProvisionInput): Promise<DevProvisionResult> {
  const username = slugUsername(input.username)
  if (username.length < 2) throw new Error('invalid_username')

  const role = input.role ?? 'admin'
  const emailHint = input.email?.trim().toLowerCase() || null
  const fullName = input.fullName?.trim() || null
  const wantRotate = !!input.rotatePin || !!input.pin

  let existing: any = null
  let matchedByUsername = false
  const { data: byUsername } = await sb
    .from('profiles')
    .select('id,email,role,full_name,first_name,dev_username,dev_pin,approval_status,access_mode,dev_pin_setup_required')
    .eq('dev_username', username)
    .maybeSingle()
  if (byUsername) {
    existing = byUsername
    matchedByUsername = true
  }

  if (!existing && emailHint) {
    const { data: byEmail } = await sb
      .from('profiles')
      .select('id,email,role,full_name,first_name,dev_username,dev_pin,approval_status,access_mode,dev_pin_setup_required')
      .ilike('email', emailHint)
      .maybeSingle()
    existing = byEmail
  }

  // Soft name match only when creating a brand-new login — never reclaim an unrelated row
  // that already has a different completed Dev username.
  if (!existing && !emailHint) {
    const { data: byName } = await sb
      .from('profiles')
      .select('id,email,role,full_name,first_name,dev_username,dev_pin,approval_status,access_mode,dev_pin_setup_required')
      .is('dev_username', null)
      .or(`first_name.ilike.${username},full_name.ilike.${username}*`)
      .limit(1)
      .maybeSingle()
    existing = byName
  }

  let created = false
  let promoted = false
  let rotated = false
  let userId: string
  let finalUsername = username
  let pinOut: string

  if (existing?.id) {
    userId = existing.id as string
    finalUsername = (existing.dev_username as string) || username

    // If another username already owns this slot on a different meaning, keep their username
    // if present; only assign requested username when row has none.
    if (!existing.dev_username) {
      finalUsername = await uniqueUsername(sb, username)
    } else if (!matchedByUsername && existing.dev_username !== username) {
      // Matched by email/name — do not rename their login.
      finalUsername = existing.dev_username
    }

    const shouldRotate =
      wantRotate ||
      !existing.dev_pin ||
      (input.setupRequired === true && String(existing.dev_pin).length !== 6)

    pinOut = shouldRotate ? (input.pin || genDevPin()).trim() : String(existing.dev_pin)
    rotated = shouldRotate && pinOut !== String(existing.dev_pin || '')

    const setupRequired =
      input.setupRequired ??
      (rotated || !!existing.dev_pin_setup_required || !existing.dev_pin)

    promoted =
      existing.role !== role ||
      existing.dev_username !== finalUsername ||
      rotated

    const patch: Record<string, unknown> = {
      role: existing.role === 'admin' || existing.role === 'project_owner' ? existing.role : role,
      approval_status: 'approved',
      access_mode: existing.access_mode ?? 'pool',
      onboarding_completed: true,
      dev_username: finalUsername,
    }

    if (rotated || !existing.dev_pin) {
      patch.dev_pin = pinOut
      patch.dev_pin_setup_required = setupRequired
    } else if (input.setupRequired != null) {
      patch.dev_pin_setup_required = input.setupRequired
    }

    if (fullName) {
      patch.full_name = fullName
      patch.first_name = fullName.split(/\s+/)[0]
    }
    if (emailHint && !existing.email) patch.email = emailHint

    const { error } = await sb.from('profiles').update(patch).eq('id', userId)
    if (error) throw new Error(error.message)
  } else {
    userId = randomUUID()
    created = true
    rotated = true
    finalUsername = await uniqueUsername(sb, username)
    pinOut = (input.pin || genDevPin()).trim()
    const firstName = fullName ? fullName.split(/\s+/)[0] : username
    const { error } = await sb.from('profiles').insert({
      id: userId,
      email: emailHint || `${finalUsername}@festag.dev`,
      full_name: fullName || firstName,
      first_name: firstName,
      role,
      approval_status: 'approved',
      access_mode: 'pool',
      dev_username: finalUsername,
      dev_pin: pinOut,
      dev_pin_setup_required: input.setupRequired ?? true,
      onboarding_completed: true,
    })
    if (error) throw new Error(error.message)
  }

  return { userId, username: finalUsername, pin: pinOut, created, promoted, rotated }
}
