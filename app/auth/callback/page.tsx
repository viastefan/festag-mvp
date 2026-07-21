'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import FestagLoader from '@/components/FestagLoader'
import AuthBrandLogo from '@/components/AuthBrandLogo'
import { createClient } from '@/lib/supabase/client'
import { rememberFestagAccount, type FestagLoginMethod } from '@/lib/auth-device-memory'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'
import { isSsoProvider, finishSsoSession } from '@/lib/auth-sso'
import {
  getPendingWorkspaceName,
  normalizeWorkspaceName,
  setPendingWorkspaceName,
} from '@/lib/pending-workspace'
import { bootstrapPersonalWorkspace } from '@/lib/workspace-bootstrap-client'

type OtpType = 'email' | 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change'

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/loading'
  return value
}

function inferMethod(user: any): FestagLoginMethod {
  const p = user?.app_metadata?.provider as string | undefined
  if (p === 'google') return 'google'
  if (p === 'github') return 'github'
  if (p === 'apple') return 'apple'
  if (isSsoProvider(p)) return 'sso'
  return 'email'
}

function hashParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.hash.replace(/^#/, ''))
}

function errorTarget(message = 'auth_failed') {
  return `/login?error=${encodeURIComponent(message)}`
}

type Mode = 'auto' | 'confirm' | 'verifying' | 'error'

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const ranRef = useRef(false)
  const [mode, setMode] = useState<Mode>('auto')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const supabase = createClient()
    const next = safeRedirectPath(params?.get('next'))

    async function finishAuthenticatedSession(opts?: { forceNext?: string }) {
      const dest = opts?.forceNext || next
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error('missing_session')

      // Password-recovery sessions must land on the reset form — never portal routing.
      if (dest.startsWith('/auth/reset-password')) {
        rememberFestagAccount({
          userId: user.id,
          email: user.email ?? null,
          method: inferMethod(user),
          onboardingCompleted: false,
        })
        try {
          if (user.email) {
            localStorage.setItem('festag_last_email', user.email)
            localStorage.setItem('festag_last_method', 'email')
          }
        } catch { /* ignore */ }
        router.replace('/auth/reset-password')
        return
      }

      // Ensure onboarding_state exists for this user.
      await supabase
        .from('onboarding_state')
        .upsert({ user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

      // GitHub-Identitätsfelder synchronisieren — die Rolle hängt davon ab,
      // welcher Login-Pfad benutzt wurde:
      //
      //   • `next` startet mit `/dev`  → Developer-Intent. Brandneuer Account
      //                                  oder bestehender Client wird auf
      //                                  pending_developer geflaggt, weil
      //                                  diese Person sich bewusst als Dev
      //                                  identifiziert.
      //   • alles andere (`/dashboard`, `/onboarding`, kein next)
      //                                → reiner Identity-Link. GitHub-Felder
      //                                  werden gespeichert, die `role`
      //                                  bleibt unverändert. Ein Client der
      //                                  versehentlich „mit GitHub einloggen"
      //                                  klickt verliert nicht seinen
      //                                  Client-Status.
      //   • bereits dev/admin/project_owner → niemals downgraden.
      const provider = user.app_metadata?.provider as string | undefined
      const isDevPath = next.startsWith('/dev')

      // Dev OAuth claim — stamps linked flags on the PIN profile (by email)
      // and surfaces invite setup so we don't skip needs_register.
      let oauthNeedsRegister: { username: string | null; workspace_name: string | null } | null = null
      if (isDevPath && (provider === 'google' || provider === 'github' || provider === 'apple' || provider === 'email' || !provider)) {
        try {
          const claimRes = await fetch('/api/dev/claim-oauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ provider: provider || 'email' }),
          })
          const claim = await claimRes.json().catch(() => null)
          if (claim?.ok && claim.needs_register) {
            oauthNeedsRegister = {
              username: claim.username || null,
              workspace_name: claim.workspace_name || null,
            }
          }
        } catch { /* fall through to local upsert */ }
      }

      if (provider === 'github') {
        try {
          const meta = (user.user_metadata ?? {}) as Record<string, any>
          const { data: existing } = await supabase
            .from('profiles')
            .select('id,role,approval_status')
            .eq('id', user.id)
            .maybeSingle()
          const ghUserId = meta.provider_id || meta.sub || null
          const patch: Record<string, any> = {
            id: user.id,
            email: user.email ?? null,
            provider: 'github',
            github_user_id: ghUserId ? Number(ghUserId) : null,
            github_username: meta.user_name || meta.preferred_username || null,
            github_avatar_url: meta.avatar_url || null,
            github_profile_url: meta.html_url || (meta.user_name ? `https://github.com/${meta.user_name}` : null),
            github_email: meta.email || user.email || null,
            github_connected_at: new Date().toISOString(),
            // Linked-auth flag for conditional Dev login buttons.
            dev_github_linked: true,
            updated_at: new Date().toISOString(),
          }
          const currentRole = (existing as any)?.role
          const isProtectedRole = currentRole === 'dev' || currentRole === 'admin' || currentRole === 'project_owner'
          if (isDevPath && !isProtectedRole) {
            // First-time dev applicant or existing client switching sides.
            patch.role = 'pending_developer'
            patch.approval_status = 'pending'
          } else if (!currentRole) {
            // Brand-new account via non-dev path → default to client.
            patch.role = 'client'
          }
          await supabase.from('profiles').upsert(patch, { onConflict: 'id' })
        } catch { /* best-effort — Auth-Flow nicht blockieren */ }
      } else if (isDevPath && (provider === 'google' || provider === 'apple' || provider === 'email' || !provider)) {
        // Google / Apple / E-Mail über /dev/login → Dev-Intent + linked-auth flags.
        try {
          const { data: existing } = await supabase
            .from('profiles')
            .select('id,role,approval_status')
            .eq('id', user.id)
            .maybeSingle()
          const currentRole = (existing as any)?.role
          const isProtectedRole = currentRole === 'dev' || currentRole === 'admin' || currentRole === 'project_owner'
          const patch: Record<string, any> = {
            id: user.id,
            email: user.email ?? null,
            updated_at: new Date().toISOString(),
          }
          if (provider === 'google') patch.dev_google_linked = true
          if (provider === 'apple') patch.dev_apple_linked = true
          if (provider === 'email' || !provider) patch.dev_email_linked = true
          if (!isProtectedRole && currentRole !== 'pending_developer') {
            patch.role = 'pending_developer'
            patch.approval_status = 'pending'
          } else if (!currentRole) {
            patch.role = 'pending_developer'
            patch.approval_status = 'pending'
          }
          await supabase.from('profiles').upsert(patch, { onConflict: 'id' })
        } catch { /* best-effort */ }
      } else if (provider === 'google' || provider === 'apple' || provider === 'email') {
        // Non-dev OAuth still stamps linked flags when the profile already exists (settings link).
        try {
          const patch: Record<string, any> = {
            id: user.id,
            email: user.email ?? null,
            updated_at: new Date().toISOString(),
          }
          if (provider === 'google') patch.dev_google_linked = true
          if (provider === 'apple') patch.dev_apple_linked = true
          if (provider === 'email') patch.dev_email_linked = true
          await supabase.from('profiles').upsert(patch, { onConflict: 'id' })
        } catch { /* best-effort */ }
      }

      let ssoWorkspaceJoined = false
      if (isSsoProvider(provider)) {
        try {
          const finish = await finishSsoSession()
          ssoWorkspaceJoined = Boolean(finish.workspaceJoined)
        } catch { /* best-effort */ }
      }

      if (oauthNeedsRegister) {
        const prefill = oauthNeedsRegister.username
          ? `&prefill=${encodeURIComponent(oauthNeedsRegister.username)}`
          : ''
        rememberFestagAccount({
          userId: user.id,
          email: user.email ?? null,
          method: inferMethod(user),
          onboardingCompleted: false,
          workspaceName: oauthNeedsRegister.workspace_name,
        })
        router.replace(`/dev/login?register=1&welcome=1${prefill}`)
        return
      }

      // ── Observer-Invite-Redemption ──
      // Falls der User über /i/<token> kam, ist der Token im localStorage.
      // Vor dem Routing einlösen — bei Success direkt ins Dashboard.
      let observerRedeemed = false
      try {
        const pendingToken = typeof window !== 'undefined' ? window.localStorage.getItem('festag_observer_token') : null
        if (pendingToken) {
          const { data: redeemed, error: rpcErr } = await supabase.rpc('redeem_observer_invite', { token: pendingToken })
          const rows = Array.isArray(redeemed) ? redeemed : []
          if (!rpcErr && rows.length > 0) {
            observerRedeemed = true
            try { window.localStorage.removeItem('festag_observer_token') } catch {}
          }
        }
      } catch { /* best-effort */ }

      // Create/rename personal workspace from the name typed on /register.
      let needsWorkspaceCreate = false
      if (!next.startsWith('/invite/') && !next.startsWith('/dev')) {
        const pending =
          getPendingWorkspaceName() ||
          (typeof user.user_metadata?.pending_workspace_name === 'string'
            ? user.user_metadata.pending_workspace_name
            : '') ||
          (typeof user.user_metadata?.workspace_name === 'string'
            ? user.user_metadata.workspace_name
            : '')
        const wsName = normalizeWorkspaceName(pending)
        if (wsName) {
          const boot = await bootstrapPersonalWorkspace(wsName)
          if (!boot.ok) {
            setPendingWorkspaceName(wsName)
            needsWorkspaceCreate = true
          }
        } else {
          const [{ data: existingWs }, { data: memberWs }] = await Promise.all([
            supabase
              .from('workspaces')
              .select('id')
              .eq('primary_owner_id', user.id)
              .limit(1)
              .maybeSingle(),
            supabase
              .from('workspace_members')
              .select('workspace_id')
              .eq('user_id', user.id)
              .limit(1)
              .maybeSingle(),
          ])
          if (!existingWs && !memberWs && !ssoWorkspaceJoined) needsWorkspaceCreate = true
        }
      }

      // Invite passthrough — when the auth flow originated from an invite link
      // (next=/invite/<token>), honor it directly. The join screen wires the
      // shared project and routes onward; never force onboarding ahead of it.
      if (next.startsWith('/invite/')) {
        rememberFestagAccount({
          userId: user.id,
          email: user.email ?? null,
          method: inferMethod(user),
          onboardingCompleted: false,
        })
        router.replace(next)
        return
      }

      // `next` carries the intent of the form the user just submitted:
      //   /login          → next=/dashboard (client portal)
      //   /dev/login      → next=/dev (developer portal — role-checked)
      //   /onboarding/…   → next=/onboarding
      // Pass it through so an admin who came in via /login lands on
      // /dashboard, not /dev.
      let target = needsWorkspaceCreate
        ? '/create-workspace'
        : await resolvePostAuthTarget(supabase, user.id, next === '/loading' ? null : next)

      const rememberedWs =
        getPendingWorkspaceName() ||
        (typeof user.user_metadata?.workspace_name === 'string' ? user.user_metadata.workspace_name : null)
      rememberFestagAccount({
        userId: user.id,
        email: user.email ?? null,
        method: inferMethod(user),
        onboardingCompleted: target === '/dashboard' || target === '/dev',
        workspaceName: normalizeWorkspaceName(rememberedWs || '') || null,
      })

      const resolvedTarget = observerRedeemed ? '/dashboard?welcome=observer' : target
      router.replace(resolvedTarget)
    }

    async function verifyTokenHash(tokenHash: string, type: OtpType) {
      setMode('verifying')
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (error) {
        setErrorMessage(error.message || 'link_expired')
        setMode('error')
        return
      }
      try {
        await finishAuthenticatedSession(
          type === 'recovery' ? { forceNext: '/auth/reset-password' } : undefined,
        )
      } catch (e: any) {
        setErrorMessage(e?.message || 'auth_failed')
        setMode('error')
      }
    }

    async function run() {
      const fragment = hashParams()
      const providerError =
        params?.get('error_description') ||
        params?.get('error') ||
        fragment.get('error_description') ||
        fragment.get('error')

      if (providerError) {
        router.replace(errorTarget(providerError))
        return
      }

      // Hash tokens (implicit flow) — safe to auto-consume: hash fragment
      // is never sent to the server, so link scanners cannot observe it.
      const accessToken = fragment.get('access_token')
      const refreshToken = fragment.get('refresh_token')
      if (accessToken && refreshToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
          await finishAuthenticatedSession()
        } catch (e: any) {
          router.replace(errorTarget(e?.message || 'auth_failed'))
        }
        return
      }

      // PKCE flow — code is locked to the browser's code_verifier in
      // localStorage. Mail scanners do not hold the verifier so they
      // cannot redeem the code. Safe to auto-exchange here.
      const code = params?.get('code')
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          await finishAuthenticatedSession()
        } catch (e: any) {
          router.replace(errorTarget(e?.message || 'auth_failed'))
        }
        return
      }

      // OTP token_hash — single-use. Mail providers and security scanners
      // routinely prefetch/preview email links and would silently burn the
      // token before the human ever clicks. Hold here and wait for an
      // explicit click before redeeming.
      const tokenHash = params?.get('token_hash') || fragment.get('token_hash')
      const type = (params?.get('type') || fragment.get('type') || 'email') as OtpType
      if (tokenHash) {
        // already-authenticated visit (e.g. opened link in the same browser
        // after signing in elsewhere) — just route through.
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          try { await finishAuthenticatedSession() } catch { /* fall through */ }
          return
        }

        // Stash for the click handler.
        ;(window as any).__festagPendingOtp = { tokenHash, type, verify: verifyTokenHash }
        setMode('confirm')
        return
      }

      // Last-chance fallback: maybe the session was set out-of-band.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        try { await finishAuthenticatedSession() } catch {
          router.replace(errorTarget('auth_failed'))
        }
        return
      }

      router.replace(errorTarget('auth_failed'))
    }

    run()
  }, [params, router])

  if (mode === 'error') {
    return (
      <main className="cb-page">
        <style>{CB_CSS}</style>
        <div className="cb-card">
          <div className="cb-brand"><AuthBrandLogo size="compact" /></div>
          <h1 className="cb-title">Link nicht mehr gültig</h1>
          <p className="cb-text">
            Dieser Anmeldelink ist nicht mehr gültig oder wurde schon verwendet.
            Fordere einfach einen neuen Code an, dann geht es weiter.
          </p>
          <button
            className="cb-btn"
            type="button"
            onClick={() => router.replace(errorTarget(errorMessage || 'link_expired'))}
          >
            Zur Anmeldung
          </button>
        </div>
      </main>
    )
  }

  if (mode === 'confirm') {
    return (
      <main className="cb-page">
        <style>{CB_CSS}</style>
        <div className="cb-card">
          <div className="cb-brand"><AuthBrandLogo size="compact" /></div>
          <h1 className="cb-title">Anmeldung bestätigen</h1>
          <p className="cb-text">
            Tippe einmal auf den Button, um dich sicher anzumelden.
          </p>
          <button
            className="cb-btn"
            type="button"
            autoFocus
            onClick={() => {
              const pending = (window as any).__festagPendingOtp
              if (pending?.verify) pending.verify(pending.tokenHash, pending.type)
            }}
          >
            Jetzt anmelden
          </button>
          <p className="cb-foot">Du wirst direkt zu deinem Dashboard weitergeleitet.</p>
        </div>
      </main>
    )
  }

  return <FestagLoader fullscreen label={mode === 'verifying' ? 'Anmeldung wird abgeschlossen…' : 'Wir prüfen deinen Link…'} />
}

const CB_CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  .cb-page{min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#FCFCFD;padding:24px;font-family:var(--font-aeonik,'Aeonik',Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif);font-weight:400;-webkit-font-smoothing:antialiased;color:#202532;}
  .cb-page a,.cb-page button,.cb-page p,.cb-page strong,.cb-page h1,.cb-page span{font-weight:400;}
  .cb-card{width:271px;display:flex;flex-direction:column;gap:18px;align-items:stretch;text-align:center;transform:translateY(14px);}
  .cb-brand{display:flex;align-items:center;justify-content:center;margin-bottom:8px;}
  .cb-title{font-size:21px;font-weight:400;letter-spacing:0.21px;line-height:1.25;color:#202532;}
  .cb-text{font-size:14px;line-height:1.55;color:#7B8294;margin-bottom:4px;font-weight:400;}
  .cb-btn{appearance:none;width:100%;height:47px;background:#5b647d;color:#fff;border:none;border-radius:32px;padding:0 24px;font-family:inherit;font-size:14px;font-weight:400;letter-spacing:0.14px;cursor:default;transition:background .15s,transform .15s;box-shadow:0px 8px 24px 0px rgba(200,169,91,0.14);}
  .cb-btn:hover{background:#505870;}
  .cb-btn:active{transform:scale(0.98);}
  .cb-foot{margin-top:0;font-size:12px;color:#98A2B3;line-height:1.5;font-weight:400;}
  @media (prefers-color-scheme: dark){.cb-page{background:#0F141B;color:#E8E8E5}.cb-title{color:#E8E8E5}.cb-text{color:#98A2B3}.cb-btn{background:#5b647d;color:#fff;box-shadow:none}.cb-btn:hover{background:#69748f}.cb-foot{color:#7B8294}}
`

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<FestagLoader fullscreen label="Anmeldung wird abgeschlossen…" />}>
      <CallbackInner />
    </Suspense>
  )
}
