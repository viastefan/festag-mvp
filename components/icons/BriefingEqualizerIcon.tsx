const STROKE = 1.5

/** Graphic-eq bars — stroke weight matches portal utility icons (1.5 @ 14px). */
export default function BriefingEqualizerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <line x1="2" y1="9" x2="2" y2="5" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <line x1="4.5" y1="10" x2="4.5" y2="4" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <line x1="7" y1="11" x2="7" y2="3" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <line x1="9.5" y1="10" x2="9.5" y2="4" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <line x1="12" y1="9" x2="12" y2="5" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
    </svg>
  )
}
