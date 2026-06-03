'use client'

/**
 * Notebook UI primitives — Festag's calm, box-light surface system.
 *
 * Default to spacing + typography over borders/cards. Use these instead of
 * heavy Card/Panel/bordered-row components so every page reads like a premium
 * digital notebook rather than a SaaS dashboard. Styles live in globals.css
 * (.nb-*).
 *
 *   <NotebookPage title="Entscheidungen" status={{ text: 'Zwei blockieren Arbeit.', tone: 'warn' }}
 *                 action={<QuietAction primary>Entscheidung</QuietAction>}>
 *     <NotebookSection label="Offen">
 *       <NotebookList>
 *         <NotebookRow title="Budget erhöhen?" meta="Marketing · heute fällig" onClick={...} />
 *       </NotebookList>
 *     </NotebookSection>
 *   </NotebookPage>
 */

import type { ReactNode } from 'react'

type Tone = 'calm' | 'info' | 'warn' | 'risk'

const TONE_COLOR: Record<Tone, string> = {
  calm: '#3FB984',
  info: '#6a738c',
  warn: '#D4882B',
  risk: '#D9534F',
}

export function StatusSentence({ text, tone = 'info' }: { text: string; tone?: Tone }) {
  return (
    <p className="nb-status">
      <span className="nb-status-dot" style={{ background: TONE_COLOR[tone] }} aria-hidden />
      {text}
    </p>
  )
}

export function NotebookPage({
  title,
  status,
  action,
  children,
}: {
  title?: string
  status?: { text: string; tone?: Tone }
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="nb-page">
      {(title || action) && (
        <div className="nb-page-head">
          {title ? <h1 className="nb-page-title">{title}</h1> : <span />}
          {action}
        </div>
      )}
      {status && <StatusSentence text={status.text} tone={status.tone} />}
      {children}
    </div>
  )
}

export function NotebookSection({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="nb-section">
      {label && <span className="nb-section-label">{label}</span>}
      {children}
    </section>
  )
}

export function NotebookList({ children }: { children: ReactNode }) {
  return <div className="nb-list">{children}</div>
}

export function NotebookRow({
  title,
  meta,
  trailing,
  onClick,
}: {
  title: ReactNode
  meta?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
}) {
  const className = `nb-row${onClick ? ' is-click' : ''}`
  const inner = (
    <>
      <span className="nb-row-main">
        <span className="nb-row-title">{title}</span>
        {meta && <span className="nb-meta">{meta}</span>}
      </span>
      {trailing}
    </>
  )
  if (onClick) {
    return <button type="button" className={className} onClick={onClick}>{inner}</button>
  }
  return <div className={className}>{inner}</div>
}

export function InlineMeta({ children }: { children: ReactNode }) {
  return <span className="nb-meta">{children}</span>
}

export function QuietAction({
  children,
  onClick,
  primary = false,
  disabled = false,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  primary?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button type={type} className={`nb-quiet${primary ? ' primary' : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function EmptyNotebookState({
  title,
  sub,
  action,
}: {
  title: string
  sub?: string
  action?: ReactNode
}) {
  return (
    <div className="nb-empty">
      <p className="nb-empty-title">{title}</p>
      {sub && <p className="nb-empty-sub">{sub}</p>}
      {action}
    </div>
  )
}

export function NotebookComposer(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`nb-composer${props.className ? ` ${props.className}` : ''}`} />
}
