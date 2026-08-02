'use client'

/**
 * Workspace choice — stable H1 + cards with Festag mini toggles.
 */

import AuthGlassyHero from '@/components/auth/AuthGlassyHero'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import FestagToggle, { FESTAG_TOGGLE_CSS } from '@/components/ui/FestagToggle'
import {
  WORKSPACE_CARD,
  WORKSPACE_HEADER_IDLE,
  WORKSPACE_OPTIONS,
  type WorkspaceOption,
} from '@/lib/platform/master-onboarding'

type Props = {
  value: string
  onPick: (v: WorkspaceOption) => void
  onContinue: () => void
}

export default function WorkspaceStage({ value, onPick, onContinue }: Props) {
  const picked = WORKSPACE_OPTIONS.includes(value as WorkspaceOption)

  return (
    <>
      <style>{FESTAG_TOGGLE_CSS}</style>
      <AuthGlassyHero
        animKey="workspace"
        lead={WORKSPACE_HEADER_IDLE.lead}
        rest={WORKSPACE_HEADER_IDLE.muted}
        stacked
        className="mob-glassy-h1"
      />
      <div className="mob-ws-list" role="listbox" aria-label="Workspace wählen">
        {WORKSPACE_OPTIONS.map((opt, i) => {
          const card = WORKSPACE_CARD[opt]
          const on = value === opt
          return (
            <div
              key={opt}
              role="option"
              aria-selected={on}
              tabIndex={0}
              className={`mob-ws-card${on ? ' is-on' : ''}`}
              style={{ ['--i' as string]: i }}
              onClick={() => onPick(opt)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPick(opt)
                }
              }}
            >
              <span className="mob-ws-card-copy">
                <span className="mob-ws-card-title">{card.title}</span>
                <span className="mob-ws-card-support">{card.support}</span>
              </span>
              <FestagToggle
                on={on}
                label={`${card.title} wählen`}
                stopPropagation
                onChange={() => onPick(opt)}
              />
            </div>
          )
        })}
      </div>
      <div className="mob-continue-slot">
        <ContinueHint ready={picked} onContinue={onContinue} />
      </div>
    </>
  )
}
