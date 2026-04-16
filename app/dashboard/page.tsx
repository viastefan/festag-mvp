import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>Festag</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{user.email}</span>
          <LogoutButton />
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Willkommen zurück 👋
        </h2>
        <p style={{ color: 'var(--muted)', marginBottom: 32, fontSize: 14 }}>
          Hier siehst du deine Festag-Übersicht.
        </p>

        {/* Placeholder cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            { label: 'Aktive Buchungen', value: '–' },
            { label: 'Nächstes Event', value: '–' },
            { label: 'Offene Rechnungen', value: '–' },
          ].map(card => (
            <div key={card.label} style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '20px 24px'
            }}>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{card.label}</p>
              <p style={{ fontSize: 28, fontWeight: 700 }}>{card.value}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
