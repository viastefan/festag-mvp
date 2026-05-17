'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FestagLoader from '@/components/FestagLoader'

// ── Token-Capture für Mitbeobachter-Einladungen ──
//
// Owner teilt einen Link wie  https://festag.app/i/<token>.
// Hier passiert:
//   1. Token wird in localStorage abgelegt (für Auth-Callback)
//   2. Falls der User schon eingeloggt ist UND der Email-Match passt,
//      direkt RPC redeem_observer_invite aufrufen → /dashboard
//   3. Sonst: zum Register-Flow leiten mit E-Mail vorausgefüllt
//      (E-Mail aus workspace_observers via RPC ermittelt — keine PII-Leakage,
//       weil Token genug Eintritts-Sicherheit darstellt)

const TOKEN_KEY = 'festag_observer_token'

export default function ObserverInvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [label, setLabel] = useState('Einladung wird geprüft…')

  useEffect(() => {
    if (!token) { setError('Kein Token angegeben.'); return }
    const supabase = createClient()
    ;(async () => {
      try { localStorage.setItem(TOKEN_KEY, String(token)) } catch {}

      // Schon eingeloggt? Direkt einlösen.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setLabel('Zugriff wird verknüpft…')
        const { data, error: rpcErr } = await supabase.rpc('redeem_observer_invite', { token: String(token) })
        if (rpcErr) {
          // E-Mail-Mismatch oder ungültig
          if (/email mismatch/i.test(rpcErr.message)) {
            setError('Diese Einladung ist für eine andere E-Mail. Bitte mit der eingeladenen Adresse anmelden.')
          } else {
            setError('Einladung konnte nicht eingelöst werden.')
          }
          return
        }
        const rows = Array.isArray(data) ? data : []
        if (rows.length === 0) {
          setError('Diese Einladung ist nicht mehr gültig.')
          return
        }
        try { localStorage.removeItem(TOKEN_KEY) } catch {}
        router.replace('/dashboard?welcome=observer')
        return
      }

      // Nicht eingeloggt → zum Register-Flow.
      // Email kommt erst nach Auth-Sync — wir leiten generisch weiter.
      router.replace(`/register?next=${encodeURIComponent('/i/' + token)}`)
    })()
  }, [token, router])

  if (error) {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FCFCFD', padding: 24, fontFamily: "var(--font-aeonik, 'Aeonik', Inter, system-ui, sans-serif)" }}>
        <div style={{ maxWidth: 360, textAlign: 'center' }}>
          <p style={{ fontFamily: "'Qurova DEMO', serif", fontSize: 22, fontWeight: 500, marginBottom: 14, color: '#202532' }}>festag</p>
          <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 10, color: '#202532' }}>Einladung ungültig</h1>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#7B8294', marginBottom: 18 }}>{error}</p>
          <button onClick={() => router.replace('/login')} style={{ height: 42, padding: '0 22px', borderRadius: 999, background: '#5B647D', color: '#fff', border: 0, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Zur Anmeldung</button>
        </div>
      </main>
    )
  }

  return <FestagLoader fullscreen label={label} />
}
