'use client'

import { useContext } from 'react'
import { CheckCircle, Circle, WarningCircle } from '@phosphor-icons/react'
import { TagroHealthContext, TagroHealthProvider, useTagroHealth } from '@/components/extension/TagroHealthProvider'
import { countChecklistDone } from '@/lib/extension/tagro-health-logic'

type Props = {
  className?: string
}

function TagroHealthCardInner({ className = '' }: Props) {
  const {
    checking,
    ready,
    checklist,
    sessionLoading,
    refreshAll,
  } = useTagroHealth()

  if (checking) {
    return (
      <>
        <div className={`thc thc--checking ${className}`.trim()}>
          <span className="thc-dot" aria-hidden />
          <span>Tagro-Status wird geprüft…</span>
        </div>
        <style suppressHydrationWarning>{CSS}</style>
      </>
    )
  }

  const doneCount = countChecklistDone(checklist)

  return (
    <>
      <section className={`thc ${ready ? 'thc--ready' : 'thc--pending'} ${className}`.trim()} aria-label="Tagro Status">
        <div className="thc-head">
          <div>
            <p className="thc-kicker">Setup-Checkliste</p>
            <h3 className="thc-title">
              {ready ? 'Alles bereit' : `${doneCount} von ${checklist.length} Schritten erledigt`}
            </h3>
          </div>
          <button type="button" className="thc-refresh" onClick={refreshAll} disabled={sessionLoading}>
            {sessionLoading ? 'Prüft…' : 'Aktualisieren'}
          </button>
        </div>

        <ol className="thc-list" role="list">
          {checklist.map((item) => (
            <li key={item.id} className={`thc-item${item.done ? ' thc-item--done' : ''}`}>
              <span className="thc-icon" aria-hidden>
                {item.done ? (
                  <CheckCircle size={18} weight="fill" />
                ) : item.id === 'backend' && !item.done && item.detail.includes('nicht bereit') ? (
                  <WarningCircle size={18} weight="regular" />
                ) : item.id === 'extension-auth' && !item.done && item.detail.includes('keine Session') ? (
                  <WarningCircle size={18} weight="regular" />
                ) : (
                  <Circle size={18} weight="regular" />
                )}
              </span>
              <div className="thc-copy">
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
                {item.action ? (
                  <a className="thc-action" href={item.action.href}>
                    {item.action.label}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>
      <style suppressHydrationWarning>{CSS}</style>
    </>
  )
}

export default function TagroHealthCard(props: Props) {
  const ctx = useContext(TagroHealthContext)
  if (!ctx) {
    return (
      <TagroHealthProvider>
        <TagroHealthCardInner {...props} />
      </TagroHealthProvider>
    )
  }
  return <TagroHealthCardInner {...props} />
}

const CSS = `
  .thc {
    margin-bottom: 18px;
    padding: 16px;
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.06);
    background: #f5f5f7;
  }
  .thc--ready {
    background: #f0fdf4;
    border-color: rgba(22, 101, 52, 0.12);
  }
  .thc--checking {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 14px;
    background: #f5f5f7;
    font-size: 13px;
    color: var(--portal-muted, #86868b);
    margin-bottom: 18px;
  }
  .thc-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #86868b;
    animation: thc-pulse 1s ease-in-out infinite;
  }
  @keyframes thc-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  [data-theme="dark"] .thc,
  [data-theme="classic-dark"] .thc {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }
  [data-theme="dark"] .thc--ready,
  [data-theme="classic-dark"] .thc--ready {
    background: rgba(22, 101, 52, 0.12);
    border-color: rgba(22, 101, 52, 0.2);
  }
  .thc-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .thc-kicker {
    margin: 0 0 4px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--portal-muted, #86868b);
  }
  .thc-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--portal-text, #1d1d1f);
  }
  .thc--ready .thc-title { color: #166534; }
  .thc-refresh {
    border: 0;
    background: transparent;
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    color: var(--portal-muted, #86868b);
    cursor: pointer;
    text-decoration: underline;
    flex-shrink: 0;
  }
  .thc-refresh:disabled { opacity: 0.6; cursor: default; }
  .thc-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .thc-item {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: 12px;
    background: #fff;
  }
  [data-theme="dark"] .thc-item,
  [data-theme="classic-dark"] .thc-item {
    background: rgba(255, 255, 255, 0.06);
  }
  .thc-item--done .thc-icon { color: #166534; }
  .thc-icon {
    flex-shrink: 0;
    color: #86868b;
    margin-top: 1px;
  }
  .thc-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .thc-copy strong {
    font-size: 13px;
    font-weight: 500;
    color: var(--portal-text, #1d1d1f);
  }
  .thc-copy span {
    font-size: 12px;
    line-height: 1.45;
    color: var(--portal-muted, #86868b);
  }
  .thc-action {
    margin-top: 4px;
    font-size: 12px;
    font-weight: 500;
    color: #5B647D;
    text-decoration: none;
  }
  .thc-action:hover { text-decoration: underline; }
`
