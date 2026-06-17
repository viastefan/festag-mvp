import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'surface' | 'primary'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: Variant
  block?: boolean
}

/** Linear-style pill button — soft 3D surface in light mode. */
export default function FestagPillButton({
  children,
  className = '',
  variant = 'surface',
  block = false,
  type = 'button',
  ...rest
}: Props) {
  const variantClass = variant === 'primary' ? ' fui-pill-btn--primary' : ''
  const blockClass = block ? ' fui-pill-btn--block' : ''
  return (
    <button
      type={type}
      className={`fui-pill-btn${variantClass}${blockClass}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {children}
    </button>
  )
}
