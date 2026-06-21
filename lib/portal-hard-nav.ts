/** Decision detail injects large inline CSS; after hydration recovery soft router nav can stall. */
export function isDecisionDetailPath(pathname: string): boolean {
  return /^\/decisions\/[^/]+$/.test(pathname)
}

export function portalHardNavigate(fromPathname: string, href: string): boolean {
  if (!isDecisionDetailPath(fromPathname)) return false
  const target = href.split('#')[0].split('?')[0]
  if (target === fromPathname) return false

  try {
    window.dispatchEvent(new CustomEvent('festag:decisions-dismiss-overlays'))
  } catch { /* noop */ }
  document.body.style.overflow = ''
  window.location.assign(href)
  return true
}

export function onPortalNavClick(
  fromPathname: string,
  href: string,
  e: { preventDefault(): void },
): void {
  if (portalHardNavigate(fromPathname, href)) e.preventDefault()
}
