'use client'

/**
 * Profile card — Join-style row: avatar upload + name, then optional context.
 * Focus stroke: 2.5px (between Login 2px and the prior 3px).
 */

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import AuthGlassyHero from '@/components/auth/AuthGlassyHero'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import { navigateLeavingAuthChrome } from '@/lib/auth-theme'
import { syncAutoGrowTextarea } from '@/lib/ui/auto-grow-textarea'
import {
  FIELD_SETTLE_MS,
  NAME_MIN_CHARS,
  PROFILE_CONTEXT_MAX_CHARS,
  PROFILE_HEADER,
  PROFILE_POSITION_EXAMPLES,
} from '@/lib/platform/master-onboarding'

type Props = {
  fullName: string
  onNameChange: (v: string) => void
  position: string
  onPositionChange: (v: string) => void
  avatarUrl: string | null
  onAvatarChange: (url: string | null) => void
  userId: string | null
  isPreview?: boolean
  onAdvance: () => void
}

const POS_MIN_PX = 46
const POS_MAX_PX = 160

/** Simple hex box — quiet upload mark, same family as early onboarding. */
function ProfileBoxIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="mob-profile-avatar-icon"
    >
      <path
        d="M12 3.2 19.2 7.4v9.2L12 20.8 4.8 16.6V7.4L12 3.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ProfileStage({
  fullName,
  onNameChange,
  position,
  onPositionChange,
  avatarUrl,
  onAvatarChange,
  userId,
  isPreview = false,
  onAdvance,
}: Props) {
  const [settled, setSettled] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [nameFocused, setNameFocused] = useState(false)
  const [posFocused, setPosFocused] = useState(false)
  const [exampleIdx, setExampleIdx] = useState(0)
  const [exampleIn, setExampleIn] = useState(true)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const posRef = useRef<HTMLTextAreaElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const blobRef = useRef<string | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  const nameOk = fullName.trim().length >= NAME_MIN_CHARS
  const showContinue = settled && nameOk
  const nameFilled = fullName.trim().length > 0
  const posFilled = position.trim().length > 0
  const showPosExample = !posFilled
  const example = PROFILE_POSITION_EXAMPLES[exampleIdx % PROFILE_POSITION_EXAMPLES.length]

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
      if (blobRef.current) URL.revokeObjectURL(blobRef.current)
    }
  }, [])

  useEffect(() => {
    const el = nameRef.current
    if (!el) return
    const focus = () => {
      try {
        el.focus({ preventScroll: true })
      } catch {
        el.focus()
      }
    }
    focus()
    const timers = [40, 120, 280].map((ms) => window.setTimeout(focus, ms))
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [])

  useEffect(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
    setSettled(false)
    if (!nameOk) return
    settleTimer.current = setTimeout(() => setSettled(true), FIELD_SETTLE_MS)
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [fullName, nameOk])

  useEffect(() => {
    if (!showPosExample) return
    let fade: ReturnType<typeof setTimeout> | null = null
    const tick = window.setInterval(() => {
      setExampleIn(false)
      fade = setTimeout(() => {
        setExampleIdx((i) => (i + 1) % PROFILE_POSITION_EXAMPLES.length)
        setExampleIn(true)
      }, 720)
    }, 5200)
    return () => {
      window.clearInterval(tick)
      if (fade) clearTimeout(fade)
    }
  }, [showPosExample])

  useEffect(() => {
    const el = posRef.current
    if (!el) return
    if (!position.trim()) {
      el.style.height = ''
      el.style.overflowY = 'hidden'
      return
    }
    syncAutoGrowTextarea(el, { minPx: POS_MIN_PX, maxPx: POS_MAX_PX })
  }, [position, example, exampleIn, showPosExample])

  async function handleAvatarPick(file?: File | null) {
    if (!file || avatarUploading) return
    setAvatarUploading(true)
    try {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current)
      const localUrl = URL.createObjectURL(file)
      blobRef.current = localUrl
      onAvatarChange(localUrl)

      if (isPreview || !userId) {
        setAvatarUploading(false)
        return
      }

      const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = pub.publicUrl
      onAvatarChange(url)
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
    } catch {
      /* keep local preview if upload failed */
    } finally {
      setAvatarUploading(false)
    }
  }

  async function removeAvatar() {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current)
      blobRef.current = null
    }
    onAvatarChange(null)
    if (!isPreview && userId) {
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
    }
  }

  function goLegal(href: string, e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    navigateLeavingAuthChrome(href)
  }

  return (
    <>
      <AuthGlassyHero
        animKey="profile"
        lead={PROFILE_HEADER.lead}
        rest={PROFILE_HEADER.muted}
        stacked
        className="mob-glassy-h1"
      />

      <div className="mob-profile-stack">
        <div className="mob-profile-name-row">
          <div className="mob-profile-avatar-wrap">
            <button
              type="button"
              className={[
                'mob-profile-avatar',
                avatarUrl ? 'has-image' : '',
                avatarUploading ? 'is-busy' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={avatarUrl ? 'Eigenes Bild hochladen' : 'Profilbild hochladen'}
              disabled={avatarUploading}
              onClick={() => fileRef.current?.click()}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="mob-profile-avatar-img" />
              ) : (
                <ProfileBoxIcon size={17} />
              )}
            </button>
            {avatarUrl ? (
              <button
                type="button"
                className="mob-profile-avatar-clear"
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
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="mob-profile-avatar-input"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                void handleAvatarPick(file)
              }}
            />
          </div>

          <div
            className={[
              'mob-profile-field',
              nameFocused ? 'is-focused' : '',
              nameFilled ? 'has-value' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <input
              ref={nameRef}
              className="mob-profile-input"
              type="text"
              value={fullName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Dein Name"
              autoComplete="name"
              maxLength={80}
              aria-label="Dein Name"
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                if (showContinue) onAdvance()
                else posRef.current?.focus()
              }}
            />
          </div>
        </div>

        <div
          className={[
            'mob-profile-field',
            'mob-profile-field--grow',
            posFocused ? 'is-focused' : '',
            posFilled ? 'has-value' : '',
            showPosExample ? 'has-example' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <textarea
            ref={posRef}
            className={`mob-profile-input mob-profile-input--grow${posFilled ? '' : ' is-empty'}`}
            value={position}
            onChange={(e) => {
              onPositionChange(e.target.value)
              if (e.currentTarget.value.trim()) {
                syncAutoGrowTextarea(e.currentTarget, { minPx: POS_MIN_PX, maxPx: POS_MAX_PX })
              } else {
                e.currentTarget.style.height = ''
              }
            }}
            placeholder=""
            rows={1}
            autoComplete="organization-title"
            maxLength={PROFILE_CONTEXT_MAX_CHARS}
            aria-label={`Kurz zu dir — optional, z. B. ${example}`}
            onFocus={() => setPosFocused(true)}
            onBlur={() => setPosFocused(false)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey) return
              e.preventDefault()
              if (showContinue) onAdvance()
            }}
          />
          {showPosExample ? (
            <span
              aria-hidden
              className={[
                'mob-profile-example',
                'mob-profile-example--grow',
                exampleIn ? '' : 'is-out',
                posFocused ? 'is-focused' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {example}
            </span>
          ) : null}
        </div>

        <div className="mob-profile-footer">
          <div className="mob-ready-hint-slot mob-ready-hint-slot--profile" aria-live="polite">
            <ContinueHint ready={showContinue} onContinue={onAdvance} />
          </div>

          <p className="mob-profile-legal">
            Name und Bild gehören zu deinem Account. Ein kurzer Satz hilft Tagro bei der Einrichtung —
            optional und jederzeit in den Einstellungen änderbar. Details in der{' '}
            <a href="/datenschutz" onClick={(e) => goLegal('/datenschutz', e)}>
              Datenschutzerklärung
            </a>{' '}
            und den{' '}
            <a href="/nutzungsbedingungen" onClick={(e) => goLegal('/nutzungsbedingungen', e)}>
              Nutzungsbedingungen
            </a>
            .
          </p>
        </div>
      </div>
    </>
  )
}
