/**
 * Durable once-per-identity tracking for „Zugang wiederfinden“ support.
 * Password / PIN reset paths must stay open when support was already used.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type RecoverySupportStatus = {
  alreadySent: boolean
  createdAt?: string | null
}

export async function getRecoverySupportStatus(
  sb: SupabaseClient,
  email: string,
  deviceKey?: string | null,
): Promise<RecoverySupportStatus> {
  const emailNorm = email.trim().toLowerCase()
  if (!emailNorm && !deviceKey) return { alreadySent: false }

  if (emailNorm) {
    const { data } = await (sb as any)
      .from('auth_recovery_support')
      .select('id,created_at')
      .eq('email_norm', emailNorm)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.id) {
      return { alreadySent: true, createdAt: data.created_at ?? null }
    }
  }

  if (deviceKey) {
    const { data } = await (sb as any)
      .from('auth_recovery_support')
      .select('id,created_at')
      .eq('device_key', deviceKey)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.id) {
      return { alreadySent: true, createdAt: data.created_at ?? null }
    }
  }

  return { alreadySent: false }
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
): Promise<{ ok: true } | { ok: false; alreadySent: true; createdAt?: string | null } | { ok: false; error: string }> {
  const email = opts.email.trim().toLowerCase()
  if (!email) return { ok: false, error: 'email_required' }

  const existing = await getRecoverySupportStatus(sb, email, opts.deviceKey)
  if (existing.alreadySent) {
    return { ok: false, alreadySent: true, createdAt: existing.createdAt }
  }

  const { error } = await (sb as any).from('auth_recovery_support').insert({
    email,
    device_key: opts.deviceKey || null,
    page: opts.page || null,
    message: opts.message,
    user_id: opts.userId || null,
    resolved: false,
  })

  if (error) {
    // Unique race → treat as already sent.
    if (String(error.code) === '23505' || /duplicate|unique/i.test(String(error.message))) {
      return { ok: false, alreadySent: true }
    }
    return { ok: false, error: String(error.message || error) }
  }

  return { ok: true }
}
