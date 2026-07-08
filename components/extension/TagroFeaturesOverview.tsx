'use client'

import { ChatsCircle, PencilLine, Sparkle } from '@phosphor-icons/react'
import { TAGRO_FEATURES } from '@/lib/extension/tagro-setup'

const ICONS = {
  writing: PencilLine,
  capture: ChatsCircle,
  style: Sparkle,
} as const

type Props = {
  className?: string
}

export default function TagroFeaturesOverview({ className = '' }: Props) {
  return (
    <>
      <section className={`tfo ${className}`.trim()} aria-label="Was Tagro kann">
        <div className="tfo-grid">
          {TAGRO_FEATURES.map((feature) => {
            const Icon = ICONS[feature.id]
            return (
              <article key={feature.id} className="tfo-card">
                <span className="tfo-icon" aria-hidden>
                  <Icon size={18} weight="regular" />
                </span>
                <div className="tfo-copy">
                  <h3 className="tfo-title">{feature.title}</h3>
                  <p className="tfo-text">{feature.copy}</p>
                  <p className="tfo-sites">{feature.sites}</p>
                </div>
              </article>
            )
          })}
        </div>
      </section>
      <style suppressHydrationWarning>{CSS}</style>
    </>
  )
}

const CSS = `
  .tfo { margin: 20px 0; }
  .tfo-grid {
    display: grid;
    gap: 10px;
  }
  @media (min-width: 640px) {
    .tfo-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  .tfo-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border-radius: 14px;
    background: #f5f5f7;
    border: 1px solid rgba(0, 0, 0, 0.04);
  }
  [data-theme="dark"] .tfo-card,
  [data-theme="classic-dark"] .tfo-card {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .tfo-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #5B647D;
    color: #fff;
  }
  .tfo-title {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--portal-text, #1d1d1f);
  }
  .tfo-text {
    margin: 0 0 6px;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--portal-muted, #86868b);
  }
  .tfo-sites {
    margin: 0;
    font-size: 11px;
    font-weight: 500;
    color: #5B647D;
  }
`
