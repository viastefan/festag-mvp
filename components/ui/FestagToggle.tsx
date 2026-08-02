'use client'

/**
 * Festag mini toggle — calm iOS-style pill switch.
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
    border: 0 !important;
    border-radius: 9999px !important;
    background: rgba(30, 30, 32, 0.11);
    cursor: pointer;
    padding: 0 !important;
    margin: 0;
    -webkit-appearance: none;
    appearance: none;
    outline: none;
    box-shadow: none !important;
    overflow: hidden !important;
    transition: background 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  }
  /* Quiet mini pill */
  .ft-toggle--sm {
    width: 24px !important;
    height: 14px !important;
    min-width: 24px !important;
    min-height: 14px !important;
    max-width: 24px !important;
    max-height: 14px !important;
  }
  .ft-toggle--md {
    width: 30px !important;
    height: 17px !important;
    min-width: 30px !important;
    min-height: 17px !important;
    max-width: 30px !important;
    max-height: 17px !important;
  }
  .ft-toggle.is-on {
    background: #1e1e20;
  }
  .ft-toggle::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    border-radius: 9999px !important;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
    transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .ft-toggle--sm::after {
    width: 10px !important;
    height: 10px !important;
  }
  .ft-toggle--md::after {
    width: 13px !important;
    height: 13px !important;
  }
  .ft-toggle--sm.is-on::after {
    transform: translateX(10px);
  }
  .ft-toggle--md.is-on::after {
    transform: translateX(13px);
  }
  .ft-toggle:focus-visible {
    box-shadow: 0 0 0 2px rgba(126, 136, 159, 0.32) !important;
  }
  .ft-toggle:active::after {
    transform: scale(0.94);
  }
  .ft-toggle--sm.is-on:active::after {
    transform: translateX(10px) scale(0.94);
  }
  .ft-toggle--md.is-on:active::after {
    transform: translateX(13px) scale(0.94);
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
