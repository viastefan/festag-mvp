'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, Bank, CheckCircle, CreditCard, Invoice, Receipt, Sparkle,
} from '@phosphor-icons/react'
import MobileCodexListChrome from '@/components/mobile/MobileCodexListChrome'
import { openTagro } from '@/components/TagroOverlay'
import { PROJECT_SUBPAGE_CSS } from '@/components/projects/project-subpages-styles'

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
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [projectTitle, setProjectTitle] = useState('')
  const [allConfirmed, setAllConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setMilestones(data.milestones ?? [])
      setProjectTitle(data.project?.title ?? '')
      setAllConfirmed(Boolean(data.project?.milestone_structure_confirmed))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  const totalAmount = useMemo(
    () => milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0),
    [milestones],
  )
  const fmt = (n: number) => `${n.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`

  const handleConfirm = async () => {
    setConfirming(true)
    const res = await fetch(`/api/projects/${projectId}/milestones/confirm`, { method: 'POST' })
    if (res.ok) {
      setAllConfirmed(true)
      await load()
    }
    setConfirming(false)
  }

  const handlePay = async (milestoneId: string, method: 'stripe' | 'mollie' | 'invoice') => {
    setPayingId(milestoneId)
    try {
      if (method === 'stripe') {
        const res = await fetch('/api/payments/stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestoneId }),
        })
        const data = await res.json()
        if (data.checkoutUrl) window.location.href = data.checkoutUrl
      } else if (method === 'mollie') {
        const m = milestones.find(ms => ms.id === milestoneId)
        const res = await fetch('/api/payments/mollie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: m?.amount,
            description: `${projectTitle} — ${m?.title}`,
            metadata: { projectId, milestoneId },
            redirectUrl: `${window.location.origin}/project/${projectId}/milestones?paid=${milestoneId}`,
          }),
        })
        const data = await res.json()
        if (data.checkoutUrl) window.location.href = data.checkoutUrl
      } else {
        await fetch('/api/payments/invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestoneId }),
        })
        await load()
      }
    } finally {
      setPayingId(null)
    }
  }

  const tagroHandler = () => openTagro({
    contextType: 'project',
    id: projectId,
    title: projectTitle || 'Meilensteine',
    subtitle: 'Zahlungsplan',
    projectId,
  })

  return (
    <MobileCodexListChrome
      className="pj-sub dec-os"
      title="Meilensteine."
      titleMobile="Zahlungsplan"
      subtitle={projectTitle ? `${projectTitle}, Gesamt ${fmt(totalAmount)}` : 'Meilensteine und Zahlungen'}
      extraCss={PROJECT_SUBPAGE_CSS}
      dock={{
        onDragUp: tagroHandler,
        primary: {
          id: 'tagro',
          label: 'Mit Tagro besprechen...',
          icon: <Sparkle size={14} weight="regular" />,
          onClick: tagroHandler,
          ariaLabel: 'Mit Tagro besprechen',
        },
        secondary: {
          id: 'back',
          icon: <Receipt size={20} weight="bold" />,
          onClick: () => { window.location.href = `/project/${projectId}` },
          ariaLabel: 'Zurück zum Projekt',
        },
      }}
    >
      <div className="pj-sub-shell">
        <Link href={`/project/${projectId}`} className="pj-sub-back">
          <ArrowLeft size={14} /> Zurück zum Projekt
        </Link>

        {loading ? (
          <p className="pj-sub-empty">Zahlungsplan wird geladen…</p>
        ) : milestones.length === 0 ? (
          <p className="pj-sub-empty">Noch kein Zahlungsplan vorhanden. Tagro kann Meilensteine vorschlagen, sobald Scope und Budget stehen.</p>
        ) : (
          <>
            <div className="pj-sub-total">
              <div>
                <strong>{fmt(totalAmount)}</strong>
                <div className="pj-sub-meta">Gesamtbudget</div>
              </div>
              <span>{milestones.length} Meilenstein{milestones.length === 1 ? '' : 'e'}</span>
            </div>

            <div className="pj-sub-cards">
              {milestones.map(m => (
                <article key={m.id} className="pj-sub-card">
                  <div className="pj-sub-card-head">
                    <h3>{m.title}</h3>
                    {m.status === 'paid' && <CheckCircle size={20} weight="fill" color="#34C759" />}
                  </div>
                  <div className="pj-sub-amount">
                    {fmt(Number(m.amount))}
                    {m.percentage != null && <span className="pj-sub-meta"> ({m.percentage}%)</span>}
                  </div>
                  {m.description && <p className="pj-sub-meta">{m.description}</p>}

                  {m.status === 'paid' ? (
                    <p className="pj-sub-meta" style={{ color: '#34C759' }}>
                      Bezahlt{m.paid_at ? ` am ${new Date(m.paid_at).toLocaleDateString('de-DE')}` : ''}
                    </p>
                  ) : m.status === 'pending' && allConfirmed ? (
                    <div className="pj-sub-pay-row">
                      <button type="button" className="pj-sub-pay" disabled={!!payingId} onClick={() => handlePay(m.id, 'stripe')}>
                        <CreditCard size={14} /> Karte
                      </button>
                      <button type="button" className="pj-sub-pay ghost" disabled={!!payingId} onClick={() => handlePay(m.id, 'mollie')}>
                        <Bank size={14} /> SEPA
                      </button>
                      <button type="button" className="pj-sub-pay ghost" disabled={!!payingId} onClick={() => handlePay(m.id, 'invoice')}>
                        <Invoice size={14} /> Rechnung
                      </button>
                    </div>
                  ) : (
                    <p className="pj-sub-meta">{m.status === 'locked' ? 'Wartet auf Bestätigung' : m.status}</p>
                  )}
                </article>
              ))}
            </div>

            {!allConfirmed && (
              <button type="button" className="pj-sub-confirm" disabled={confirming} onClick={handleConfirm}>
                {confirming ? 'Wird bestätigt…' : <>Zahlungsplan bestätigen <ArrowRight size={16} /></>}
              </button>
            )}
          </>
        )}
      </div>
    </MobileCodexListChrome>
  )
}
