'use client'

import type { IconProps } from '@phosphor-icons/react'

/** Material-style edit_square — stroke icon, inherits currentColor for theme. */
export default function EditSquareIcon({
  size = 24,
  color,
  weight = 'regular',
  ...rest
}: IconProps) {
  const stroke = weight === 'bold' ? 2 : weight === 'light' ? 1.25 : 1.5
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={color ? { color } : undefined}
      {...rest}
    >
      <path
        d="M7 5.5h8.2c.55 0 1 .45 1 1V15"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 18.5h11c.83 0 1.5-.67 1.5-1.5v-11c0-.83-.67-1.5-1.5-1.5h-11C5.67 4.5 5 5.17 5 6v11c0 .83.67 1.5 1.5 1.5Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="m14.2 7.8 2 2"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  )
}
