/**
 * POST /api/auth/recovery-options
 * Soft account-type probe for recovery UI (password vs PIN).
 * Unknown identities fall back to page variant defaults (no account leak).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  authErrorJson,
  getClientIp,
  normalizeEmail,
  normalizeUsername,
  rateLimitResponse,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

const LIMIT = { max: 20, windowMs: 15 * 60 * 1000 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEV_ROLES = new Set(['dev', 'admin', 'project_owner'])

export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const body = await req.json().catch(() => ({}))
  const email = normalizeEmail(body?.email)
  const username = normalizeUsername(body?.username)
  const hint = typeof body?.variant === 'string' ? body.variant : null

  if (!email && !username) {
    return NextResponse.json({
      ok: true,
      password: hint !== 'dev',
      pin: hint === 'dev',
      known: false,
    })
  }

  if (email && !EMAIL_RE.test(email)) {
    return authErrorJson(400, 'invalid_email', 'Bitte eine gültige E-Mail-Adresse eingeben.')
  }

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`recovery-opts:ip:${ip}`, LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)

  const service = getServiceClient()
  if (!service) {
    return NextResponse.json({
      ok: true,
      password: hint !== 'dev',
      pin: hint === 'dev',
      known: false,
    })
  }

  const sb = service as any
  let password = false
  let pin = false
  let known = false

  const applyProfile = (data: {
    id?: string
    role?: string | null
    dev_username?: string | null
  } | null) => {
    if (!data?.id) return
    known = true
    const role = String(data.role || '')
    const hasDevUser = Boolean(data.dev_username)

    if (role === 'client' || role === 'collaborator') {
      password = true
      pin = hasDevUser
      return
    }
    if (DEV_ROLES.has(role)) {
      pin = true
      // Admins may also use client password login.
      password = role === 'admin'
      return
    }
    password = true
  }

  if (username) {
    const { data } = await sb
      .from('profiles')
      .select('id,role,dev_username')
      .eq('dev_username', username)
      .limit(1)
      .maybeSingle()
    applyProfile(data)
  }

  if (email && !known) {
    const { data } = await sb
      .from('profiles')
      .select('id,role,dev_username')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()
    applyProfile(data)
  }

  if (!known) {
    password = hint !== 'dev'
    pin = hint === 'dev'
  }

  return NextResponse.json({ ok: true, password, pin, known })
}
