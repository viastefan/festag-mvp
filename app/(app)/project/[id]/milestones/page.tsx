'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, CreditCard, Invoice, Bank, ArrowRight } from '@phosphor-icons/react'

type Milestone = {
  id: string
  title: string
  description: string | null
  amount: number
  currency: string
  percentage: number | null
  status: string
  template_key: string | null
  order_index: number
  paid_at: string | null
  confirmed_by_client_at: string | null
}

export default function MilestonesPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const supabase = useMemo(() => createClient(), [])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      (supabase as any).from('milestones').select('*').eq('project_id', projectId).order('order_index'),
      (supabase as any).from('projects').select('id,title,milestone_structure_confirmed,budget_max,budget_currency').eq('id', projectId).maybeSingle(),
    ]).then(([mRes, pRes]) => {
      setMilestones(mRes.data || [])
      setProject(pRes.data)
      setLoading(false)
    })
  }, [projectId, supabase])

  const totalAmount = milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0)
  const allConfirmed = project?.milestone_structure_confirmed
  const fmt = (n: number) => `${n.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`

  const handleConfirm = async () => {
    setConfirming(true)
    const res = await fetch(`/api/projects/${projectId}/milestones/confirm`, { method: 'POST' })
    if (res.ok) {
      setProject((p: any) => ({ ...p, milestone_structure_confirmed: true }))
      const mRes = await (supabase as any).from('milestones').select('*').eq('project_id', projectId).order('order_index')
      setMilestones(mRes.data || [])
    }
    setConfirming(false)
  }

  const handlePay = async (milestoneId: string, method: 'stripe' | 'mollie' | 'invoice') => {
    setPayingId(milestoneId)
    try {
      if (method === 'stripe') {
        const res = await fetch('/api/payments/stripe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestoneId }),
        })
        const data = await res.json()
        if (data.checkoutUrl) window.location.href = data.checkoutUrl
      } else if (method === 'mollie') {
        const m = milestones.find(ms => ms.id === milestoneId)
        const res = await fetch('/api/payments/mollie', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: m?.amount,
            description: `${project?.title} — ${m?.title}`,
            metadata: { projectId, milestoneId },
            redirectUrl: `${window.location.origin}/project/${projectId}/milestones?paid=${milestoneId}`,
          }),
        })
        const data = await res.json()
        if (data.checkoutUrl) window.location.href = data.checkoutUrl
      } else {
        await fetch('/api/payments/invoice', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestoneId }),
        })
        const mRes = await (supabase as any).from('milestones').select('*').eq('project_id', projectId).order('order_index')
        setMilestones(mRes.data || [])
      }
    } finally {
      setPayingId(null)
    }
  }

  if (loading) return <div style={pageStyle}><p style={{ color: '#8E8E93' }}>Laden…</p></div>
  if (!milestones.length) return <div style={pageStyle}><p style={{ color: '#8E8E93' }}>Noch kein Zahlungsplan vorhanden.</p></div>

  return (
    <div style={pageStyle}>
      <h1 style={{ fontSize: 22, fontWeight: 500, color: '#0F0F10', margin: '0 0 6px', letterSpacing: '0.012em' }}>
        Zahlungsplan
      </h1>
      <p style={{ fontSize: 14, color: '#8E8E93', margin: '0 0 24px', letterSpacing: '0.017em' }}>
        {project?.title} — Gesamt: {fmt(totalAmount)}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {milestones.map(m => (
          <div key={m.id} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: '#0F0F10', margin: 0, letterSpacing: '0.012em' }}>
                {m.title}
              </h3>
              {m.status === 'paid' && <CheckCircle size={20} weight="fill" style={{ color: '#34C759' }} />}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 500, color: '#0F0F10' }}>{fmt(Number(m.amount))}</span>
              {m.percentage != null && (
                <span style={{ fontSize: 12, color: '#8E8E93' }}>({m.percentage}%)</span>
              )}
            </div>

            {m.status === 'paid' ? (
              <div style={{ fontSize: 13, color: '#34C759', letterSpacing: '0.017em' }}>
                Bezahlt{m.paid_at ? ` am ${new Date(m.paid_at).toLocaleDateString('de-DE')}` : ''}
              </div>
            ) : m.status === 'pending' && allConfirmed ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handlePay(m.id, 'stripe')}
                  disabled={!!payingId}
                  style={payBtnStyle}
                >
                  <CreditCard size={14} /> Karte
                </button>
                <button
                  onClick={() => handlePay(m.id, 'mollie')}
                  disabled={!!payingId}
                  style={{ ...payBtnStyle, background: '#F7F7F8', color: '#3D4150' }}
                >
                  <Bank size={14} /> SEPA
                </button>
                <button
                  onClick={() => handlePay(m.id, 'invoice')}
                  disabled={!!payingId}
                  style={{ ...payBtnStyle, background: '#F7F7F8', color: '#3D4150' }}
                >
                  <Invoice size={14} /> Rechnung
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#8E8E93', letterSpacing: '0.017em' }}>
                {m.status === 'locked' ? 'Wartet auf Bestätigung' : m.status}
              </div>
            )}
          </div>
        ))}
      </div>

      {!allConfirmed && (
        <button
          onClick={handleConfirm}
          disabled={confirming}
          style={{
            ...payBtnStyle,
            width: '100%', height: 48, marginTop: 20, fontSize: 15,
            background: '#5B647D',
          }}
        >
          {confirming ? 'Wird bestätigt…' : 'Zahlungsplan bestätigen'} <ArrowRight size={16} />
        </button>
      )}
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  maxWidth: 560, margin: '0 auto', padding: '40px 20px',
  fontFamily: 'var(--font-aeonik, Aeonik, system-ui, sans-serif)',
}
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: 20,
  boxShadow: '0 4px 16px rgba(0,0,0,.05)',
}
const payBtnStyle: React.CSSProperties = {
  flex: 1, height: 38, borderRadius: 10, border: 'none',
  background: '#5B647D', color: '#fff', fontSize: 13, fontWeight: 500,
  cursor: 'pointer', letterSpacing: '0.017em',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}
