type Props = {
  size?: number
  className?: string
}

/** Material edit_square — rounded note + corner pencil (currentColor: black light / white dark). */
export default function TagroComposeIcon({ size = 24, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M5 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7H5V5h7V3H5zm12.78 1c-.17 0-.34.07-.47.2l-1.22 1.21 2.5 2.5 1.21-1.22c.26-.26.26-.7 0-.95l-1.55-1.55c-.13-.13-.3-.19-.47-.19zm-2.41 2.12L8 13.5V16h2.5l7.37-7.38-2.5-2.5z" />
    </svg>
  )
}
