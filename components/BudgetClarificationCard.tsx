'use client'

import { useState } from 'react'
import { ArrowRight, CurrencyEur, ChatCircleDots } from '@phosphor-icons/react'

type Props = {
  proposalId: string
  projectId: string
  projectTitle: string
  devName: string | null
  devAvatar: string | null
  budgetMin: number | null
  budgetMax: number | null
  devProposedPrice: number | null
  devClarification: string | null
  onAccept?: () => void
  onAdjust?: (response: string, adjustedPrice?: number) => void
  onDecline?: () => void
}

export default function BudgetClarificationCard({
  proposalId,
  projectId,
  projectTitle,
  devName,
  devAvatar,
  budgetMin,
  budgetMax,
  devProposedPrice,
  devClarification,
  onAccept,
  onAdjust,
  onDecline,
}: Props) {
  const [mode, setMode] = useState<'view' | 'adjust'>('view')
  const [responseText, setResponseText] = useState('')
  const [adjustedPrice, setAdjustedPrice] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      await fetch(`/api/projects/${projectId}/proposals/${proposalId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      })
      onAccept?.()
    } finally {
      setLoading(false)
    }
  }

  const handleAdjust = async () => {
    if (!responseText.trim()) return
    setLoading(true)
    try {
      await fetch(`/api/projects/${projectId}/proposals/${proposalId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust',
          clientResponseRaw: responseText,
          adjustedPrice: adjustedPrice ? Number(adjustedPrice) : undefined,
        }),
      })
      onAdjust?.(responseText, adjustedPrice ? Number(adjustedPrice) : undefined)
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    setLoading(true)
    try {
      await fetch(`/api/projects/${projectId}/proposals/${proposalId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      })
      onDecline?.()
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n: number | null) => n != null ? `${n.toLocaleString('de-DE')} €` : '–'

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: 28,
      boxShadow: '0 8px 30px rgba(0,0,0,.08)',
      fontFamily: 'var(--font-aeonik, Aeonik, system-ui, sans-serif)',
      maxWidth: 480,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <CurrencyEur size={20} weight="regular" style={{ color: '#5B647D' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: '#5B647D', letterSpacing: '0.017em' }}>
          Budget-Klärung
        </span>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 500, color: '#0F0F10', margin: '0 0 6px', letterSpacing: '0.012em' }}>
        {projectTitle}
      </h3>

      {devClarification && (
        <p style={{ fontSize: 14, color: '#3D4150', lineHeight: 1.55, margin: '0 0 20px', letterSpacing: '0.017em' }}>
          {devClarification}
        </p>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, background: '#F7F7F8', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#8E8E93', marginBottom: 4, letterSpacing: '0.023em' }}>Dein Rahmen</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#0F0F10' }}>
            {budgetMin && budgetMax ? `${fmt(budgetMin)} – ${fmt(budgetMax)}` : fmt(budgetMax)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ArrowRight size={16} style={{ color: '#8E8E93' }} />
        </div>
        <div style={{ flex: 1, background: '#F0F4FF', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#5B647D', marginBottom: 4, letterSpacing: '0.023em' }}>Vorschlag</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#0F0F10' }}>
            {fmt(devProposedPrice)}
          </div>
        </div>
      </div>

      {mode === 'view' ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleAccept}
            disabled={loading}
            style={{
              flex: 1, height: 40, borderRadius: 10, border: 'none',
              background: '#5B647D', color: '#fff', fontSize: 13, fontWeight: 500,
              cursor: loading ? 'wait' : 'pointer', letterSpacing: '0.017em',
            }}
          >
            Annehmen
          </button>
          <button
            onClick={() => setMode('adjust')}
            disabled={loading}
            style={{
              flex: 1, height: 40, borderRadius: 10,
              border: '1px solid #E6E9EE', background: '#fff',
              color: '#3D4150', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', letterSpacing: '0.017em',
            }}
          >
            Anpassen
          </button>
          <button
            onClick={handleDecline}
            disabled={loading}
            style={{
              height: 40, borderRadius: 10, padding: '0 16px',
              border: '1px solid #E6E9EE', background: '#fff',
              color: '#8E8E93', fontSize: 13, fontWeight: 500,
              cursor: loading ? 'wait' : 'pointer', letterSpacing: '0.017em',
            }}
          >
            Ablehnen
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={responseText}
            onChange={e => setResponseText(e.target.value)}
            placeholder="Deine Antwort..."
            style={{
              width: '100%', minHeight: 80, borderRadius: 10, border: '1px solid #E6E9EE',
              padding: '10px 14px', fontSize: 14, fontFamily: 'inherit',
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <input
            type="number"
            value={adjustedPrice}
            onChange={e => setAdjustedPrice(e.target.value)}
            placeholder="Dein angepasster Preis (optional, in EUR)"
            style={{
              width: '100%', height: 40, borderRadius: 10, border: '1px solid #E6E9EE',
              padding: '0 14px', fontSize: 14, fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAdjust}
              disabled={loading || !responseText.trim()}
              style={{
                flex: 1, height: 40, borderRadius: 10, border: 'none',
                background: '#5B647D', color: '#fff', fontSize: 13, fontWeight: 500,
                cursor: loading ? 'wait' : 'pointer', letterSpacing: '0.017em',
                opacity: !responseText.trim() ? 0.5 : 1,
              }}
            >
              Senden
            </button>
            <button
              onClick={() => setMode('view')}
              style={{
                height: 40, borderRadius: 10, padding: '0 16px',
                border: '1px solid #E6E9EE', background: '#fff',
                color: '#8E8E93', fontSize: 13, cursor: 'pointer',
              }}
            >
              Zurück
            </button>
          </div>
        </div>
      )}

      {devName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
          {devAvatar ? (
            <img src={devAvatar} alt="" style={{ width: 24, height: 24, borderRadius: 12, objectFit: 'cover' }} />
          ) : (
            <ChatCircleDots size={20} style={{ color: '#8E8E93' }} />
          )}
          <span style={{ fontSize: 12, color: '#8E8E93', letterSpacing: '0.023em' }}>{devName}</span>
        </div>
      )}
    </div>
  )
}
