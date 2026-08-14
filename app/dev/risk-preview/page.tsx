'use client'

/** Dev-Preview für die Mobile-Risiko-Screens — ohne Auth, nur zum Ansehen. */

import DashboardMobileOverview from '@/components/dashboard/DashboardMobileOverview'

export default function RiskPreviewPage() {
  return (
    <DashboardMobileOverview
      greeting="Guten Morgen, Stefan."
      scopeLabel="Gesamtbericht"
      onRiskResolved={(id, result) => console.log('bewertet', id, result)}
    />
  )
}
