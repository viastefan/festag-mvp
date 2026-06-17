type Props = {
  size?: number
  className?: string
}

/** Codex-style compose glyph — rounded note with pencil editing inside. */
export default function TagroComposeIcon({ size = 20, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect
        x="4.75"
        y="5.25"
        width="11.5"
        height="13.5"
        rx="2.75"
        stroke="currentColor"
        strokeWidth="1.65"
      />
      <path
        d="M13.75 7.25L17.25 10.75L10.5 17.5H7V13.75L13.75 7.25Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
