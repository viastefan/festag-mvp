'use client'

type Props = {
  compact?: boolean
  onOpen: () => void
}

export default function BriefingIntelligenceRulesMenu({ compact, onOpen }: Props) {
  return (
    <div className="wsb-intel-wrap">
      <button
        type="button"
        className={`wsb-picker${compact ? ' wsb-picker--compact' : ''}`}
        onClick={e => {
          e.stopPropagation()
          onOpen()
        }}
      >
        Intelligenz regeln
      </button>
    </div>
  )
}
