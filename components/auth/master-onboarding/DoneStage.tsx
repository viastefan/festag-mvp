'use client'

import AuthGlassyHero from '@/components/auth/AuthGlassyHero'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import { DONE_HEADER } from '@/lib/platform/master-onboarding'

type Props = {
  onContinue: () => void
  submitting?: boolean
}

export default function DoneStage({ onContinue, submitting = false }: Props) {
  return (
    <>
      <AuthGlassyHero
        animKey="done"
        lead={DONE_HEADER.lead}
        rest={DONE_HEADER.muted}
        stacked
        className="mob-glassy-h1"
      />
      <div className="mob-continue-slot mob-continue-slot--done">
        <ContinueHint
          className="mob-continue-btn mob-continue-btn--done"
          show={!submitting}
          label="Loslegen"
          onContinue={onContinue}
        />
        {submitting ? <p className="mob-done-wait">Einen Moment…</p> : null}
      </div>
    </>
  )
}
