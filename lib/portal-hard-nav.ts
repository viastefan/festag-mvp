/** Decision detail injects large inline CSS; after hydration recovery soft router nav can stall. */
export function isDecisionDetailPath(pathname: string): boolean {
  return /^\/decisions\/[^/]+$/.test(pathname)
}

/** Routes that inject heavy inline portal chrome — soft client nav can freeze the UI. */
export function isHeavyPortalChromePath(pathname: string): boolean {
  return isDecisionDetailPath(pathname)
    || pathname === '/documents'
    || pathname.startsWith('/documents/')
}

export function portalHardNavigate(fromPathname: string, href: string): boolean {
  const target = href.split('#')[0].split('?')[0]
  if (target === fromPathname) return false
  if (!isHeavyPortalChromePath(fromPathname) && !isHeavyPortalChromePath(target)) return false

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
