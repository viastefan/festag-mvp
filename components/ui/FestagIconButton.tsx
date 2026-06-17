import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  /** 32 (default) or 28 — Linear-style circular control */
  size?: 28 | 32
}

/** Linear-style raised icon button — 3D inset highlight + soft drop shadow. */
export default function FestagIconButton({
  children,
  className = '',
  size = 32,
  type = 'button',
  ...rest
}: Props) {
  const sizeClass = size === 28 ? ' fui-icon-btn--28' : ''
  return (
    <button
      type={type}
      className={`fui-icon-btn${sizeClass}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {children}
    </button>
  )
}
