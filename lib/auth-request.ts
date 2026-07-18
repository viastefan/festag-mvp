import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

/** Best-effort client IP (Vercel / proxies). Never trust alone for identity. */
export function getClientIp(req: NextRequest | Request): string {
  const h = (name: string) => req.headers.get(name) || ''
  const forwarded = h('x-forwarded-for').split(',')[0]?.trim()
  if (forwarded) return forwarded.slice(0, 64)
  const real = h('x-real-ip').trim()
  if (real) return real.slice(0, 64)
  return 'unknown'
}

export function normalizeUsername(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32)
}

export function normalizeEmail(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase().slice(0, 254)
}

/** Strip non-digits and cap at 6 — pair with isValidDevPin before accept. */
export function normalizePin(raw: unknown): string {
  return String(raw ?? '').replace(/\D/g, '').slice(0, 6)
}

/** Dev Panel invite / personal PIN: exactly 6 digits (`/^\d{6}$/`). */
export function isValidDevPin(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

/** Constant-time string compare for equal-length secrets. */
export function safeEqualStr(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'utf8')
    const bb = Buffer.from(b, 'utf8')
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

/**
 * Soft CSRF guard for cookie-mutating auth POSTs.
 * Allows same-origin browser calls; rejects cross-site form POSTs.
 * GET and non-browser (no Origin/Referer) still pass for extension/API clients.
 */
export function assertSameOriginOrNoOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  if (!origin && !referer) return null

  let incoming: string | null = null
  try {
    incoming = origin || (referer ? new URL(referer).origin : null)
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_origin' }, { status: 403 })
  }
  if (!incoming) return null

  const expected = req.nextUrl.origin
  if (incoming !== expected) {
    // Also allow configured production host when behind preview mismatch.
    const app = process.env.NEXT_PUBLIC_APP_URL
    if (app) {
      try {
        if (incoming === new URL(app).origin) return null
      } catch { /* ignore */ }
    }
    return NextResponse.json({ ok: false, error: 'csrf_rejected' }, { status: 403 })
  }
  return null
}

export function authErrorJson(
  status: number,
  error: string,
  message?: string,
  extra?: Record<string, unknown>,
): NextResponse {
  // Never attach stack traces or DB detail to clients.
  return NextResponse.json(
    { ok: false, error, ...(message ? { message } : {}), ...extra },
    { status },
  )
}

/**
 * Fail-fast 429 — never delays the response. Clients honor Retry-After.
 * Cap advertised wait at 120s for rate_limited (not lockout) so UI doesn’t
 * present multi-minute “wait” for burst windows; lockouts keep full duration.
 */
export function rateLimitResponse(retryAfterSec: number, locked = false): NextResponse {
  const advertised = locked ? Math.max(1, retryAfterSec) : Math.min(Math.max(1, retryAfterSec), 120)
  const res = authErrorJson(
    429,
    locked ? 'locked' : 'rate_limited',
    locked
      ? 'Zu viele Fehlversuche. Bitte später erneut versuchen.'
      : 'Zu viele Anfragen. Bitte später erneut versuchen.',
    { retry_after: advertised },
  )
  res.headers.set('Retry-After', String(advertised))
  return res
}
