/**
 * Dev-session token — bridges PIN login to server APIs.
 *
 * Why this exists: developers sign in to /dev with username + PIN
 * (verify_dev_pin RPC). That flow never creates a Supabase auth session,
 * so every API route that relied on `auth.getUser()` answered
 * "unauthenticated" for PIN-logged-in devs. This module mints a compact
 * HMAC-signed token at PIN login (set as an httpOnly cookie) and lets
 * server routes verify it as a fallback identity.
 *
 * Token format:  v1.<base64url(JSON payload)>.<base64url(hmac-sha256)>
 * Payload:       { uid, role, exp }   exp = unix ms
 *
 * Secret: DEV_SESSION_SECRET, falling back to the service-role key (both
 * server-only). Tokens are 12h, matching the localStorage session.
 */

import { createHmac, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

export const DEV_TOKEN_COOKIE = 'festag_dev_token'
export const DEV_TOKEN_TTL_MS = 1000 * 60 * 60 * 12

type DevTokenPayload = { uid: string; role: string; exp: number }

function secret(): string | null {
  return process.env.DEV_SESSION_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || null
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

export function signDevToken(uid: string, role: string): string | null {
  const key = secret()
  if (!key) return null
  const payload: DevTokenPayload = { uid, role, exp: Date.now() + DEV_TOKEN_TTL_MS }
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  const mac = b64url(createHmac('sha256', key).update(`v1.${body}`).digest())
  return `v1.${body}.${mac}`
}

export function verifyDevToken(token: string | undefined | null): DevTokenPayload | null {
  if (!token) return null
  const key = secret()
  if (!key) return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return null
  const expected = createHmac('sha256', key).update(`v1.${parts[1]}`).digest()
  const given = fromB64url(parts[2])
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const payload = JSON.parse(fromB64url(parts[1]).toString('utf8')) as DevTokenPayload
    if (!payload?.uid || !payload.exp || Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

/**
 * Unified API identity: Supabase cookie session first (clients, OAuth
 * devs), then the PIN dev token. Use this in /api/dev/* routes so PIN
 * logins stop hitting 'unauthenticated'.
 */
export async function getApiUser(req: NextRequest | Request): Promise<{ id: string; role?: string } | null> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supa = createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (user) return { id: user.id }
  } catch { /* fall through to dev token */ }
  return getDevUserFromRequest(req)
}

/**
 * Pulls a verified dev identity from the request — Authorization bearer
 * first (extension / programmatic), then the httpOnly cookie (browser).
 */
export function getDevUserFromRequest(req: NextRequest | Request): { id: string; role: string } | null {
  const authz = req.headers.get('authorization') || ''
  const bearer = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : null
  let token = bearer
  if (!token) {
    const cookieHeader = req.headers.get('cookie') || ''
    const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${DEV_TOKEN_COOKIE}=([^;]+)`))
    token = m ? decodeURIComponent(m[1]) : null
  }
  const payload = verifyDevToken(token)
  return payload ? { id: payload.uid, role: payload.role } : null
}
