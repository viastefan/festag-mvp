'use client'

import TextFieldStage from '@/components/auth/master-onboarding/TextFieldStage'
import { POSITION_EXAMPLES, POSITION_MIN_CHARS } from '@/lib/platform/master-onboarding'

type Props = {
  value: string
  onChange: (v: string) => void
  onAdvance: () => void
  onSkip: () => void
}

export default function PositionStage({ value, onChange, onAdvance, onSkip }: Props) {
  return (
    <TextFieldStage
      animKey="position"
      lead="Deine Position?"
      rest="Optional — Tagro personalisiert danach."
      value={value}
      onChange={onChange}
      examples={POSITION_EXAMPLES}
      ariaLabel="Deine Position"
      minChars={POSITION_MIN_CHARS}
      optional
      onAdvance={onAdvance}
      onSkip={onSkip}
      autoComplete="organization-title"
      maxLength={64}
    />
  )
}
