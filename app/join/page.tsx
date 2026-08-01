'use client'

/**
 * Join Project — constitution path 2.
 * Name + avatar → open invited project. No Build onboarding theater.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Hexagon, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import { AUTH_OS_STYLES } from '@/components/auth/auth-os-styles'
import AuthSandAmbient from '@/components/auth/AuthSandAmbient'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import { prepareAuthRouteTransition } from '@/lib/auth-theme'
import { joinCompletionRedirect } from '@/lib/platform/join'

function JoinProjectInner() {
  const search = useSearchParams()
  const token = search.get('token')
  const projectFromQuery = search.get('project')
  const source = search.get('source')
  const supabase = useMemo(() => createClient(), [])

  const [booting, setBooting] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(projectFromQuery)
  const [projectTitle, setProjectTitle] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const avatarBlobRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const q = new URLSearchParams()
        if (token) q.set('invite', token)
        q.set('returnTo', `/join${typeof window !== 'undefined' ? window.location.search : ''}`)
        prepareAuthRouteTransition('/login')
        window.location.href = `/login?${q.toString()}`
        return
      }
      if (cancelled) return
      setUserId(user.id)

      // Accept invite if token present (idempotent).
      if (token && source !== 'developer') {
        const res = await fetch('/api/invites/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        }).then((r) => r.json()).catch(() => null)

        if (res?.ok && res.redirect && !String(res.redirect).startsWith('/join')) {
          prepareAuthRouteTransition(res.redirect)
          window.location.href = res.redirect
          return
        }
        if (res?.projectId) setProjectId(res.projectId)
      }

      const [{ data: profile }, info] = await Promise.all([
        supabase.from('profiles').select('full_name,avatar_url').eq('id', user.id).maybeSingle(),
        token && source !== 'developer'
          ? fetch(`/api/invites/info?token=${encodeURIComponent(token)}`)
              .then((r) => r.json())
              .catch(() => null)
          : Promise.resolve(null),
      ])

      if (cancelled) return
      if (profile?.full_name) setFullName(profile.full_name)
      else {
        const meta = user.user_metadata || {}
        const guess = String(meta.full_name || meta.name || '').trim()
        if (guess) setFullName(guess)
      }
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
      if (info?.projectTitle) setProjectTitle(info.projectTitle)
      if (info?.ok && !projectFromQuery && info.projectTitle) {
        /* title only — id from join response */
      }
      setBooting(false)
    })()
    return () => {
      cancelled = true
      if (avatarBlobRef.current) URL.revokeObjectURL(avatarBlobRef.current)
    }
  }, [supabase, token, projectFromQuery, source])

  async function handleAvatarPick(file?: File | null) {
    if (!file || !userId || avatarUploading) return
    setAvatarUploading(true)
    setError('')
    try {
      if (avatarBlobRef.current) URL.revokeObjectURL(avatarBlobRef.current)
      const localUrl = URL.createObjectURL(file)
      avatarBlobRef.current = localUrl
      setAvatarUrl(localUrl)

      const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = pub.publicUrl
      setAvatarUrl(url)
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
    } catch {
      setError('Bild konnte nicht hochgeladen werden.')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function removeAvatar() {
    if (!userId || avatarUploading) return
    setAvatarUrl(null)
    if (avatarBlobRef.current) {
      URL.revokeObjectURL(avatarBlobRef.current)
      avatarBlobRef.current = null
    }
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const name = fullName.trim()
    if (name.length < 2) {
      setError('Bitte deinen Namen eingeben.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding/join/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: name,
          avatarUrl: avatarUrl && !avatarUrl.startsWith('blob:') ? avatarUrl : null,
          projectId,
          token,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError('Speichern fehlgeschlagen.')
        setSubmitting(false)
        return
      }
      const href = data.redirect || joinCompletionRedirect(projectId)
      const preparing = `/preparing?next=${encodeURIComponent(href)}`
      prepareAuthRouteTransition(preparing)
      window.location.href = preparing
    } catch {
      setError('Netzwerkfehler.')
      setSubmitting(false)
    }
  }

  const ready = fullName.trim().length >= 2
  const heroLead = projectTitle ? `${projectTitle}.` : 'Willkommen.'
  const heroRest = ' Name und Bild — dann bist du im Projekt.'

  if (booting) {
    return (
      <main data-theme="dark" className="al-root onb-sand-dark" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{AUTH_LANDING_STYLES}</style>
        <style>{AUTH_OS_STYLES}</style>
        <style>{JOIN_CSS}</style>
        <span className="join-boot" aria-hidden />
      </main>
    )
  }

  return (
    <main className="al-root al-root--centered onb-sand-dark" data-theme="dark">
      <style>{AUTH_LANDING_STYLES}</style>
      <style>{AUTH_OS_STYLES}</style>
      <style>{JOIN_CSS}</style>
      <AuthSandAmbient variant="dev-onboarding" />

      <div className="al-container">
        <header className="al-header">
          <span className="al-wordmark" aria-label="Festag" role="img">
            <img
              className="al-wordmark-img al-wordmark-img--dark"
              src="/brand/festag-mark-fluid.png?v=20260731"
              alt=""
              aria-hidden="true"
            />
          </span>
          <div className="al-header-actions">
            <AuthDocsPopover />
          </div>
        </header>

        <main className="al-main">
          <div className="al-desktop-stage al-desktop-stage--centered">
            <div className="al-desktop-left">
              <div className="al-mobile-sheet">
                <div className="al-sheet-body">
                  <section className="al-signin" aria-label="Join Project">
                    <div className="al-hero-copy">
                      <h1 className="al-title al-title-display onb-hero-line">
                        <span className="onb-hero-lead">{heroLead}</span>
                        <span className="al-hero-gray">{heroRest}</span>
                      </h1>
                      <p className="al-os-support">
                        Kurz dein Name — dann öffnet sich das Projekt direkt.
                      </p>
                    </div>
                    <div className="al-signin-stack">
                      <form className="al-method-group" onSubmit={(e) => void handleSubmit(e)}>
                        <div className="onb-field-group">
                          <div className="onb-name-row">
                            <div className="onb-avatar-wrap">
                              <button
                                type="button"
                                className={`onb-avatar${avatarUploading ? ' is-busy' : ''}`}
                                aria-label={avatarUrl ? 'Profilbild ändern' : 'Profilbild hinzufügen'}
                                disabled={avatarUploading}
                                onClick={() => avatarInputRef.current?.click()}
                              >
                                {avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={avatarUrl} alt="" className="onb-avatar-img" />
                                ) : (
                                  <Hexagon size={20} weight="regular" className="onb-avatar-icon" />
                                )}
                              </button>
                              {avatarUrl ? (
                                <button
                                  type="button"
                                  className="onb-avatar-clear"
                                  aria-label="Profilbild entfernen"
                                  disabled={avatarUploading}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    void removeAvatar()
                                  }}
                                >
                                  <X size={11} weight="bold" />
                                </button>
                              ) : null}
                            </div>
                            <input
                              ref={avatarInputRef}
                              type="file"
                              accept="image/*"
                              className="onb-avatar-input"
                              tabIndex={-1}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                e.target.value = ''
                                void handleAvatarPick(file)
                              }}
                            />
                            <input
                              className="al-input onb-name-input"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Dein Name"
                              autoComplete="name"
                              maxLength={80}
                              autoFocus
                            />
                          </div>
                        </div>

                        {error ? <p className="al-error" role="alert">{error}</p> : null}

                        <button
                          type="submit"
                          className={`al-btn al-btn-primary onb-cta${ready ? ' al-btn-primary--ready' : ''}`}
                          disabled={submitting || !ready}
                        >
                          {submitting ? 'Öffne…' : 'Weiter'}
                        </button>
                      </form>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </main>
  )
}

export default function JoinProjectPage() {
  return (
    <Suspense
      fallback={
        <main data-theme="dark" className="al-root onb-sand-dark" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <style>{AUTH_LANDING_STYLES}</style>
          <style>{AUTH_OS_STYLES}</style>
          <style>{JOIN_CSS}</style>
          <span className="join-boot" aria-hidden />
        </main>
      }
    >
      <JoinProjectInner />
    </Suspense>
  )
}

const JOIN_CSS = `
  .join-boot {
    width: 20px; height: 20px; border-radius: 50%;
    border: 2px solid rgba(168,176,188,.25);
    border-top-color: rgba(168,176,188,.9);
    animation: joinboot .8s linear infinite;
  }
  @keyframes joinboot { to { transform: rotate(360deg); } }

  .onb-field-group { width: 100%; }
  .onb-name-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }
  .onb-avatar-wrap {
    position: relative;
    flex-shrink: 0;
    width: 48px;
    height: 48px;
  }
  .onb-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 0;
    background: rgba(186, 194, 210, 0.08);
    color: rgba(230, 232, 238, 0.45);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    overflow: hidden;
  }
  .onb-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .onb-avatar-clear {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    border: 0;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #1C1F2A;
    color: rgba(230,232,238,0.7);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.08);
    cursor: pointer;
  }
  .onb-avatar-input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
  .onb-name-input { flex: 1; min-width: 0; }
  .onb-cta { margin-top: 14px; width: 100%; }
  .onb-hero-line { text-align: left; }
  .al-hero-gray {
    color: inherit;
    opacity: 0.58;
  }
  .onb-hero-lead {
    color: #F5F5F7;
  }
  @media (min-width: 769px) {
    .al-signin { max-width: 480px; width: 100%; }
    .onb-hero-line {
      font-size: 40px !important;
      line-height: 46px !important;
      letter-spacing: -0.028em !important;
    }
    .al-signin-head { margin-bottom: 44px; }
    .onb-cta {
      height: 48px;
      margin-top: 28px;
      font-size: 15px;
    }
  }
`
