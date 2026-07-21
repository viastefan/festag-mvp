import type { SupabaseClient } from '@supabase/supabase-js'

/** Extract an SSO domain from a work email or bare domain input. */
export function extractSsoDomain(input: string): string | null {
  const raw = String(input || '').trim().toLowerCase()
  if (!raw) return null

  let candidate = raw
  if (candidate.includes('@')) {
    const parts = candidate.split('@')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null
    candidate = parts[1]
  }

  candidate = candidate.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '')

  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(candidate)) {
    return null
  }

  return candidate
}

/** Live preview helper — returns domain when input is already valid enough. */
export function peekSsoDomain(input: string): string | null {
  return extractSsoDomain(input)
}

export type SsoDomainCheck = {
  configured: boolean
  /** false when the registry API was unreachable — caller may fall through to Supabase */
  lookupOk?: boolean
  domain?: string
  displayName?: string
  providerId?: string | null
  hasWorkspaceJoin?: boolean
  /** Prefer Firmen-SSO over Magic-Link/Google for this domain */
  enforceSso?: boolean
}

export async function checkSsoDomain(domainInput: string): Promise<SsoDomainCheck> {
  const domain = extractSsoDomain(domainInput)
  if (!domain) return { configured: false, lookupOk: true }

  try {
    const res = await fetch(`/api/auth/sso/check?domain=${encodeURIComponent(domain)}`, {
      credentials: 'same-origin',
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) return { configured: false, lookupOk: false, domain }
    return {
      configured: Boolean(data.configured),
      lookupOk: true,
      domain: data.domain || domain,
      displayName: data.displayName || domain,
      providerId: data.providerId ?? null,
      hasWorkspaceJoin: Boolean(data.hasWorkspaceJoin),
      enforceSso: Boolean(data.enforceSso),
    }
  } catch {
    return { configured: false, lookupOk: false, domain }
  }
}

export async function requestSsoSetup(payload: {
  domain: string
  workspaceId?: string | null
  workspaceName?: string | null
  idpHint?: string | null
  notes?: string | null
}): Promise<{ ok: boolean; message: string; alreadyActive?: boolean }> {
  try {
    const res = await fetch('/api/auth/sso/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        message: data?.message || 'Anfrage fehlgeschlagen. Bitte später erneut versuchen.',
      }
    }
    return {
      ok: true,
      alreadyActive: Boolean(data.alreadyActive),
      message: String(data.message || 'Anfrage gespeichert.'),
    }
  } catch {
    return { ok: false, message: 'Netzwerkproblem. Bitte erneut versuchen.' }
  }
}

export async function logSsoAttemptClient(payload: {
  domain?: string | null
  email?: string | null
  userId?: string | null
  outcome: 'started' | 'success' | 'failed' | 'domain_unknown'
  error?: string | null
}): Promise<void> {
  try {
    await fetch('/api/auth/sso/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    })
  } catch { /* audit only */ }
}

export function mapSsoError(raw?: string | null): string {
  const msg = String(raw || '').toLowerCase()
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Netzwerkproblem. Prüfe deine Verbindung und versuche es erneut.'
  }
  if (
    msg.includes('not found') ||
    msg.includes('no sso') ||
    msg.includes('provider') ||
    msg.includes('domain') ||
    msg.includes('sso_provider') ||
    msg.includes('unable to find')
  ) {
    return 'Für diese Domain ist noch kein SSO eingerichtet. Nutze Google oder E-Mail, oder kontaktiere dein Festag-Team.'
  }
  if (msg.includes('rate') || msg.includes('too many')) {
    return 'Zu viele Versuche. Bitte warte einen Moment.'
  }
  if (!msg) {
    return 'Für diese Domain ist noch kein SSO eingerichtet. Nutze Google oder E-Mail.'
  }
  return 'SSO ist gerade nicht verfügbar. Nutze Google oder E-Mail.'
}

type StartSsoResult =
  | { ok: true; url: string; displayName?: string }
  | { ok: false; error: string }

export async function startSsoLogin(params: {
  supabase: SupabaseClient
  domain: string
  email?: string | null
  redirectTo: string
  skipRegistryCheck?: boolean
}): Promise<StartSsoResult> {
  const domain = extractSsoDomain(params.domain)
  if (!domain) {
    return {
      ok: false,
      error: 'Bitte eine Arbeits-E-Mail oder Firmen-Domain eingeben (z. B. name@firma.de).',
    }
  }

  const check = params.skipRegistryCheck
    ? { configured: true, lookupOk: true, domain }
    : await checkSsoDomain(domain)

  // Soft-fail: if registry API is down, still try Supabase SAML.
  if (!check.configured && check.lookupOk !== false) {
    await logSsoAttemptClient({
      domain,
      email: params.email,
      outcome: 'domain_unknown',
    })
    return {
      ok: false,
      error: 'Für diese Domain ist noch kein SSO eingerichtet. Nutze Google oder E-Mail, oder kontaktiere dein Festag-Team.',
    }
  }

  try {
    const auth = params.supabase.auth as typeof params.supabase.auth & {
      signInWithSSO?: (args: {
        domain?: string
        providerId?: string
        options?: { redirectTo?: string }
      }) => Promise<{ data: { url?: string | null } | null; error: { message?: string } | null }>
    }

    if (typeof auth.signInWithSSO !== 'function') {
      return { ok: false, error: mapSsoError('sso_provider') }
    }

    await logSsoAttemptClient({
      domain,
      email: params.email,
      outcome: 'started',
    })

    const ssoArgs =
      check.configured && check.providerId
        ? { providerId: check.providerId, options: { redirectTo: params.redirectTo } }
        : { domain, options: { redirectTo: params.redirectTo } }

    const { data, error } = await auth.signInWithSSO(ssoArgs)

    if (error || !data?.url) {
      await logSsoAttemptClient({
        domain,
        email: params.email,
        outcome: 'failed',
        error: error?.message,
      })
      return { ok: false, error: mapSsoError(error?.message) }
    }

    return {
      ok: true,
      url: data.url,
      displayName: check.displayName || domain,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err || '')
    await logSsoAttemptClient({
      domain,
      email: params.email,
      outcome: 'failed',
      error: message,
    })
    return { ok: false, error: mapSsoError(message) }
  }
}

export function isSsoProvider(provider?: string | null): boolean {
  const p = String(provider || '').toLowerCase()
  if (!p) return false
  return p === 'sso' || p === 'saml' || p.includes('saml') || p.includes('sso')
}

export async function finishSsoSession(): Promise<{ ok: boolean; workspaceJoined?: boolean }> {
  try {
    const res = await fetch('/api/auth/sso/finish', {
      method: 'POST',
      credentials: 'include',
    })
    const data = await res.json().catch(() => null)
    return { ok: Boolean(res.ok && data?.ok), workspaceJoined: Boolean(data?.workspaceJoined) }
  } catch {
    return { ok: false }
  }
}
