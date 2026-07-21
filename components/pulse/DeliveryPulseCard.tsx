'use client'

/**
 * Delivery Pulse card — three calm lines for client/CEO clarity.
 * Mount on dashboard status chrome and /executive.
 */

import { useCallback, useEffect, useState } from 'react'
import { ArrowsClockwise } from '@phosphor-icons/react'
import ProofCapsules from '@/components/proof/ProofCapsules'
import type { DeliveryPulse, PulseHealth } from '@/lib/pulse/types'
import { fetchJson } from '@/lib/portal/fetch-api'

const HEALTH_LABEL: Record<PulseHealth, string> = {
  healthy: 'Planmäßig',
  watch: 'Im Blick',
  risk: 'Erhöhtes Risiko',
  blocked: 'Blockiert',
}

type Props = {
  scope?: 'overall' | 'project'
  projectId?: string | null
  /** Compact strip for executive page. */
  compact?: boolean
  className?: string
}

export default function DeliveryPulseCard({
  scope = 'overall',
  projectId = null,
  compact = false,
  className = '',
}: Props) {
  const [pulse, setPulse] = useState<DeliveryPulse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true)
    else setLoading(true)
    setError(null)

    const qs = new URLSearchParams({ scope })
    if (scope === 'project' && projectId) qs.set('projectId', projectId)

    if (force) {
      const res = await fetchJson<{ pulse: DeliveryPulse }>('/api/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, projectId, force: true, refine: true }),
      })
      if (res.ok && res.data?.pulse) setPulse(res.data.pulse)
      else setError(res.error || 'Pulse konnte nicht erzeugt werden.')
      setRefreshing(false)
      setLoading(false)
      return
    }

    const res = await fetchJson<{ pulse: DeliveryPulse }>(`/api/pulse?${qs.toString()}`)
    if (res.ok && res.data?.pulse) setPulse(res.data.pulse)
    else setError(res.error || 'Pulse konnte nicht geladen werden.')
    setLoading(false)
    setRefreshing(false)
  }, [scope, projectId])

  useEffect(() => {
    void load(false)
  }, [load])

  return (
    <section
      className={`delivery-pulse${compact ? ' delivery-pulse--compact' : ''}${className ? ` ${className}` : ''}`}
      aria-label="Delivery Pulse"
    >
      <style>{PULSE_CSS}</style>
      <header className="delivery-pulse-head">
        <div className="delivery-pulse-head-copy">
          <h2 className="delivery-pulse-title">Delivery Pulse</h2>
          {pulse ? (
            <span className={`delivery-pulse-health tone-${pulse.health}`}>
              {HEALTH_LABEL[pulse.health]}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="delivery-pulse-refresh"
          onClick={() => void load(true)}
          disabled={loading || refreshing}
          aria-label="Pulse aktualisieren"
        >
          <ArrowsClockwise size={16} weight="bold" className={refreshing ? 'is-spin' : undefined} />
        </button>
      </header>

      {loading && !pulse ? (
        <p className="delivery-pulse-muted">Verdichte Liefersignale…</p>
      ) : error && !pulse ? (
        <p className="delivery-pulse-muted">{error}</p>
      ) : pulse ? (
        <>
          <dl className="delivery-pulse-lines">
            <div>
              <dt>Fortschritt</dt>
              <dd>{pulse.progress}</dd>
            </div>
            <div>
              <dt>Risiko</dt>
              <dd>{pulse.risk}</dd>
            </div>
            <div>
              <dt>Nächster Schritt</dt>
              <dd>{pulse.next_step}</dd>
            </div>
          </dl>
          {pulse.proof.length > 0 ? (
            <ProofCapsules items={pulse.proof} compact />
          ) : null}
        </>
      ) : null}
    </section>
  )
}

const PULSE_CSS = `
  .delivery-pulse {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 22px 22px 20px;
    border-radius: 22px;
    background: var(--festag-glass-bg, rgba(255,255,255,0.58));
    border: 1px solid var(--festag-glass-border, rgba(255,255,255,0.62));
    box-shadow: var(--festag-glass-shadow-soft, 0 1px 2px rgba(15,23,42,0.04), 0 12px 32px rgba(15,23,42,0.06));
    backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
    -webkit-backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
  }
  .delivery-pulse--compact {
    padding: 18px 18px 16px;
    gap: 12px;
  }
  .delivery-pulse-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .delivery-pulse-head-copy {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .delivery-pulse-title {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 26px;
    font-weight: 400;
    letter-spacing: -0.022em;
    line-height: 1.22;
    color: var(--text, #1e1e20);
  }
  .delivery-pulse--compact .delivery-pulse-title {
    font-size: 22px;
  }
  .delivery-pulse-health {
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0.01em;
    color: #5c5c62;
  }
  .delivery-pulse-health.tone-healthy { color: #22a06b; }
  .delivery-pulse-health.tone-watch { color: #5c5c62; }
  .delivery-pulse-health.tone-risk { color: #d4882b; }
  .delivery-pulse-health.tone-blocked { color: #d44b4b; }
  .delivery-pulse-refresh {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    border: 1px solid #e5e5e6;
    background: #ffffff;
    color: #1e1e20;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    flex-shrink: 0;
  }
  .delivery-pulse-refresh:hover { background: #fafafa; }
  .delivery-pulse-refresh:disabled { opacity: 0.55; cursor: default; }
  .delivery-pulse-refresh .is-spin {
    animation: deliveryPulseSpin 0.8s linear infinite;
  }
  @keyframes deliveryPulseSpin {
    to { transform: rotate(360deg); }
  }
  .delivery-pulse-muted {
    margin: 0;
    font-size: 15.5px;
    line-height: 1.55;
    color: #5c5c62;
  }
  .delivery-pulse-lines {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .delivery-pulse-lines > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .delivery-pulse-lines dt {
    margin: 0;
    font-size: 12px;
    letter-spacing: 0.02em;
    color: #8891a0;
    font-weight: 400;
  }
  .delivery-pulse-lines dd {
    margin: 0;
    font-size: 15.5px;
    line-height: 1.55;
    letter-spacing: 0.002em;
    color: #1e1e20;
    font-weight: 400;
  }
  .delivery-pulse-proof {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .delivery-pulse-proof li {
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(30, 30, 32, 0.05);
    color: #5c5c62;
    font-size: 12.5px;
    line-height: 1.3;
    max-width: 100%;
  }
  [data-theme="dark"] .delivery-pulse,
  [data-theme="classic-dark"] .delivery-pulse {
    background: var(--festag-black-content, #0c0c0e);
    border-color: rgba(255,255,255,0.08);
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  [data-theme="dark"] .delivery-pulse-title,
  [data-theme="classic-dark"] .delivery-pulse-title,
  [data-theme="dark"] .delivery-pulse-lines dd,
  [data-theme="classic-dark"] .delivery-pulse-lines dd {
    color: #f5f5f7;
  }
  [data-theme="dark"] .delivery-pulse-muted,
  [data-theme="classic-dark"] .delivery-pulse-muted,
  [data-theme="dark"] .delivery-pulse-lines dt,
  [data-theme="classic-dark"] .delivery-pulse-lines dt,
  [data-theme="dark"] .delivery-pulse-proof li,
  [data-theme="classic-dark"] .delivery-pulse-proof li {
    color: rgba(245,245,247,0.68);
  }
  [data-theme="dark"] .delivery-pulse-proof li,
  [data-theme="classic-dark"] .delivery-pulse-proof li {
    background: rgba(255,255,255,0.06);
  }
  [data-theme="dark"] .delivery-pulse-refresh,
  [data-theme="classic-dark"] .delivery-pulse-refresh {
    background: rgba(186,194,210,0.11);
    border: 0;
    color: rgba(245,245,247,0.92);
    box-shadow: none;
  }
  @media (max-width: 768px) {
    .delivery-pulse-title { font-size: 28px; line-height: 1.18; }
    .delivery-pulse-lines dd { font-size: 16px; line-height: 1.55; }
  }
`
