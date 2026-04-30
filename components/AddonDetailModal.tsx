'use client'

import type { Addon } from '@/lib/addons-catalog'

type Props = {
  addon: Addon
  status: 'active' | 'pending' | undefined
  projectTitle?: string
  onClose: () => void
  onBuy: () => void
  onAssignProject?: () => void
}

export default function AddonDetailModal({ addon, status, projectTitle, onClose, onBuy, onAssignProject }: Props) {
  const isActive = status === 'active'
  const isPending = status === 'pending'

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 400, padding: 16, backdropFilter: 'blur(4px)',
        animation: 'fadeIn .2s ease',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 560, background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        animation: 'slideIn .25s cubic-bezier(.16,1,.3,1) both',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', margin: 0 }}>
                {addon.category.toUpperCase()}
                {addon.popular && <span style={{ marginLeft: 8, padding: '1px 7px', borderRadius: 4, background: 'var(--accent)', color: 'var(--accent-text)', fontSize: 9, letterSpacing: '.06em' }}>BELIEBT</span>}
              </p>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0' }}>{addon.name}</h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.5 }}>{addon.description}</p>
            </div>
            <button onClick={onClose} aria-label="Schliessen" style={{ width: 30, height: 30, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>

          {/* Status-Banner */}
          {(isActive || isPending) && (
            <div style={{
              marginTop: 14, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
              background: isActive ? 'var(--green-bg)' : 'rgba(255,176,0,.12)',
              border: `1px solid ${isActive ? 'var(--green-border)' : 'rgba(255,176,0,.25)'}`,
              borderRadius: 8,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? 'var(--green)' : 'var(--amber)', animation: isPending ? 'pulse 2s infinite' : 'none' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? 'var(--green-dark)' : '#A66E00' }}>
                {isActive ? `Aktiv${projectTitle ? ` für ${projectTitle}` : ''}` : 'Ausstehend — Zahlung wird erwartet'}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '18px 24px 8px', overflowY: 'auto' }}>

          {/* Features */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', margin: '0 0 10px' }}>WAS DU BEKOMMST</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {addon.features.map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 4 }}><path d="M5 13l4 4L19 7"/></svg>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dev-Anweisung — als Befehl an das Team */}
          <div style={{ marginBottom: 18, padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
              ANWEISUNG AN DAS TEAM
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              {addon.devInstructions}
            </p>
            {addon.estimatedHours && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0' }}>
                Geschätzter Aufwand: <strong style={{ color: 'var(--text)' }}>{addon.estimatedHours} Stunden</strong>
              </p>
            )}
          </div>

          {/* Tags */}
          {addon.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 18 }}>
              {addon.tags.map(t => (
                <span key={t} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '3px 8px', borderRadius: 6, textTransform: 'lowercase' }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.06em', margin: 0 }}>EINMALIG</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '2px 0 0' }}>€{addon.price.toLocaleString('de')}</p>
          </div>
          {isActive ? (
            onAssignProject ? (
              <button onClick={onAssignProject} className="tap-scale" style={{
                padding: '11px 18px', background: 'var(--text)', color: '#fff', border: 'none',
                borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Projekt zuweisen →
              </button>
            ) : null
          ) : isPending ? (
            <button disabled style={{
              padding: '11px 18px', background: 'var(--surface-2)', color: 'var(--text-muted)', border: 'none',
              borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'default', fontFamily: 'inherit',
            }}>
              Wartet auf Zahlung
            </button>
          ) : (
            <button onClick={onBuy} className="tap-scale" style={{
              padding: '11px 22px', background: 'var(--text)', color: '#fff', border: 'none',
              borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Jetzt kaufen →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
