type Props = {
  size?: number
  className?: string
}

/** Codex / iOS-style compose glyph — rounded note + corner pencil. */
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
        x="5"
        y="7"
        width="12"
        height="12"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M14.25 6.25L18.75 4.75L17.25 9.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 14.75H14.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
