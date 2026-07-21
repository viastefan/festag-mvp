/**
 * Shared invite hardening helpers.
 */

import type { NextRequest } from 'next/server'

/** Hex invite tokens only — blocks PostgREST `.or()` filter injection. */
export function isSafeInviteToken(token: unknown): token is string {
  return typeof token === 'string' && /^[a-f0-9]{32,128}$/i.test(token)
}

/** Stricter than a loose `@` check — still allows common plus-addressing. */
export function isValidInviteEmail(email: string): boolean {
  if (!email || email.length > 254) return false
  if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) return false
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
    email,
  )
}

export function sanitizeInvitedName(raw: unknown): string | null {
  const s = String(raw ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
  return s || null
}

/**
 * Prefer configured app URL so invite links cannot be pointed at an attacker
 * origin via a spoofed Origin header.
 */
export function resolveInviteOrigin(req: NextRequest): string {
  const app = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_FESTAG_URL
  if (app) {
    try {
      return new URL(app).origin
    } catch { /* fall through */ }
  }
  const origin = req.headers.get('origin')
  if (origin) {
    try {
      const u = new URL(origin)
      if (u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        return u.origin
      }
    } catch { /* fall through */ }
  }
  return req.nextUrl.origin
}

/** Look up invite by token OR accept_token without filter injection. */
export async function findInviteByToken(
  svc: { from: (t: string) => any },
  token: string,
  columns: string,
) {
  if (!isSafeInviteToken(token)) return null

  const byToken = await svc
    .from('team_invites')
    .select(columns)
    .eq('token', token)
    .maybeSingle()
  if (byToken.data) return byToken.data

  const byAccept = await svc
    .from('team_invites')
    .select(columns)
    .eq('accept_token', token)
    .maybeSingle()
  return byAccept.data ?? null
}
