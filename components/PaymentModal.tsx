'use client'

import { useEffect, useRef, useState } from 'react'

export type BankData = {
  reference: string
  amount_eur: string
  currency: string
  bank_account: { holder: string; iban: string; bic: string }
  instruction?: string
}

export const PAYMENT_POLL_DURATION_MS = 2 * 60 * 1000

type Props = {
  amount: number          // EUR (Zahl, z.B. 890)
  note: string            // Zweck/Beschreibung
  itemTitle: string       // Anzeige im Modal
  onClose: () => void
  onSuccess: (reference: string) => void   // Zahlung in 2 Min bestätigt
  onTimeout: (reference: string) => void   // Polling abgelaufen, manuelle Aktivierung
  // Resume-Modus: bereits erstellte Zahlungs-Session wieder aufnehmen
  resumeFrom?: { bankData: BankData; startedAt: number }
  // Wird gerufen sobald bankData verfügbar ist (zum Persistieren der Session)
  onSessionReady?: (bankData: BankData, startedAt: number) => void
}

const POLL_INTERVAL_MS = 5_000
const POLL_DURATION_MS = PAYMENT_POLL_DURATION_MS  // 2 Minuten

export default function PaymentModal({ amount, note, itemTitle, onClose, onSuccess, onTimeout, resumeFrom, onSessionReady }: Props) {
  const isResume = !!resumeFrom
  const [phase, setPhase] = useState<'init' | 'await' | 'done' | 'timeout' | 'error'>(isResume ? 'await' : 'init')
  const [error, setError] = useState('')
  const [bankData, setBankData] = useState<BankData | null>(resumeFrom?.bankData ?? null)
  const [secondsLeft, setSecondsLeft] = useState(Math.round(POLL_DURATION_MS / 1000))
  const [copied, setCopied] = useState<string | null>(null)
  const tickRef = useRef<any>(null)
  const pollRef = useRef<any>(null)
  const startedAtRef = useRef<number>(resumeFrom?.startedAt ?? 0)

  // Mount-Refs: einfrieren der initial-Props
  const initialResumeRef = useRef<typeof resumeFrom>(resumeFrom)
  const amountRef = useRef(amount)
  const noteRef = useRef(note)
  const onSessionReadyRef = useRef(onSessionReady)
  onSessionReadyRef.current = onSessionReady

  // Hard-Lock: max EIN create_payment-Call pro Komponenten-Lifetime,
  // egal was Strict Mode, Re-Renders oder Effekt-Re-Runs versuchen.
  const createCalledRef = useRef(false)

  // Step 1: Create payment — laeuft maximal einmal pro Mount.
  // Bei Resume-Mount wird komplett uebersprungen.
  useEffect(() => {
    if (initialResumeRef.current) return
    if (createCalledRef.current) return
    createCalledRef.current = true

    let cancelled = false
    fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountRef.current, note: noteRef.current }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.error) { setError(data.error); setPhase('error'); return }
        setBankData(data as BankData)
        setPhase('await')
        const start = Date.now()
        startedAtRef.current = start
        onSessionReadyRef.current?.(data as BankData, start)
      })
      .catch(e => { if (!cancelled) { setError(e?.message ?? 'Verbindungsfehler'); setPhase('error') } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Step 2: Polling + Countdown — laeuft sobald Bankdaten + await-Phase bereit
  const onSuccessRef = useRef(onSuccess)
  const onTimeoutRef = useRef(onTimeout)
  onSuccessRef.current = onSuccess
  onTimeoutRef.current = onTimeout

  useEffect(() => {
    if (phase !== 'await' || !bankData) return
    if (!startedAtRef.current) startedAtRef.current = Date.now()

    const elapsed0 = Date.now() - startedAtRef.current
    if (elapsed0 >= POLL_DURATION_MS) {
      setPhase('timeout')
      onTimeoutRef.current(bankData.reference)
      return
    }

    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current
      const left = Math.max(0, Math.round((POLL_DURATION_MS - elapsed) / 1000))
      setSecondsLeft(left)
      if (elapsed >= POLL_DURATION_MS) {
        clearInterval(tickRef.current)
        clearInterval(pollRef.current)
        setPhase('timeout')
        onTimeoutRef.current(bankData.reference)
      }
    }, 1000)

    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/payments/check?reference=${encodeURIComponent(bankData.reference)}`)
        const d = await r.json()
        if (d.status === 'done') {
          clearInterval(tickRef.current)
          clearInterval(pollRef.current)
          setPhase('done')
          onSuccessRef.current(bankData.reference)
        }
      } catch { /* still polling */ }
    }, POLL_INTERVAL_MS)

    return () => {
      clearInterval(tickRef.current)
      clearInterval(pollRef.current)
    }
  }, [phase, bankData])

  // Auto-close on done/timeout after a short delay
  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(onClose, 2500)
      return () => clearTimeout(t)
    }
    if (phase === 'timeout') {
      const t = setTimeout(onClose, 4500)
      return () => clearTimeout(t)
    }
  }, [phase, onClose])

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1300)
    })
  }

  const min = Math.floor(secondsLeft / 60)
  const sec = String(secondsLeft % 60).padStart(2, '0')
  const progressPct = phase === 'await'
    ? Math.min(100, ((POLL_DURATION_MS - secondsLeft * 1000) / POLL_DURATION_MS) * 100)
    : 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget && phase !== 'await') onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500, padding: 16, backdropFilter: 'blur(4px)',
        animation: 'fadeIn .2s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
      <div
        style={{
          width: '100%', maxWidth: 460, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          animation: 'slideIn .25s cubic-bezier(.16,1,.3,1) both',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', margin: 0 }}>
                ZAHLUNGSABWICKLUNG · ENJYN
              </p>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {itemTitle}
              </h2>
            </div>
            {phase !== 'await' && (
              <button onClick={onClose} aria-label="Schließen" style={{ width: 30, height: 30, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', overflowY: 'auto' }}>

          {phase === 'init' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 14px' }} />
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0 }}>Erzeuge Zahlungsdaten…</p>
            </div>
          )}

          {phase === 'error' && (
            <div style={{ padding: '20px 16px', background: 'var(--red-bg)', border: '1px solid rgba(200,80,80,.2)', borderRadius: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)', margin: '0 0 6px' }}>Zahlung konnte nicht erstellt werden</p>
              <p style={{ fontSize: 12.5, color: 'var(--red)', margin: 0 }}>{error}</p>
            </div>
          )}

          {phase === 'await' && bankData && (
            <>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.06em' }}>BETRAG</span>
                  <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{bankData.amount_eur} {bankData.currency}</span>
                </div>

                {[
                  { label: 'Empfänger',         value: bankData.bank_account.holder, key: 'holder' },
                  { label: 'IBAN',              value: bankData.bank_account.iban,   key: 'iban' },
                  { label: 'BIC',               value: bankData.bank_account.bic,    key: 'bic' },
                  { label: 'Verwendungszweck',  value: bankData.reference,           key: 'ref', highlight: true },
                ].map(row => (
                  <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: '1px solid var(--border)', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{row.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: row.highlight ? 700 : 500, color: 'var(--text)', fontFamily: row.key === 'iban' || row.key === 'bic' || row.key === 'ref' ? 'ui-monospace, Menlo, monospace' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.value}
                      </span>
                      <button onClick={() => copy(row.value, row.key)} title="Kopieren" style={{ padding: '3px 7px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
                        {copied === row.key ? '✓' : 'Kopieren'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 10, padding: '11px 14px', marginBottom: 14 }}>
                <p style={{ fontSize: 12.5, color: 'var(--green-dark)', margin: 0, lineHeight: 1.5 }}>
                  <strong>Tipp:</strong> Nutze eine <strong>Echtzeit-Überweisung (SEPA Instant)</strong>, damit dein Paket innerhalb weniger Minuten freigeschaltet wird.
                </p>
              </div>

              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Warte auf Zahlungseingang…</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'ui-monospace, Menlo, monospace' }}>{min}:{sec}</span>
                </div>
                <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--text)', transition: 'width .9s linear' }} />
                </div>
                <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: '8px 0 0', textAlign: 'center' }}>
                  Wird automatisch erkannt. Du musst nichts tun.
                </p>
              </div>
            </>
          )}

          {phase === 'done' && bankData && (
            <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--green-bg)', border: '2px solid var(--green-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>Zahlung erhalten</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Dein Add-on wurde freigeschaltet und ist jetzt aktiv.
              </p>
            </div>
          )}

          {phase === 'timeout' && bankData && (
            <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>Zahlung noch nicht erkannt</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.55 }}>
                Kein Problem — sobald deine Überweisung eingeht, wird das Paket automatisch innerhalb der nächsten <strong>24 Stunden</strong> aktiviert.
              </p>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
                Verwendungszweck: <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: 'var(--text)', fontWeight: 600 }}>{bankData.reference}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
