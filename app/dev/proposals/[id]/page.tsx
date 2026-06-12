'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, CurrencyEur, ArrowLeft } from '@phosphor-icons/react'

type Proposal = {
  id: string
  project_id: string
  status: string
  dev_proposed_price: number | null
  dev_clarification_translated: string | null
  client_response_translated: string | null
  role_on_project: string
  is_team_lead: boolean
  project: {
    title: string
    description: string | null
    scope_summary: string | null
    budget_min: number | null
    budget_max: number | null
    budget_currency: string
    budget_note: string | null
    desired_start_date: string | null
    delivery_model: string | null
  } | null
  client: { name: string; avatar: string | null } | null
}

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [clarifyMode, setClarifyMode] = useState(false)
  const [price, setPrice] = useState('')
  const [clarification, setClarification] = useState('')
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dev/proposals/list')
      .then(r => r.json())
      .then(data => {
        const found = (data.proposals || []).find((p: any) => p.id === id)
        setProposal(found || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const handleAccept = async () => {
    setActionLoading(true)
    await fetch(`/api/dev/proposals/${id}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    setDone('accepted')
    setActionLoading(false)
  }

  const handleDecline = async () => {
    setActionLoading(true)
    await fetch(`/api/dev/proposals/${id}/decline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    setDone('declined')
    setActionLoading(false)
  }

  const handleClarify = async () => {
    if (!price && !clarification.trim()) return
    setActionLoading(true)
    await fetch(`/api/dev/proposals/${id}/clarify-budget`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposedPrice: price ? Number(price) : undefined,
        clarificationRaw: clarification.trim() || undefined,
      }),
    })
    setDone('clarified')
    setActionLoading(false)
  }

  const fmt = (n: number | null) => n != null ? `${n.toLocaleString('de-DE')} €` : '–'

  if (loading) return <div style={pageStyle}><p style={{ color: '#8E8E93' }}>Laden…</p></div>
  if (!proposal) return <div style={pageStyle}><p style={{ color: '#8E8E93' }}>Proposal nicht gefunden.</p></div>

  if (done) {
    const msgs: Record<string, string> = {
      accepted: 'Du hast das Projekt angenommen. Tagro bereitet die nächsten Schritte vor.',
      declined: 'Du hast das Projekt abgelehnt.',
      clarified: 'Dein Preisvorschlag wurde an den Auftraggeber weitergeleitet.',
    }
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            {done === 'declined' ? <XCircle size={48} weight="regular" style={{ color: '#8E8E93' }} /> : <CheckCircle size={48} weight="regular" style={{ color: '#34C759' }} />}
            <p style={{ fontSize: 16, fontWeight: 500, color: '#0F0F10', marginTop: 16 }}>{msgs[done]}</p>
            <button onClick={() => router.push('/dev/projects')} style={linkBtnStyle}>
              <ArrowLeft size={14} /> Zurück zu Projekten
            </button>
          </div>
        </div>
      </div>
    )
  }

  const p = proposal.project

  return (
    <div style={pageStyle}>
      <button onClick={() => router.push('/dev/projects')} style={{ ...linkBtnStyle, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Zurück
      </button>

      <div style={cardStyle}>
        {proposal.client && (
          <div style={{ fontSize: 13, color: '#8E8E93', marginBottom: 8, letterSpacing: '0.017em' }}>
            Auftraggeber: {proposal.client.name}
          </div>
        )}

        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#0F0F10', margin: '0 0 8px', letterSpacing: '0.012em' }}>
          {p?.title || 'Projekt'}
        </h1>

        {p?.scope_summary && (
          <p style={{ fontSize: 14, color: '#3D4150', lineHeight: 1.55, margin: '0 0 20px', letterSpacing: '0.017em' }}>
            {p.scope_summary}
          </p>
        )}

        {p?.budget_note && (
          <div style={{ background: '#F7F7F8', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#8E8E93', marginBottom: 6, letterSpacing: '0.023em' }}>Briefing-Notiz</div>
            <p style={{ fontSize: 14, color: '#3D4150', margin: 0, lineHeight: 1.5 }}>{p.budget_note}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, background: '#F7F7F8', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#8E8E93', marginBottom: 4, letterSpacing: '0.023em' }}>Budget-Rahmen</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#0F0F10' }}>
              {p?.budget_min && p?.budget_max ? `${fmt(p.budget_min)} – ${fmt(p.budget_max)}` : fmt(p?.budget_max ?? null)}
            </div>
          </div>
          {p?.desired_start_date && (
            <div style={{ flex: 1, background: '#F7F7F8', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#8E8E93', marginBottom: 4, letterSpacing: '0.023em' }}>Gewünschter Start</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#0F0F10' }}>{p.desired_start_date}</div>
            </div>
          )}
        </div>

        {proposal.client_response_translated && (
          <div style={{ background: '#FFF8F0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#B8860B', marginBottom: 6, letterSpacing: '0.023em' }}>Antwort vom Auftraggeber</div>
            <p style={{ fontSize: 14, color: '#3D4150', margin: 0, lineHeight: 1.5 }}>{proposal.client_response_translated}</p>
          </div>
        )}

        {proposal.is_team_lead && (
          <div style={{ fontSize: 12, color: '#5B647D', marginBottom: 16, letterSpacing: '0.017em' }}>
            Du wirst als Team Lead für dieses Projekt vorgeschlagen.
          </div>
        )}

        {!clarifyMode ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAccept} disabled={actionLoading} style={primaryBtnStyle}>
              Annehmen
            </button>
            <button onClick={() => setClarifyMode(true)} disabled={actionLoading} style={secondaryBtnStyle}>
              <CurrencyEur size={14} /> Preis-Klarstellung
            </button>
            <button onClick={handleDecline} disabled={actionLoading} style={declineBtnStyle}>
              Ablehnen
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Dein Preisvorschlag in EUR"
              style={inputStyle}
            />
            <textarea
              value={clarification}
              onChange={e => setClarification(e.target.value)}
              placeholder="Begründung — warum passt der Rahmen nicht zum Umfang?"
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical' as any }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleClarify} disabled={actionLoading || (!price && !clarification.trim())} style={primaryBtnStyle}>
                Vorschlag senden
              </button>
              <button onClick={() => setClarifyMode(false)} style={secondaryBtnStyle}>
                Zurück
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  maxWidth: 560, margin: '0 auto', padding: '40px 20px',
  fontFamily: 'var(--font-aeonik, Aeonik, system-ui, sans-serif)',
}
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: 28,
  boxShadow: '0 8px 30px rgba(0,0,0,.08)',
}
const primaryBtnStyle: React.CSSProperties = {
  flex: 1, height: 44, borderRadius: 10, border: 'none',
  background: '#5B647D', color: '#fff', fontSize: 14, fontWeight: 500,
  cursor: 'pointer', letterSpacing: '0.017em',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}
const secondaryBtnStyle: React.CSSProperties = {
  flex: 1, height: 44, borderRadius: 10,
  border: '1px solid #E6E9EE', background: '#fff',
  color: '#3D4150', fontSize: 14, fontWeight: 500,
  cursor: 'pointer', letterSpacing: '0.017em',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}
const declineBtnStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, padding: '0 20px',
  border: '1px solid #E6E9EE', background: '#fff',
  color: '#8E8E93', fontSize: 14, fontWeight: 500,
  cursor: 'pointer', letterSpacing: '0.017em',
}
const inputStyle: React.CSSProperties = {
  width: '100%', height: 44, borderRadius: 10, border: '1px solid #E6E9EE',
  padding: '0 14px', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box' as any,
}
const linkBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#5B647D',
  fontSize: 13, cursor: 'pointer', display: 'inline-flex',
  alignItems: 'center', gap: 6, padding: 0, letterSpacing: '0.017em',
}
