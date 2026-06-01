'use client'

import Link from 'next/link'
import { ArrowSquareOut, BookOpenText, Megaphone, Sparkle } from '@phosphor-icons/react'

const RELEASES = [
  'Sidebar-Footer jetzt mit Konto-Hub, Download App und klaren Menügruppen.',
  'Live Avatar Sync in Werk, Relations und Teams verbessert.',
  'Kontoeinrichtung beim Registrieren mit eigenem Festag-Übergangsscreen ergänzt.',
]

const BLOG = [
  {
    title: 'Veyra Statusbriefing: vom Dev-Update zum Client-Bericht.',
    href: '/docs/tagro-statusbriefing',
  },
  {
    title: 'Wie Festag kontrollierte Softwareproduktion statt Tool-Chaos aufbaut.',
    href: null,
  },
  {
    title: 'Warum Veyra AI als Orchestrierungsschicht für Teams funktioniert.',
    href: null,
  },
  {
    title: 'Festag Delivery Model: kuratiertes Netzwerk statt offener Freelancer-Logik.',
    href: null,
  },
]

export default function UpdatesPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <h1>What&apos;s New</h1>
        <p>Produkt-Updates, Releases und Blogartikel rund um Festag.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Sparkle size={18} weight="regular" />
              <h2 style={{ margin: 0, fontSize: 18 }}>Releases</h2>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Die letzten Produktverbesserungen im Überblick.</p>
          </div>
          <div style={{ padding: '8px 0' }}>
            {RELEASES.map((item, index) => (
              <div key={item} style={{ padding: '14px 20px', borderBottom: index < RELEASES.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ width: 8, height: 8, marginTop: 6, borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', lineHeight: 1.55 }}>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: 'grid', gap: 16 }}>
          <article style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <BookOpenText size={18} weight="regular" />
                <h2 style={{ margin: 0, fontSize: 18 }}>Blogartikel</h2>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Positionierung, Architektur und Produktgedanken aus dem Festag-System.</p>
            </div>
            <div style={{ padding: '8px 0' }}>
              {BLOG.map((item, index) => (
                <div key={item.title} style={{ padding: '14px 20px', borderBottom: index < BLOG.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  {item.href ? (
                    <Link href={item.href} style={{ margin: 0, fontSize: 14, color: 'var(--text)', lineHeight: 1.55, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span>{item.title}</span>
                      <ArrowSquareOut size={15} weight="regular" />
                    </Link>
                  ) : (
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', lineHeight: 1.55 }}>{item.title}</p>
                  )}
                </div>
              ))}
            </div>
          </article>

          <article style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Megaphone size={18} weight="regular" />
              <h2 style={{ margin: 0, fontSize: 18 }}>Mehr entdecken</h2>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Öffne den Aktivitätsfeed für operative Produktbewegungen oder gehe in die Projektbriefings für projektbezogene Updates.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              <Link href="/activity" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textDecoration: 'none', color: 'var(--text)', background: 'var(--surface-2)', borderRadius: 12, padding: '12px 14px' }}>
                <span>Produkt-Aktivitäten</span>
                <ArrowSquareOut size={16} weight="regular" />
              </Link>
              <Link href="/reports" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textDecoration: 'none', color: 'var(--text)', background: 'var(--surface-2)', borderRadius: 12, padding: '12px 14px' }}>
                <span>Projektbriefings</span>
                <ArrowSquareOut size={16} weight="regular" />
              </Link>
            </div>
          </article>
        </section>
      </div>
    </div>
  )
}
