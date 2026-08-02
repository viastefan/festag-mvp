'use client'

import TextFieldStage from '@/components/auth/master-onboarding/TextFieldStage'
import { NAME_EXAMPLES, NAME_MIN_CHARS } from '@/lib/platform/master-onboarding'

type Props = {
  value: string
  onChange: (v: string) => void
  onAdvance: () => void
  onSkip: () => void
}

export default function NameStage({ value, onChange, onAdvance, onSkip }: Props) {
  return (
    <TextFieldStage
      animKey="name"
      lead="Wie heißt du?"
      rest="Für Einladungen und E-Mails — später jederzeit änderbar."
      value={value}
      onChange={onChange}
      examples={NAME_EXAMPLES}
      ariaLabel="Dein Name"
      minChars={NAME_MIN_CHARS}
      optional
      onAdvance={onAdvance}
      onSkip={onSkip}
      autoComplete="name"
      maxLength={80}
    />
  )
}
