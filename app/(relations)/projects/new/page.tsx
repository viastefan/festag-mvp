'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, FloppyDisk } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'

const STATUS_OPTIONS = [
  { value: 'draft',  label: 'Entwurf' },
  { value: 'active', label: 'Aktiv' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('draft')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Bitte gib einen Titel ein.'); return }
    setError('')
    setSaving(true)

    const sb = createClient()
    const { data: user } = await sb.auth.getUser()
    if (!user.user) { setSaving(false); return }

    const { error: dbError } = await sb.from('rel_projects').insert({
      user_id: user.user.id,
      title: title.trim(),
      description: description.trim() || null,
      status,
      budget_min: budgetMin ? parseFloat(budgetMin) : null,
      budget_max: budgetMax ? parseFloat(budgetMax) : null,
      currency: 'EUR',
    })

    if (dbError) {
      setError('Fehler beim Speichern: ' + dbError.message)
      setSaving(false)
      return
    }

    router.push('/relations/projects')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 14px',
    background: 'var(--inp)', border: '1px solid var(--inp-border)',
    borderRadius: 10, fontSize: 14, color: 'var(--text)',
    fontFamily: 'inherit', fontWeight: 500, outline: 'none',
    transition: 'border-color .15s, background .15s',
  }

  return (
    <div className="page-content" style={{ maxWidth: 640 }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .3, ease: [.16, 1, .3, 1] }}
      >
        {/* Back link */}
        <Link href="/relations/projects" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none',
          marginBottom: 20, transition: 'color .12s',
        }}>
          <ArrowLeft size={14} />
          Zurück zu Projekte
        </Link>

        <div className="page-header">
          <h1>Neues Projekt</h1>
          <p>Erstelle ein neues Relations-Projekt.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              Titel *
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="z.B. Website Redesign"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--inp-focus-border)'; e.currentTarget.style.background = 'var(--inp-focus)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--inp-border)'; e.currentTarget.style.background = 'var(--inp)' }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung des Projekts…"
              rows={4}
              style={{
                ...inputStyle,
                height: 'auto', padding: '12px 14px',
                resize: 'vertical', lineHeight: 1.5,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--inp-focus-border)'; e.currentTarget.style.background = 'var(--inp-focus)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--inp-border)'; e.currentTarget.style.background = 'var(--inp)' }}
            />
          </div>

          {/* Status */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Budget */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              Budget (optional)
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  value={budgetMin}
                  onChange={e => setBudgetMin(e.target.value)}
                  placeholder="Min"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--inp-focus-border)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--inp-border)' }}
                />
              </div>
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>–</span>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  value={budgetMax}
                  onChange={e => setBudgetMax(e.target.value)}
                  placeholder="Max"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--inp-focus-border)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--inp-border)' }}
                />
              </div>
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>EUR</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 18,
              background: 'var(--red-bg)', border: '1px solid var(--red)',
              fontSize: 13, color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="tap-scale"
            style={{
              width: '100%', height: 48, borderRadius: 12,
              background: 'var(--btn-prim)', color: 'var(--btn-prim-text)',
              border: 'none', fontSize: 15, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              opacity: saving ? .6 : 1, transition: 'opacity .15s',
            }}
          >
            {saving ? (
              <div style={{ width: 18, height: 18, border: '2px solid var(--btn-prim-text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            ) : (
              <>
                <FloppyDisk size={17} weight="bold" />
                Projekt erstellen
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
