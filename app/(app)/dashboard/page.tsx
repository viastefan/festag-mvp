import { Suspense } from 'react'
import DashboardPageClient from './DashboardPageClient'

export default function DashboardPage() {
  return (
    <Suspense
      fallback={(
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #7B8294)' }}>
          Lade…
        </div>
      )}
    >
      <DashboardPageClient />
    </Suspense>
  )
}
