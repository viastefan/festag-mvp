/** Mac Return / Enter — same geometry as AuthEnterGlyph (Cursor-style). */
export default function EnterReturnIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M3.5 9.75h6.25A2.75 2.75 0 0 0 12.5 7V3.5"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.75 7.25 3.5 9.75l2.25 2.5"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
