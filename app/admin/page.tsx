import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // TODO: Admin-Rolle prüfen (z.B. via user_metadata oder separate Tabelle)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <header style={{
        background: '#111',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Festag <span style={{ color: '#2F6BFF' }}>Admin</span></h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#aaa' }}>{user.email}</span>
          <LogoutButton />
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Admin-Bereich</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 32, fontSize: 14 }}>
          Kundenverwaltung, Buchungen und Statistiken.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            { label: 'Kunden gesamt', value: '–' },
            { label: 'Buchungen heute', value: '–' },
            { label: 'Umsatz (Monat)', value: '–' },
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
