'use client'

import { useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { TAGRO_TROUBLESHOOTING } from '@/lib/extension/tagro-setup'

type Props = {
  className?: string
}

export default function TagroTroubleshooting({ className = '' }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <>
      <section className={`tt ${className}`.trim()} aria-label="Hilfe bei Problemen">
        <p className="tt-kicker">Hilfe</p>
        <h3 className="tt-title">Häufige Probleme</h3>
        <div className="tt-list">
          {TAGRO_TROUBLESHOOTING.map((item) => {
            const open = openId === item.id
            return (
              <div key={item.id} className={`tt-item${open ? ' tt-item--open' : ''}`}>
                <button
                  type="button"
                  className="tt-trigger"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : item.id)}
                >
                  <span>{item.question}</span>
                  <CaretDown size={14} weight="bold" aria-hidden className="tt-caret" />
                </button>
                {open ? <p className="tt-answer">{item.answer}</p> : null}
              </div>
            )
          })}
        </div>
      </section>
      <style suppressHydrationWarning>{CSS}</style>
    </>
  )
}

const CSS = `
  .tt { margin-top: 24px; }
  .tt-kicker {
    margin: 0 0 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--portal-muted, #86868b);
  }
  .tt-title {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 600;
    color: var(--portal-text, #1d1d1f);
  }
  .tt-list {
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 14px;
    overflow: hidden;
  }
  [data-theme="dark"] .tt-list,
  [data-theme="classic-dark"] .tt-list {
    border-color: rgba(255, 255, 255, 0.08);
  }
  .tt-item { border-top: 1px solid rgba(0, 0, 0, 0.06); }
  .tt-item:first-child { border-top: 0; }
  [data-theme="dark"] .tt-item,
  [data-theme="classic-dark"] .tt-item {
    border-top-color: rgba(255, 255, 255, 0.08);
  }
  .tt-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border: 0;
    background: transparent;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    text-align: left;
    color: var(--portal-text, #1d1d1f);
    cursor: pointer;
  }
  .tt-trigger:hover { background: rgba(0, 0, 0, 0.02); }
  [data-theme="dark"] .tt-trigger:hover,
  [data-theme="classic-dark"] .tt-trigger:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .tt-caret {
    flex-shrink: 0;
    color: var(--portal-muted, #86868b);
    transition: transform .15s ease;
  }
  .tt-item--open .tt-caret { transform: rotate(180deg); }
  .tt-answer {
    margin: 0;
    padding: 0 14px 12px;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--portal-muted, #86868b);
  }
`
