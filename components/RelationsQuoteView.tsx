'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, PencilSimple, Trash, Printer,
  Check, X as XIcon, Clock, PaperPlaneTilt,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'

type QuoteItem = {
  description: string
  quantity: number
  unit_price: number
  total: number
}

type Quote = {
  id: string
  project_id: string
  created_by: string
  title: string
  description: string | null
  items: QuoteItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: string
  status: string
  valid_until: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<any> }> = {
  draft:    { label: 'Entwurf',     color: 'var(--text-muted)',      bg: 'var(--surface-2)',  icon: PencilSimple },
  sent:     { label: 'Gesendet',    color: 'var(--amber)',           bg: 'var(--amber-bg)',   icon: PaperPlaneTilt },
  accepted: { label: 'Angenommen', color: 'var(--green)',           bg: 'var(--green-bg)',   icon: Check },
  rejected: { label: 'Abgelehnt',  color: 'var(--red)',             bg: 'var(--red-bg)',     icon: XIcon },
  expired:  { label: 'Abgelaufen', color: 'var(--text-muted)',      bg: 'var(--surface-2)',  icon: Clock },
}

const fmtCur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })

export default function RelationsQuoteView({
  quote,
  onBack,
  onEdit,
  onDeleted,
}: {
  quote: Quote
  onBack: () => void
  onEdit: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const st = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft
  const StIcon = st.icon

  async function updateStatus(newStatus: string) {
    setUpdatingStatus(true)
    const sb = createClient()
    await sb.from('rel_quotes').update({ status: newStatus }).eq('id', quote.id)
    quote.status = newStatus
    setUpdatingStatus(false)
    onBack()
  }

  async function deleteQuote() {
    if (!confirm('Angebot wirklich löschen?')) return
    setDeleting(true)
    const sb = createClient()
    await sb.from('rel_quotes').delete().eq('id', quote.id)
    setDeleting(false)
    onDeleted()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .25, ease: [.16, 1, .3, 1] }}
    >
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'var(--text-muted)', background: 'none',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          marginBottom: 20, padding: 0,
          transition: 'color .12s',
        }}
      >
        <ArrowLeft size={14} />
        Alle Angebote
      </button>

      {/* Print area */}
      <div className="quote-print-area" style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)', padding: '28px 28px 24px',
        marginBottom: 16,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: '0 0 4px' }}>{quote.title}</h2>
            {quote.description && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{quote.description}</p>
            )}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 8,
            background: st.bg, color: st.color,
            fontSize: 12, fontWeight: 600,
          }}>
            <StIcon size={13} weight="bold" />
            {st.label}
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 10.5, letterSpacing: '.05em', display: 'block', marginBottom: 2 }}>ERSTELLT</span>
            {fmtDate(quote.created_at)}
          </div>
          {quote.valid_until && (
            <div>
              <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 10.5, letterSpacing: '.05em', display: 'block', marginBottom: 2 }}>GÜLTIG BIS</span>
              {fmtDate(quote.valid_until)}
            </div>
          )}
          <div>
            <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 10.5, letterSpacing: '.05em', display: 'block', marginBottom: 2 }}>WÄHRUNG</span>
            {quote.currency}
          </div>
        </div>

        {/* Items table */}
        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.05em' }}>BESCHREIBUNG</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.05em', width: 80 }}>MENGE</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.05em', width: 120 }}>EINZELPREIS</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, letterSpacing: '.05em', width: 120 }}>GESAMT</th>
              </tr>
            </thead>
            <tbody>
              {(quote.items as QuoteItem[]).map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--text)', fontWeight: 500 }}>{item.description}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtCur(item.unit_price)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtCur(item.total ?? item.quantity * item.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
          gap: 6, fontSize: 13,
        }}>
          <div style={{ display: 'flex', gap: 32, width: 260, justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Zwischensumme</span>
            <span style={{ fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtCur(quote.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', gap: 32, width: 260, justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>MwSt. ({quote.tax_rate}%)</span>
            <span style={{ fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtCur(quote.tax_amount)}</span>
          </div>
          <div style={{ height: 1, background: 'var(--border)', width: 260, margin: '4px 0' }} />
          <div style={{ display: 'flex', gap: 32, width: 260, justifyContent: 'space-between', fontSize: 16 }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>Gesamt</span>
            <span style={{ fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtCur(quote.total)}</span>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div style={{
            marginTop: 20, padding: '14px 16px',
            background: 'var(--surface)', borderRadius: 10,
            border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', margin: '0 0 4px' }}>ANMERKUNGEN</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{quote.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Status actions */}
        {quote.status === 'draft' && (
          <button
            onClick={() => updateStatus('sent')}
            disabled={updatingStatus}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 9,
              background: 'var(--btn-prim)', color: 'var(--btn-prim-text)',
              border: 'none', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              opacity: updatingStatus ? .6 : 1,
            }}
          >
            <PaperPlaneTilt size={13} weight="bold" />
            Senden
          </button>
        )}
        {quote.status === 'sent' && (
          <>
            <button
              onClick={() => updateStatus('accepted')}
              disabled={updatingStatus}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 9,
                background: 'var(--green-bg)', color: 'var(--green)',
                border: '1px solid var(--green-border)', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Check size={13} weight="bold" />
              Annehmen
            </button>
            <button
              onClick={() => updateStatus('rejected')}
              disabled={updatingStatus}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 9,
                background: 'var(--red-bg)', color: 'var(--red)',
                border: '1px solid var(--red)', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <XIcon size={13} weight="bold" />
              Ablehnen
            </button>
          </>
        )}

        <button
          onClick={onEdit}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 9,
            background: 'var(--surface)', border: '1px solid var(--border)',
            fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background .12s',
          }}
        >
          <PencilSimple size={13} weight="bold" />
          Bearbeiten
        </button>

        <button
          onClick={() => window.print()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 9,
            background: 'var(--surface)', border: '1px solid var(--border)',
            fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background .12s',
          }}
        >
          <Printer size={13} weight="bold" />
          Drucken
        </button>

        <button
          onClick={deleteQuote}
          disabled={deleting}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 9,
            background: 'var(--red-bg)', border: '1px solid var(--red)',
            fontSize: 12, fontWeight: 600, color: 'var(--red)',
            cursor: 'pointer', fontFamily: 'inherit',
            marginLeft: 'auto',
            opacity: deleting ? .6 : 1,
          }}
        >
          <Trash size={13} weight="bold" />
          Löschen
        </button>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .quote-print-area, .quote-print-area * { visibility: visible; }
          .quote-print-area {
            position: absolute; left: 0; top: 0;
            width: 100%; background: white !important;
            border: none !important; box-shadow: none !important;
            padding: 40px !important; border-radius: 0 !important;
          }
          .quote-print-area table { border-collapse: collapse; }
          .quote-print-area td, .quote-print-area th { border-bottom: 1px solid #ddd !important; }
        }
      `}</style>
    </motion.div>
  )
}
