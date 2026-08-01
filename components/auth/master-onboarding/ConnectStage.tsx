'use client'

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import {
  OnbLogoCalendar,
  OnbLogoDiscord,
  OnbLogoFigma,
  OnbLogoGithub,
  OnbLogoJira,
  OnbLogoLinear,
  OnbLogoNotion,
  OnbLogoSlack,
  OnbLogoVercel,
} from '@/components/auth/OnboardingSourceLogos'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import type { IntegrationId } from '@/lib/platform/integrations'
import { INTEGRATION_CATALOG } from '@/lib/platform/integrations'
import { connectHeaderFor } from '@/lib/platform/master-onboarding'

type LogoComp = (p: { className?: string }) => ReactElement

const LOGOS: Partial<Record<IntegrationId, LogoComp>> = {
  github: OnbLogoGithub,
  linear: OnbLogoLinear,
  jira: OnbLogoJira,
  slack: OnbLogoSlack,
  notion: OnbLogoNotion,
  figma: OnbLogoFigma,
  vercel: OnbLogoVercel,
  google_calendar: OnbLogoCalendar,
  outlook_calendar: OnbLogoCalendar,
  apple_calendar: OnbLogoCalendar,
  discord: OnbLogoDiscord,
}

export type ConnectSource = {
  id: IntegrationId
  name: string
  connectable: boolean
}

type Props = {
  sources: ConnectSource[]
  connected: Set<string>
  onToggle: (id: IntegrationId) => void
  onContinue: () => void
}

export default function ConnectStage({
  sources,
  connected,
  onToggle,
  onContinue,
}: Props) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const [fadeTop, setFadeTop] = useState(0)
  const [fadeBottom, setFadeBottom] = useState(1)

  const syncFades = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const max = Math.max(0, el.scrollHeight - el.clientHeight)
    if (max < 2) {
      setFadeTop(0)
      setFadeBottom(0)
      return
    }
    const y = el.scrollTop
    setFadeTop(Math.min(1, y / 28))
    setFadeBottom(Math.min(1, (max - y) / 36))
  }, [])

  useEffect(() => {
    syncFades()
    const el = listRef.current
    if (!el) return
    const ro = new ResizeObserver(() => syncFades())
    ro.observe(el)
    return () => ro.disconnect()
  }, [sources.length, connected.size, syncFades])

  const header = connectHeaderFor(connected, sources)

  return (
    <>
      <h1 className="mob-h1">
        <span className="mob-h1-ink">{header.lead}</span>
        <span className="mob-h1-muted">{header.muted}</span>
      </h1>

      <div className="mob-connect-list-wrap">
        <div
          className="mob-connect-fade-top"
          style={{ opacity: fadeTop }}
          aria-hidden
        />
        <div
          ref={listRef}
          className="mob-connect-list"
          onScroll={syncFades}
        >
          {sources.map((src) => {
            const on = connected.has(src.id)
            const Logo = LOGOS[src.id]
            const stateLabel = on ? 'Verbunden' : 'Bald'
            return (
              <button
                key={src.id}
                type="button"
                className={`mob-connect-row${on ? ' is-on' : ''}`}
                onClick={(e) => {
                  onToggle(src.id)
                  const el = e.currentTarget
                  requestAnimationFrame(() => {
                    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                  })
                }}
              >
                <span className="mob-connect-icon" aria-hidden>
                  {Logo ? (
                    <Logo />
                  ) : (
                    <span style={{ fontSize: 12, opacity: 0.7 }}>
                      {src.name.trim().charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </span>
                <span className="mob-connect-name">{src.name}</span>
                <span className="mob-connect-state">{stateLabel}</span>
              </button>
            )
          })}
        </div>
        <div
          className="mob-connect-fade-bottom"
          style={{ opacity: fadeBottom }}
          aria-hidden
        />
      </div>

      <p className="mob-connect-foot">
        Weitere Quellen ergänzt du später im Execution Panel.
      </p>
      <div className="mob-continue-slot">
        <ContinueHint show={connected.size > 0} onContinue={onContinue} />
      </div>
    </>
  )
}

/** Rank catalog for onboarding from blueprint display names + defaults. */
export function rankConnectSources(blueprintNames: string[]): ConnectSource[] {
  const byId = new Map(INTEGRATION_CATALOG.map((d) => [d.id, d]))
  const ordered: ConnectSource[] = []
  const seen = new Set<string>()

  const push = (id: string) => {
    if (seen.has(id)) return
    const def = byId.get(id as IntegrationId)
    if (!def) return
    seen.add(id)
    ordered.push({
      id: def.id as IntegrationId,
      name: def.name,
      connectable: def.connectable,
    })
  }

  for (const name of blueprintNames) {
    const lower = name.trim().toLowerCase()
    const match = INTEGRATION_CATALOG.find(
      (d) =>
        d.name.toLowerCase() === lower ||
        d.id === lower ||
        (lower === 'microsoft' && d.id === 'microsoft_teams'),
    )
    if (match) push(match.id)
  }

  for (const id of [
    'github',
    'figma',
    'slack',
    'linear',
    'notion',
    'google_calendar',
    'vercel',
    'supabase',
    'jira',
    'discord',
  ] as IntegrationId[]) {
    push(id)
  }

  return ordered.slice(0, 8)
}
