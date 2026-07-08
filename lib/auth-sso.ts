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
  | { ok: true; url: string }
  | { ok: false; error: string }

export async function startSsoLogin(params: {
  supabase: SupabaseClient
  domain: string
  redirectTo: string
}): Promise<StartSsoResult> {
  const domain = extractSsoDomain(params.domain)
  if (!domain) {
    return {
      ok: false,
      error: 'Bitte eine Arbeits-E-Mail oder Firmen-Domain eingeben (z. B. name@firma.de).',
    }
  }

  try {
    const auth = params.supabase.auth as typeof params.supabase.auth & {
      signInWithSSO?: (args: {
        domain: string
        options?: { redirectTo?: string }
      }) => Promise<{ data: { url?: string | null } | null; error: { message?: string } | null }>
    }

    if (typeof auth.signInWithSSO !== 'function') {
      return { ok: false, error: mapSsoError('sso_provider') }
    }

    const { data, error } = await auth.signInWithSSO({
      domain,
      options: { redirectTo: params.redirectTo },
    })

    if (error || !data?.url) {
      return { ok: false, error: mapSsoError(error?.message) }
    }

    return { ok: true, url: data.url }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err || '')
    return { ok: false, error: mapSsoError(message) }
  }
}

export function isSsoProvider(provider?: string | null): boolean {
  const p = String(provider || '').toLowerCase()
  if (!p) return false
  return p === 'sso' || p === 'saml' || p.includes('saml') || p.includes('sso')
}
