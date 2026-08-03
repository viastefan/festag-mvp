'use client'

/**
 * Username card — same chrome language as Profile (H1 + field + footer).
 * Live availability via /api/usernames/check. Visual design matches onboarding.
 */

import { useEffect, useRef, useState } from 'react'
import AuthGlassyHero from '@/components/auth/AuthGlassyHero'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import UsernameCheckBadge from '@/components/auth/UsernameCheckBadge'
import {
  FIELD_SETTLE_MS,
  USERNAME_EXAMPLES,
  USERNAME_FOOT,
  USERNAME_HEADER,
  USERNAME_MIN_CHARS,
} from '@/lib/platform/master-onboarding'
import { normalizeWorkspaceName } from '@/lib/pending-workspace'

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

type Props = {
  value: string
  onChange: (v: string) => void
  userId: string | null
  isPreview?: boolean
  onAdvance: () => void
}

export default function UsernameStage({
  value,
  onChange,
  userId,
  isPreview = false,
  onAdvance,
}: Props) {
  const [focused, setFocused] = useState(false)
  const [settled, setSettled] = useState(false)
  const [exampleIdx, setExampleIdx] = useState(0)
  const [exampleIn, setExampleIn] = useState(true)
  const [availability, setAvailability] = useState<Availability>('idle')
  const [availabilityMsg, setAvailabilityMsg] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkSeq = useRef(0)

  const display = normalizeWorkspaceName(value)
  const enough = display.length >= USERNAME_MIN_CHARS
  const showExample = !display
  const example = USERNAME_EXAMPLES[exampleIdx % USERNAME_EXAMPLES.length]
  const ready = settled && availability === 'available' && enough
  const badgeStatus =
    availability === 'checking' || availability === 'available' || availability === 'taken'
      ? availability
      : null

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [])

  useEffect(() => {
    const el = inputRef.current
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
    if (!enough || availability !== 'available') return
    settleTimer.current = setTimeout(() => setSettled(true), FIELD_SETTLE_MS)
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [value, enough, availability])

  useEffect(() => {
    if (!showExample) return
    let fade: ReturnType<typeof setTimeout> | null = null
    const tick = window.setInterval(() => {
      setExampleIn(false)
      fade = setTimeout(() => {
        setExampleIdx((i) => (i + 1) % USERNAME_EXAMPLES.length)
        setExampleIn(true)
      }, 420)
    }, 3800)
    return () => {
      window.clearInterval(tick)
      if (fade) clearTimeout(fade)
    }
  }, [showExample])

  useEffect(() => {
    const trimmed = normalizeWorkspaceName(value)
    if (!trimmed) {
      setAvailability('idle')
      setAvailabilityMsg('')
      return
    }
    if (trimmed.length < USERNAME_MIN_CHARS) {
      setAvailability('invalid')
      setAvailabilityMsg('Mindestens 2 Zeichen.')
      return
    }
    if (isPreview) {
      setAvailability('available')
      setAvailabilityMsg('')
      return
    }

    setAvailability('checking')
    setAvailabilityMsg('')
    const seq = ++checkSeq.current
    const t = window.setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ name: trimmed })
        if (userId) qs.set('excludeProfileId', userId)
        const res = await fetch(`/api/usernames/check?${qs.toString()}`, {
          credentials: 'include',
        })
        const data = await res.json().catch(() => null)
        if (seq !== checkSeq.current) return
        if (!data?.ok) {
          setAvailability('invalid')
          setAvailabilityMsg('Prüfung nicht möglich.')
          return
        }
        if (data.available) {
          setAvailability('available')
          setAvailabilityMsg('')
          return
        }
        setAvailability('taken')
        setAvailabilityMsg(String(data.reason || 'Bereits vergeben'))
      } catch {
        if (seq !== checkSeq.current) return
        setAvailability('invalid')
        setAvailabilityMsg('Prüfung nicht möglich.')
      }
    }, 220)
    return () => window.clearTimeout(t)
  }, [value, userId, isPreview])

  return (
    <>
      <AuthGlassyHero
        animKey="username"
        lead={USERNAME_HEADER.lead}
        rest={USERNAME_HEADER.muted}
        stacked
        className="mob-glassy-h1"
      />

      <div className="mob-profile-stack">
        <div
          className={[
            'mob-profile-field',
            'mob-username-field',
            focused ? 'is-focused' : '',
            display ? 'has-value' : '',
            badgeStatus ? 'has-badge' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="mob-username-at" aria-hidden="true">
            @
          </span>
          <input
            ref={inputRef}
            className="mob-profile-input mob-username-input"
            type="text"
            name="festag-username"
            value={value}
            onChange={(e) => onChange(normalizeWorkspaceName(e.target.value))}
            placeholder=""
            autoComplete="username"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={32}
            aria-label="Benutzername"
            aria-invalid={availability === 'taken' || availability === 'invalid'}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              if (ready) onAdvance()
            }}
          />
          {badgeStatus ? (
            <UsernameCheckBadge
              status={badgeStatus}
              title={
                availability === 'checking'
                  ? 'Wird geprüft…'
                  : availability === 'available'
                    ? 'Verfügbar'
                    : availabilityMsg || 'Bereits vergeben'
              }
            />
          ) : null}
          {showExample ? (
            <span
              aria-hidden
              className={[
                'mob-profile-example',
                'mob-username-example',
                exampleIn ? '' : 'is-out',
                focused ? 'is-focused' : '',
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
            <ContinueHint ready={ready} onContinue={onAdvance} />
          </div>
          <p className="mob-ws-foot">{USERNAME_FOOT}</p>
          {availabilityMsg && (availability === 'taken' || availability === 'invalid') ? (
            <p className="mob-username-hint" role="status">
              {availabilityMsg}
            </p>
          ) : null}
        </div>
      </div>
    </>
  )
}
