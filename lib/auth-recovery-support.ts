/**
 * Recovery support cooldown — Hybrid B:
 * After contacting support, the same email/device is locked for SUPPORT_COOLDOWN_MS.
 * After that, support is open again. Password / PIN reset stays always available.
 * Rows stay in auth_recovery_support for founder visibility; open rows are
 * auto-resolved when the cooldown ends so a new request can be recorded.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** 10 minutes */
export const SUPPORT_COOLDOWN_MS = 10 * 60 * 1000

export type RecoverySupportStatus = {
  alreadySent: boolean
  createdAt?: string | null
  /** Seconds until support may be used again (0 if open). */
  retryAfterSec: number
  availableAt?: string | null
}

function cooldownFromCreatedAt(createdAt: string | null | undefined): RecoverySupportStatus {
  if (!createdAt) {
    return { alreadySent: false, retryAfterSec: 0, createdAt: null, availableAt: null }
  }
  const createdMs = Date.parse(createdAt)
  if (!Number.isFinite(createdMs)) {
    return { alreadySent: false, retryAfterSec: 0, createdAt, availableAt: null }
  }
  const availableMs = createdMs + SUPPORT_COOLDOWN_MS
  const retryAfterSec = Math.max(0, Math.ceil((availableMs - Date.now()) / 1000))
  if (retryAfterSec <= 0) {
    return {
      alreadySent: false,
      retryAfterSec: 0,
      createdAt,
      availableAt: new Date(availableMs).toISOString(),
    }
  }
  return {
    alreadySent: true,
    retryAfterSec,
    createdAt,
    availableAt: new Date(availableMs).toISOString(),
  }
}

async function latestSupportRow(
  sb: SupabaseClient,
  emailNorm: string,
  deviceKey?: string | null,
): Promise<{ id?: string; created_at: string | null; resolved?: boolean } | null> {
  if (emailNorm) {
    const { data } = await (sb as any)
      .from('auth_recovery_support')
      .select('id,created_at,resolved')
      .eq('email_norm', emailNorm)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.created_at || data?.id) return data
  }

  if (deviceKey) {
    const { data } = await (sb as any)
      .from('auth_recovery_support')
      .select('id,created_at,resolved')
      .eq('device_key', deviceKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.created_at || data?.id) return data
  }

  return null
}

/** Clear unique open-email index so a new request can be inserted after cooldown. */
async function resolveExpiredOpenRows(
  sb: SupabaseClient,
  emailNorm: string,
  deviceKey?: string | null,
): Promise<void> {
  const now = new Date().toISOString()
  if (emailNorm) {
    await (sb as any)
      .from('auth_recovery_support')
      .update({ resolved: true, resolved_at: now })
      .eq('email_norm', emailNorm)
      .eq('resolved', false)
  }
  if (deviceKey) {
    await (sb as any)
      .from('auth_recovery_support')
      .update({ resolved: true, resolved_at: now })
      .eq('device_key', deviceKey)
      .eq('resolved', false)
  }
}

export async function getRecoverySupportStatus(
  sb: SupabaseClient,
  email: string,
  deviceKey?: string | null,
): Promise<RecoverySupportStatus> {
  const emailNorm = email.trim().toLowerCase()
  if (!emailNorm && !deviceKey) {
    return { alreadySent: false, retryAfterSec: 0 }
  }

  const row = await latestSupportRow(sb, emailNorm, deviceKey)
  if (!row) return { alreadySent: false, retryAfterSec: 0 }
  return cooldownFromCreatedAt(row.created_at)
}

export async function recordRecoverySupport(
  sb: SupabaseClient,
  opts: {
    email: string
    message: string
    page?: string | null
    deviceKey?: string | null
    userId?: string | null
  },
): Promise<
  | { ok: true; createdAt: string; retryAfterSec: number; availableAt: string }
  | {
      ok: false
      alreadySent: true
      createdAt?: string | null
      retryAfterSec: number
      availableAt?: string | null
    }
  | { ok: false; error: string }
> {
  const email = opts.email.trim().toLowerCase()
  if (!email) return { ok: false, error: 'email_required' }

  const existing = await getRecoverySupportStatus(sb, email, opts.deviceKey)
  if (existing.alreadySent) {
    return {
      ok: false,
      alreadySent: true,
      createdAt: existing.createdAt,
      retryAfterSec: existing.retryAfterSec,
      availableAt: existing.availableAt ?? null,
    }
  }

  // Cooldown elapsed (or first send) — free the unique open-email slot.
  await resolveExpiredOpenRows(sb, email, opts.deviceKey)

  const createdAt = new Date().toISOString()
  const payload = {
    email,
    device_key: opts.deviceKey || null,
    page: opts.page || null,
    message: opts.message,
    user_id: opts.userId || null,
    resolved: false,
    created_at: createdAt,
  }

  const { error } = await (sb as any).from('auth_recovery_support').insert(payload)

  if (error) {
    const msg = String(error.message || error)
    if (String(error.code) === '23505' || /duplicate|unique/i.test(msg)) {
      const again = await getRecoverySupportStatus(sb, email, opts.deviceKey)
      return {
        ok: false,
        alreadySent: true,
        createdAt: again.createdAt,
        retryAfterSec: again.retryAfterSec || Math.ceil(SUPPORT_COOLDOWN_MS / 1000),
        availableAt: again.availableAt ?? null,
      }
    }
    return { ok: false, error: msg }
  }

  const availableAt = new Date(Date.parse(createdAt) + SUPPORT_COOLDOWN_MS).toISOString()
  return {
    ok: true,
    createdAt,
    retryAfterSec: Math.ceil(SUPPORT_COOLDOWN_MS / 1000),
    availableAt,
  }
}
