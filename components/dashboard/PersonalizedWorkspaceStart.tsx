'use client'

/**
 * Calm first-paint from Tagro personalization — not a hardcoded empty dashboard.
 */

import Link from 'next/link'
import { moduleLabel, type PersonalizedWorkspace } from '@/lib/platform/workspace-personalization'

type Props = {
  personalization: PersonalizedWorkspace
  onStartProject?: () => void
}

export default function PersonalizedWorkspaceStart({ personalization, onStartProject }: Props) {
  return (
    <section
      className="pws-start"
      aria-label="Personalisierter Workspace"
    >
      <style>{CSS}</style>
      <h2 className="pws-title">{personalization.headline}</h2>
      <p className="pws-sub">{personalization.subtitle}</p>

      <ul className="pws-modules" aria-label="Vorbereitete Module">
        {personalization.modules.map((id) => (
          <li key={id} className="pws-module">
            {moduleLabel(id)}
          </li>
        ))}
      </ul>

      <ol className="pws-priorities">
        {personalization.priorities.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>

      <div className="pws-actions">
        {onStartProject ? (
          <button type="button" className="pws-cta" onClick={onStartProject}>
            Erstes Projekt starten
          </button>
        ) : (
          <Link href="/projects" className="pws-cta">
            Projekte öffnen
          </Link>
        )}
      </div>
    </section>
  )
}

const CSS = `
  .pws-start {
    width: 100%;
    max-width: 520px;
    margin: 0 auto;
    padding: 28px 8px 8px;
    text-align: left;
  }
  .pws-title {
    margin: 0;
    font-size: 26px;
    line-height: 1.25;
    letter-spacing: -0.02em;
    font-weight: 400;
    color: var(--festag-night-ink, #1e1e20);
  }
  .pws-sub {
    margin: 10px 0 0;
    font-size: 15px;
    line-height: 1.55;
    color: #8891a0;
  }
  .pws-modules {
    list-style: none;
    margin: 22px 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pws-module {
    padding: 8px 12px;
    border-radius: 10px;
    font-size: 13px;
    letter-spacing: 0.01em;
    color: rgba(30, 30, 32, 0.78);
    background: rgba(15, 23, 42, 0.04);
    border: 1px solid rgba(15, 23, 42, 0.06);
  }
  .pws-priorities {
    margin: 22px 0 0;
    padding: 0 0 0 1.1em;
    display: grid;
    gap: 8px;
    font-size: 14.5px;
    line-height: 1.45;
    color: rgba(30, 30, 32, 0.72);
  }
  .pws-actions { margin-top: 24px; }
  .pws-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    padding: 0 18px;
    border-radius: 8px;
    border: 1px solid rgba(30, 30, 32, 0.08);
    background: #ffffff;
    color: #1e1e20;
    font-size: 14px;
    font-weight: 400;
    text-decoration: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    cursor: pointer;
    white-space: nowrap;
  }
  .pws-cta:hover { background: #fafafa; }
  .pws-cta:active { background: #f5f5f6; box-shadow: none; }
  html[data-theme="dark"] .pws-title,
  html[data-theme="classic-dark"] .pws-title {
    color: var(--festag-night-ink, #E6E6EA);
  }
  html[data-theme="dark"] .pws-sub,
  html[data-theme="classic-dark"] .pws-sub {
    color: rgba(245, 245, 247, 0.55);
  }
  html[data-theme="dark"] .pws-module,
  html[data-theme="classic-dark"] .pws-module {
    color: rgba(230, 232, 238, 0.78);
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
  }
  html[data-theme="dark"] .pws-priorities,
  html[data-theme="classic-dark"] .pws-priorities {
    color: rgba(230, 232, 238, 0.62);
  }
  html[data-theme="dark"] .pws-cta,
  html[data-theme="classic-dark"] .pws-cta {
    background: #F0F2F5;
    color: #1A1A1E;
    border-color: transparent;
    box-shadow: none;
  }
`
