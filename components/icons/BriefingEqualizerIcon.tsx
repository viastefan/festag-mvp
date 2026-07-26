type Props = {
  size?: number
  stroke?: number
}

/** Graphic-eq bars — matches portal utility icon stroke (1 @ 13px). */
export default function BriefingEqualizerIcon({ size = 13, stroke = 1 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <line x1="2" y1="9" x2="2" y2="5" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <line x1="4.5" y1="10" x2="4.5" y2="4" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <line x1="7" y1="11" x2="7" y2="3" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <line x1="9.5" y1="10" x2="9.5" y2="4" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <line x1="12" y1="9" x2="12" y2="5" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  )
}
