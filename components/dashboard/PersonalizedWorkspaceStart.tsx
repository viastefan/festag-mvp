'use client'

/**
 * Calm first-paint from Tagro personalization — not a hardcoded empty dashboard.
 * Welcome Experience after /preparing.
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
    animation: pwsIn .55s cubic-bezier(.22,1,.36,1) both;
  }
  .pws-title {
    margin: 0;
    font-size: 28px;
    line-height: 1.22;
    letter-spacing: -0.025em;
    font-weight: 400;
    color: var(--festag-night-ink, var(--text, #1e1e20));
  }
  .pws-sub {
    margin: 12px 0 0;
    font-size: 15.5px;
    line-height: 1.55;
    color: #8891a0;
    max-width: 42ch;
  }
  .pws-modules {
    list-style: none;
    margin: 26px 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pws-module {
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    letter-spacing: 0.01em;
    color: var(--festag-night-ink, #1e1e20);
    background: rgba(91, 100, 125, 0.10);
    border: 1px solid rgba(91, 100, 125, 0.18);
  }
  html[data-theme="dark"] .pws-module,
  html[data-theme="classic-dark"] .pws-module {
    color: #E6E8EE;
    background: rgba(91, 100, 125, 0.14);
    border-color: rgba(91, 100, 125, 0.28);
  }
  .pws-priorities {
    margin: 22px 0 0;
    padding: 0 0 0 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pws-priorities li {
    font-size: 14.5px;
    line-height: 1.45;
    letter-spacing: 0.01em;
    color: var(--festag-night-ink-2, #5c5c62);
  }
  html[data-theme="dark"] .pws-priorities li,
  html[data-theme="classic-dark"] .pws-priorities li {
    color: #8891a0;
  }
  .pws-actions {
    margin-top: 28px;
  }
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
    font: inherit;
    font-size: 14px;
    letter-spacing: 0.01em;
    text-decoration: none;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    white-space: nowrap;
    transition: background .15s ease, box-shadow .15s ease;
  }
  .pws-cta:hover {
    background: #fafafa;
  }
  .pws-cta:active {
    background: #f5f5f6;
    box-shadow: none;
  }
  html[data-theme="dark"] .pws-cta,
  html[data-theme="classic-dark"] .pws-cta {
    background: #EBE8E3;
    color: #1A1917;
    border-color: transparent;
    box-shadow: none;
  }
  html[data-theme="dark"] .pws-cta:hover,
  html[data-theme="classic-dark"] .pws-cta:hover {
    background: #DDD9D2;
  }
  @keyframes pwsIn {
    from {
      opacity: 0;
      transform: translateY(12px);
      filter: blur(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pws-start { animation: none !important; }
  }
`
