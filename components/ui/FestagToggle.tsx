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
  /* Quiet mini pill — fully round caps (height/2). */
  .ft-toggle--sm {
    width: 28px !important;
    height: 16px !important;
    min-width: 28px !important;
    min-height: 16px !important;
    max-width: 28px !important;
    max-height: 16px !important;
  }
  .ft-toggle--md {
    width: 34px !important;
    height: 20px !important;
    min-width: 34px !important;
    min-height: 20px !important;
    max-width: 34px !important;
    max-height: 20px !important;
  }
  .ft-toggle.is-on {
    background: #1e1e20;
  }
  .ft-toggle::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 2px;
    border-radius: 9999px !important;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
    transform: translateY(-50%);
    transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), left 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .ft-toggle--sm::after {
    width: 12px !important;
    height: 12px !important;
  }
  .ft-toggle--md::after {
    width: 16px !important;
    height: 16px !important;
  }
  .ft-toggle--sm.is-on::after {
    left: 14px;
    transform: translateY(-50%);
  }
  .ft-toggle--md.is-on::after {
    left: 16px;
    transform: translateY(-50%);
  }
  .ft-toggle:focus-visible {
    box-shadow: 0 0 0 2px rgba(126, 136, 159, 0.32) !important;
  }
  .ft-toggle:active::after {
    transform: translateY(-50%) scale(0.94);
  }
  .ft-toggle--sm.is-on:active::after {
    left: 14px;
    transform: translateY(-50%) scale(0.94);
  }
  .ft-toggle--md.is-on:active::after {
    left: 16px;
    transform: translateY(-50%) scale(0.94);
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
