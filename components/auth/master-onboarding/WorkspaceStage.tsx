'use client'

import AuthGlassyHero from '@/components/auth/AuthGlassyHero'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import {
  WORKSPACE_HEADER,
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
    ? (value as WorkspaceOption)
    : null
  const header = picked ? WORKSPACE_HEADER[picked] : WORKSPACE_HEADER_IDLE

  return (
    <>
      <AuthGlassyHero
        animKey="workspace"
        lead={header.lead}
        rest={header.muted}
        instant={Boolean(picked)}
        className="mob-glassy-h1 mob-glassy-h1--inline"
      />
      <div className="mob-chip-list">
        {WORKSPACE_OPTIONS.map((opt, i) => (
          <button
            key={opt}
            type="button"
            className={`mob-chip${value === opt ? ' is-on' : ''}`}
            style={{ ['--i' as string]: i }}
            onClick={() => onPick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="mob-continue-slot">
        <ContinueHint show={Boolean(picked)} onContinue={onContinue} />
      </div>
    </>
  )
}
