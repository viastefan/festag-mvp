'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, Minus, FloppyDisk, PaperPlaneTilt, X, CurrencyEur,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

type Item = {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

type QuoteData = {
  id?: string
  title: string
  description: string
  items: Item[]
  tax_rate: number
  valid_until: string
  notes: string
  status?: string
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function emptyItem(): Item {
  return { id: uid(), description: '', quantity: 1, unit_price: 0, total: 0 }
}

const fmtCur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

export default function RelationsQuoteBuilder({
  projectId,
  initialData,
  onSaved,
  onCancel,
}: {
  projectId: string
  initialData?: QuoteData | null
  onSaved: () => void
  onCancel: () => void
}) {
  const isEdit = !!initialData?.id

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [items, setItems] = useState<Item[]>(
    initialData?.items?.length ? initialData.items : [emptyItem()]
  )
  const [taxRate, setTaxRate] = useState(initialData?.tax_rate ?? 19)
  const [validUntil, setValidUntil] = useState(
    initialData?.valid_until
      ? new Date(initialData.valid_until).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Calculations
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  function updateItem(id: string, field: keyof Item, value: string | number) {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it
        const updated = { ...it, [field]: value }
        updated.total = updated.quantity * updated.unit_price
        return updated
      })
    )
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()])
  }

  function removeItem(id: string) {
    if (items.length <= 1) return
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function save(sendNow: boolean) {
    if (!title.trim()) { setError('Bitte Titel eingeben'); return }
    if (items.some(i => !i.description.trim())) { setError('Alle Positionen brauchen eine Beschreibung'); return }

    setSaving(true)
    setError('')
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setError('Nicht eingeloggt'); setSaving(false); return }

    const payload = {
      project_id: projectId,
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      items: items.map(({ id, ...rest }) => rest),
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      currency: 'EUR',
      status: sendNow ? 'sent' : 'draft',
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      notes: notes.trim() || null,
    }

    let err
    if (isEdit) {
      const { error: e } = await sb
        .from('rel_quotes')
        .update(payload)
        .eq('id', initialData!.id!)
      err = e
    } else {
      const { error: e } = await sb.from('rel_quotes').insert(payload)
      err = e
    }

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    setSaving(false)
    onSaved()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--inp)',
    color: 'var(--text)',
    fontSize: 14,
    fontFamily: 'inherit',
    fontWeight: 500,
    outline: 'none',
    transition: 'border-color .15s',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    display: 'block',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: .25, ease: [.16, 1, .3, 1] }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <h2 style={{ margin: 0 }}>{isEdit ? 'Angebot bearbeiten' : 'Neues Angebot'}</h2>
        <button
          onClick={onCancel}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)',
            transition: 'color .12s, background .12s',
          }}
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: 'var(--red-bg)', border: '1px solid var(--red)',
          color: 'var(--red)', fontSize: 13, fontWeight: 600,
          marginBottom: 18,
        }}>
          {error}
        </div>
      )}

      {/* Title & Description */}
      <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Titel *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="z.B. Website Redesign Angebot"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Beschreibung</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optionale Beschreibung zum Angebot..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* Positionen */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Positionen</h3>
          <button
            onClick={addItem}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background .12s, color .12s',
            }}
          >
            <Plus size={12} weight="bold" />
            Position
          </button>
        </div>

        <AnimatePresence mode="popLayout">
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: .2, ease: [.16, 1, .3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px',
                marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em' }}>
                    POSITION {idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.id)}
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        border: '1px solid var(--border)', background: 'var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--red)',
                        transition: 'background .12s',
                      }}
                    >
                      <Minus size={12} weight="bold" />
                    </button>
                  )}
                </div>

                <div style={{ marginBottom: 8 }}>
                  <input
                    value={item.description}
                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Beschreibung der Leistung"
                    style={{ ...inputStyle, fontSize: 13 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 10.5 }}>Menge</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', Math.max(1, Number(e.target.value)))}
                      style={{ ...inputStyle, fontSize: 13, textAlign: 'right' }}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 10.5 }}>Einzelpreis</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unit_price}
                      onChange={e => updateItem(item.id, 'unit_price', Math.max(0, Number(e.target.value)))}
                      style={{ ...inputStyle, fontSize: 13, textAlign: 'right' }}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 10.5 }}>Gesamt</label>
                    <div style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: 'var(--surface-2)', fontSize: 13,
                      fontWeight: 700, color: 'var(--text)',
                      textAlign: 'right',
                    }}>
                      {fmtCur(item.quantity * item.unit_price)}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Summen */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '18px 20px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Zwischensumme</span>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtCur(subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>MwSt.</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={taxRate}
              onChange={e => setTaxRate(Number(e.target.value))}
              style={{
                width: 60, padding: '4px 8px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--inp)',
                color: 'var(--text)', fontSize: 12, fontFamily: 'inherit',
                fontWeight: 600, textAlign: 'right', outline: 'none',
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>%</span>
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtCur(taxAmount)}</span>
        </div>
        <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>Gesamtbetrag</span>
          <span style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CurrencyEur size={16} weight="bold" />
            {fmtCur(total)}
          </span>
        </div>
      </div>

      {/* Gültig bis + Notizen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div>
          <label style={labelStyle}>Gültig bis</label>
          <input
            type="date"
            value={validUntil}
            onChange={e => setValidUntil(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Notizen</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optionale Anmerkungen..."
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: '10px 20px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surface)',
            fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background .12s',
          }}
        >
          Abbrechen
        </button>
        <button
          onClick={() => save(false)}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--card)',
            fontSize: 13, fontWeight: 700, color: 'var(--text)',
            cursor: 'pointer', fontFamily: 'inherit',
            opacity: saving ? .6 : 1,
            transition: 'opacity .12s, background .12s',
          }}
        >
          <FloppyDisk size={15} weight="bold" />
          {saving ? 'Speichert...' : 'Als Entwurf'}
        </button>
        <button
          onClick={() => save(true)}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 10,
            border: 'none', background: 'var(--btn-prim)',
            fontSize: 13, fontWeight: 700, color: 'var(--btn-prim-text)',
            cursor: 'pointer', fontFamily: 'inherit',
            opacity: saving ? .6 : 1,
            transition: 'opacity .12s',
          }}
        >
          <PaperPlaneTilt size={15} weight="bold" />
          {saving ? 'Sendet...' : 'Senden'}
        </button>
      </div>
    </motion.div>
  )
}
