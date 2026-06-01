'use client'

import Link from 'next/link'
import { AppleLogo, AndroidLogo, ArrowSquareOut, Desktop, DownloadSimple, GlobeHemisphereWest } from '@phosphor-icons/react'

const OPTIONS = [
  {
    title: 'Web App',
    copy: 'Installiere Festag direkt aus dem Browser als schnelle Desktop- oder Mobile-App.',
    icon: GlobeHemisphereWest,
    note: 'Beste Option für sofortigen Start',
  },
  {
    title: 'Desktop',
    copy: 'Mac und Windows als fokussierter Workspace mit klaren Projekt-, Team- und Veyra-Flows.',
    icon: Desktop,
    note: 'Native Desktop-App in Vorbereitung',
  },
  {
    title: 'iPhone & Android',
    copy: 'Nutze Festag unterwegs für Status, Freigaben, Team-Kommunikation und Projekt-Updates.',
    icon: DownloadSimple,
    note: 'Mobile App Rollout folgt',
  },
]

export default function DownloadPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Download App</h1>
        <p>Installiere Festag auf deinen Geräten und halte Teams, Clients und Veyra in einem Flow.</p>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {OPTIONS.map((option) => {
          const Icon = option.icon
          return (
            <article
              key={option.title}
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                borderRadius: 18,
                padding: 22,
                boxShadow: 'var(--shadow)',
              }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon size={22} color="var(--text)" weight="regular" />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 20, lineHeight: 1.1 }}>{option.title}</h2>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{option.copy}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-2)', borderRadius: 999, padding: '6px 10px' }}>
                {option.note}
              </span>
            </article>
          )
        })}
      </div>

      <div style={{ marginTop: 22, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 18, padding: 22 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 18 }}>Sofort installieren</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Für die schnellste Installation nutze derzeit die Web App. Auf iPhone, Android, Mac und Windows kannst du Festag direkt vom Browser aus zum Homescreen oder Dock hinzufügen.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--btn-prim-text)', background: 'var(--btn-prim)', padding: '11px 14px', borderRadius: 10, fontWeight: 700 }}>
            <DownloadSimple size={16} weight="bold" />
            Web App öffnen
          </Link>
          <a href="https://festag-mvp.vercel.app" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text)', background: 'var(--surface-2)', padding: '11px 14px', borderRadius: 10, fontWeight: 600 }}>
            <ArrowSquareOut size={16} weight="regular" />
            Installationslink kopieren
          </a>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 18, color: 'var(--text-muted)', fontSize: 12.5 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AppleLogo size={15} weight="regular" /> iPhone / Mac</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AndroidLogo size={15} weight="regular" /> Android</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Desktop size={15} weight="regular" /> Windows</span>
        </div>
      </div>
    </div>
  )
}
