'use client'

import AuthGlassyHero from '@/components/auth/AuthGlassyHero'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import {
  CLARIFY_HEADER,
  CLARIFY_OPTIONS,
  type ClarifyOption,
} from '@/lib/platform/master-onboarding'
import type { TagroBlueprint } from '@/lib/tagro/workspace-blueprint'

type Props = {
  value: string
  onPick: (v: ClarifyOption) => void
  onContinue: () => void
  blueprint: TagroBlueprint
}

export default function ClarifyStage({ value, onPick, onContinue, blueprint }: Props) {
  const guess = blueprint.workspaceType !== '—' ? blueprint.workspaceType : 'deinem Workspace'
  const picked = CLARIFY_OPTIONS.includes(value as ClarifyOption)
    ? (value as ClarifyOption)
    : null
  const header = picked
    ? CLARIFY_HEADER[picked]
    : {
        lead: `Tagro erkennt eher „${guess}“.`,
        muted: 'Bitte bestätige die Einordnung.',
      }

  return (
    <>
      <AuthGlassyHero
        animKey="clarify"
        lead={header.lead}
        rest={header.muted}
        /* Chip pick: soft swap (no second rise). First landing: full glassy. */
        instant={Boolean(picked)}
        className="mob-glassy-h1 mob-glassy-h1--inline"
      />
      <div className="mob-chip-list">
        {CLARIFY_OPTIONS.map((opt, i) => (
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
