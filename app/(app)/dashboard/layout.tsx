'use client'

/**
 * Dashboard — eigener Viewport ohne ClientAppShell.
 * Mobile: Figma 252:59 Vollbild. Desktop: StatusPrompter füllt den Screen.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-layout-root">
      {children}
      <style jsx global>{`
        .dashboard-layout-root {
          min-height: 100dvh;
          height: 100dvh;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          body.festag-dashboard-mobile {
            overflow: hidden !important;
          }
          body.festag-dashboard-mobile .festag-app-shell,
          body.festag-dashboard-mobile .sidebar,
          body.festag-dashboard-mobile .bottom-nav,
          body.festag-dashboard-mobile .mob-bar,
          body.festag-dashboard-mobile .mcd,
          body.festag-dashboard-mobile .tmb,
          body.festag-dashboard-mobile .app-footer-controls {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
