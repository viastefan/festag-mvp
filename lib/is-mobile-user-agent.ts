/**
 * Coarse mobile detection for server-side auth routing.
 * Mirrors the ≤768px client chooser — desktop UAs skip /enter entirely.
 */
export function isMobileUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    userAgent,
  )
}
