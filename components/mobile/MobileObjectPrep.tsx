'use client'

/**
 * MobileObjectPrep — Codex meeting-prep layout for task/project detail on mobile.
 * Hero with avatars, title, checklist sections, Tagro follow-up bar.
 */

import type { ReactNode } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import CodexMobileTopBar from '@/components/mobile/CodexMobileTopBar'
import { openTagro } from '@/components/TagroOverlay'

export type PrepSection = {
  title: string
  items: { id: string; label: string; done?: boolean }[]
}

type Props = {
  backHref: string
  title: string
  subtitle?: string
  avatars?: { label: string; color?: string }[]
  sections: PrepSection[]
  contextLines?: string[]
  tagroContext?: { type: string; id: string; title?: string }
  footer?: ReactNode
}

export default function MobileObjectPrep({
  backHref,
  title,
  subtitle,
  avatars = [],
  sections,
  contextLines = [],
  tagroContext,
  footer,
}: Props) {
  return (
    <div className="mop">
      <CodexMobileTopBar left="back" right="none" onLeft={() => { window.location.href = backHref }} />

      <div className="mop-hero">
        {avatars.length > 0 && (
          <div className="mop-avatars" aria-hidden>
            {avatars.slice(0, 3).map((a, i) => (
              <span
                key={a.label + i}
                className="mop-av"
                style={{
                  background: a.color || '#5B647D',
                  zIndex: 3 - i,
                  marginLeft: i > 0 ? -14 : 0,
                }}
              >
                {a.label.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </div>
        )}
        <h1 className="mop-title">{title}</h1>
        {subtitle ? <p className="mop-sub">{subtitle}</p> : null}
      </div>

      <div className="mop-body">
        {sections.map(sec => (
          <section key={sec.title} className="mop-section">
            <h2 className="mop-sec-title">{sec.title}</h2>
            <ul className="mop-list">
              {sec.items.map(item => (
                <li key={item.id} className={`mop-item${item.done ? ' done' : ''}`}>
                  <span className="mop-check" aria-hidden />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {contextLines.length > 0 && (
          <section className="mop-section">
            <h2 className="mop-sec-title">Hintergrund</h2>
            <ul className="mop-context">
              {contextLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {tagroContext && (
        <div className="mop-foot">
          <button
            type="button"
            className="mop-ask"
            onClick={() => openTagro({
              contextType: tagroContext.type as any,
              id: tagroContext.id,
              title: tagroContext.title,
            })}
          >
            <span className="mop-ask-ph">Mit Tagro besprechen …</span>
            <span className="mop-ask-go" aria-hidden>
              <Sparkle size={16} weight="fill" />
            </span>
          </button>
        </div>
      )}

      {footer}

      <style jsx>{`
        .mop {
          display: none;
        }
        @media (max-width: 768px) {
          .mop {
            display: flex;
            flex-direction: column;
            min-height: 0;
            font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
            color: #0f0f10;
            background: #fff;
            position: relative;
          }
          .mop-hero {
            padding: calc(64px + env(safe-area-inset-top, 0px)) 24px 20px;
            text-align: left;
          }
          .mop-avatars {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            min-height: 52px;
          }
          .mop-av {
            width: 52px; height: 52px;
            border-radius: 999px;
            border: 3px solid #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 500;
            color: #fff;
            box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
          }
          .mop-title {
            margin: 0;
            font-size: 28px;
            font-weight: 500;
            line-height: 1.15;
            letter-spacing: -0.02em;
          }
          .mop-sub {
            margin: 10px 0 0;
            font-size: 15px;
            font-weight: 400;
            color: #6e717e;
            line-height: 1.4;
          }
          .mop-body {
            flex: 1;
            overflow-y: auto;
            padding: 0 24px 120px;
          }
          .mop-section { margin-bottom: 28px; }
          .mop-sec-title {
            margin: 0 0 12px;
            font-size: 16px;
            font-weight: 500;
            letter-spacing: -0.01em;
          }
          .mop-list {
            list-style: none;
            margin: 0; padding: 0;
            display: flex; flex-direction: column; gap: 10px;
          }
          .mop-item {
            display: flex; align-items: flex-start; gap: 12px;
            font-size: 15px; font-weight: 400;
            line-height: 1.45;
            color: #202532;
          }
          .mop-item.done { color: #90959f; text-decoration: line-through; }
          .mop-check {
            width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px;
            border-radius: 6px;
            border: 1.5px solid rgba(15, 15, 16, 0.14);
            background: #f4f4f5;
          }
          .mop-item.done .mop-check {
            background: #5b647d;
            border-color: #5b647d;
          }
          .mop-context {
            margin: 0; padding-left: 18px;
            font-size: 15px; font-weight: 400;
            line-height: 1.55; color: #4e5567;
          }
          .mop-foot {
            position: sticky;
            bottom: 0;
            padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
            background: linear-gradient(to top, #fff 70%, transparent);
          }
          .mop-ask {
            width: 100%;
            display: flex; align-items: center; gap: 10px;
            min-height: 48px;
            padding: 0 6px 0 16px;
            border: 0;
            border-radius: 999px;
            background: #f2f2f3;
            cursor: pointer;
            font: inherit;
          }
          .mop-ask-ph {
            flex: 1;
            text-align: left;
            font-size: 15px;
            font-weight: 400;
            color: #90959f;
          }
          .mop-ask-go {
            width: 40px; height: 40px;
            border-radius: 999px;
            background: #1c1c1e;
            color: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
        }
      `}</style>
    </div>
  )
}
