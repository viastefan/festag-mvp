/**
 * Shared timing for Festag mobile drag-handle sheets / auth popups.
 * Keep EXIT_MS in sync with CSS `--festag-sheet-ms` (no artificial lag).
 */

/** Open + close duration — GPU transform/opacity only, ≤280ms. */
export const FESTAG_SHEET_MS = 240

/** Ease-out for slide-up enter. */
export const FESTAG_SHEET_EASE = [0.16, 1, 0.3, 1] as const

/** Slightly snappier ease for slide-down exit. */
export const FESTAG_SHEET_EASE_OUT = [0.32, 0.72, 0, 1] as const

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
