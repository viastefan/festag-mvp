'use client'

/**
 * Festag mini toggle — calm iOS-style switch.
 * Off: soft gray. On: near-black ink (never colored fills).
 */

type Props = {
  on: boolean
  onChange?: () => void
  label: string
  className?: string
  /** When nested in a clickable row — don't bubble. */
  stopPropagation?: boolean
  size?: 'sm' | 'md'
}

export default function FestagToggle({
  on,
  onChange,
  label,
  className = '',
  stopPropagation = false,
  size = 'sm',
}: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={[
        'ft-toggle',
        'no-min-tap',
        size === 'sm' ? 'ft-toggle--sm' : 'ft-toggle--md',
        on ? 'is-on' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(e) => {
        if (stopPropagation) {
          e.preventDefault()
          e.stopPropagation()
        }
        onChange?.()
      }}
    />
  )
}

/** Shared styles — inject once where toggles mount (e.g. onboarding). */
export const FESTAG_TOGGLE_CSS = `
  .ft-toggle {
    position: relative;
    flex-shrink: 0;
    border: 0;
    border-radius: 999px;
    background: rgba(30, 30, 32, 0.12);
    cursor: pointer;
    padding: 0;
    margin: 0;
    -webkit-appearance: none;
    appearance: none;
    outline: none;
    box-shadow: none;
    transition: background 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .ft-toggle--sm {
    width: 36px;
    height: 22px;
    min-width: 36px;
    min-height: 22px;
  }
  .ft-toggle--md {
    width: 42px;
    height: 26px;
    min-width: 42px;
    min-height: 26px;
  }
  .ft-toggle.is-on {
    background: #1e1e20;
  }
  .ft-toggle::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.14);
    transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .ft-toggle--sm::after {
    width: 18px;
    height: 18px;
  }
  .ft-toggle--md::after {
    width: 22px;
    height: 22px;
  }
  .ft-toggle--sm.is-on::after {
    transform: translateX(14px);
  }
  .ft-toggle--md.is-on::after {
    transform: translateX(16px);
  }
  .ft-toggle:focus-visible {
    box-shadow: 0 0 0 2px rgba(126, 136, 159, 0.35);
  }
  .ft-toggle:active::after {
    transform: scale(0.94);
  }
  .ft-toggle--sm.is-on:active::after {
    transform: translateX(14px) scale(0.94);
  }
  .ft-toggle--md.is-on:active::after {
    transform: translateX(16px) scale(0.94);
  }

  html[data-theme="dark"] .ft-toggle,
  [data-theme="dark"] .ft-toggle,
  [data-theme="classic-dark"] .ft-toggle {
    background: rgba(255, 255, 255, 0.14);
  }
  html[data-theme="dark"] .ft-toggle.is-on,
  [data-theme="dark"] .ft-toggle.is-on,
  [data-theme="classic-dark"] .ft-toggle.is-on {
    background: #EBE8E3;
  }
  html[data-theme="dark"] .ft-toggle.is-on::after,
  [data-theme="dark"] .ft-toggle.is-on::after,
  [data-theme="classic-dark"] .ft-toggle.is-on::after {
    background: #1A1917;
  }
`
