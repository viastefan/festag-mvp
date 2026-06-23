/** Routes that share one persistent PortalAppShell (sidebar must not remount on nav). */
export function isPortalShellRoute(pathname: string): boolean {
  if (!pathname) return false
  return (
    pathname === '/dashboard'
    || pathname === '/statusabfrage'
    || pathname === '/projects'
    || pathname.startsWith('/project/')
    || pathname.startsWith('/decisions')
    || pathname.startsWith('/benachrichtigungen')
    || pathname.startsWith('/messages')
    || pathname.startsWith('/inbox')
    || pathname.startsWith('/deliverables')
    || pathname.startsWith('/captures')
    || pathname.startsWith('/executive')
    || pathname.startsWith('/objectives')
    || pathname.startsWith('/activity')
    || pathname.startsWith('/teams')
    || pathname.startsWith('/issues')
    || pathname.startsWith('/connectors')
    || pathname.startsWith('/tagro')
    || pathname.startsWith('/reports')
    || pathname.startsWith('/workspace')
    || pathname.startsWith('/tasks')
    || pathname.startsWith('/docs')
    || pathname === '/documents'
    || pathname === '/download'
    || pathname === '/invite'
  )
}
