'use client'

import {
  CLARIFY_HEADER,
  CLARIFY_OPTIONS,
  type ClarifyOption,
} from '@/lib/platform/master-onboarding'
import type { TagroBlueprint } from '@/lib/tagro/workspace-blueprint'

type Props = {
  value: string
  onPick: (v: ClarifyOption) => void
  blueprint: TagroBlueprint
}

export default function ClarifyStage({ value, onPick, blueprint }: Props) {
  const guess = blueprint.workspaceType !== '—' ? blueprint.workspaceType : 'deinem Workspace'
  const picked = CLARIFY_OPTIONS.includes(value as ClarifyOption)
    ? (value as ClarifyOption)
    : null
  const header = picked
    ? CLARIFY_HEADER[picked]
    : {
        lead: `Tagro liest eher „${guess}“, ist aber noch unsicher.`,
        muted: 'Wähle kurz, was am besten passt — dann noch einmal tippen zum Weiter.',
      }

  return (
    <>
      <h1 className="mob-h1 mob-h1-inline">
        <span className="mob-h1-ink">{header.lead}</span>{' '}
        <span className="mob-h1-muted">{header.muted}</span>
      </h1>
      <div className="mob-chip-list">
        {CLARIFY_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`mob-chip${value === opt ? ' is-on' : ''}`}
            onClick={() => onPick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      {picked ? <p className="mob-chip-hint">Nochmal klicken für weiter</p> : null}
    </>
  )
}
