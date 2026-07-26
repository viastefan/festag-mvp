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
          flex: 1 1 auto;
          min-height: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        @media (min-width: 901px) {
          .dashboard-layout-root .portal-app-main-col,
          .portal-app-shell.portal-sidebar-collapsed .dashboard-layout-root .portal-app-main-col {
            padding: 0 !important;
          }
          .dashboard-layout-root .portal-app-main,
          .portal-app-shell.portal-sidebar-collapsed .dashboard-layout-root .portal-app-main {
            border-radius: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
          }
          .dashboard-layout-root .dash-calm .st-ex {
            padding: 0 0 0 var(--st-ex-pad-x, clamp(24px, 10vw, 164px));
          }
        }
        @media (max-width: 768px) {
          body.festag-dashboard-mobile {
            overflow: hidden !important;
          }
          body.festag-dashboard-mobile .portal-app-nav-col,
          body.festag-dashboard-mobile .festag-app-shell,
          body.festag-dashboard-mobile .sidebar,
          body.festag-dashboard-mobile .bottom-nav,
          body.festag-dashboard-mobile .mob-bar,
          body.festag-dashboard-mobile .mcd,
          body.festag-dashboard-mobile .tmb,
          body.festag-dashboard-mobile .app-footer-controls {
            display: none !important;
          }
          body.festag-dashboard-mobile .portal-app-main-col {
            margin-left: 0 !important;
            padding: 0 !important;
          }
          body.festag-dashboard-mobile .portal-app-main {
            border-radius: 0 !important;
            border: 0 !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  )
}
