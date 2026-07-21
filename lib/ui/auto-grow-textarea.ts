/**
 * Auto-growing textarea — no manual resize grip.
 * Prefer with `resize: none` (global). Call on mount + whenever value changes.
 */
export function syncAutoGrowTextarea(
  el: HTMLTextAreaElement | null | undefined,
  opts?: { minPx?: number; maxPx?: number },
) {
  if (!el) return
  const minPx = opts?.minPx ?? 0
  const maxPx = opts?.maxPx ?? 360
  el.style.height = 'auto'
  const next = Math.min(Math.max(el.scrollHeight, minPx), maxPx)
  el.style.height = `${next}px`
  el.style.overflowY = el.scrollHeight > maxPx ? 'auto' : 'hidden'
}
