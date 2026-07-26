import { TAGRO_COMPOSE_SVG_PATH, TAGRO_COMPOSE_VIEWBOX } from '@/lib/brand/tagro-compose-icon'

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
      viewBox={TAGRO_COMPOSE_VIEWBOX}
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d={TAGRO_COMPOSE_SVG_PATH} />
    </svg>
  )
}
