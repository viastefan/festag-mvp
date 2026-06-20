'use client'

import Link from 'next/link'
import { ArrowSquareOut, BookOpenText, Megaphone, PencilSimple, Sparkle } from '@phosphor-icons/react'
import MobileCodexListChrome from '@/components/mobile/MobileCodexListChrome'
import { openTagro } from '@/components/TagroOverlay'

const RELEASES = [
  'Sidebar-Footer jetzt mit Konto-Hub, Download App und klaren Menügruppen.',
  'Live Avatar Sync in Werk, Relations und Teams verbessert.',
  'Kontoeinrichtung beim Registrieren mit eigenem Festag-Übergangsscreen ergänzt.',
]

const BLOG = [
  {
    title: 'Tagro Statusbriefing: vom Dev-Update zum Client-Bericht.',
    href: '/docs/tagro-statusbriefing',
  },
  {
    title: 'Wie Festag kontrollierte Softwareproduktion statt Tool-Chaos aufbaut.',
    href: null,
  },
  {
    title: 'Warum Tagro AI als Orchestrierungsschicht für Teams funktioniert.',
    href: null,
  },
  {
    title: 'Festag Delivery Model: kuratiertes Netzwerk statt offener Freelancer-Logik.',
    href: null,
  },
]

const tagroUpdates = () => openTagro({
  contextType: 'empty',
  id: 'updates',
  title: 'What\'s New',
  subtitle: `${RELEASES.length} Releases`,
})

export default function UpdatesPage() {
  return (
    <MobileCodexListChrome
      className="upd-page"
      title="What's New"
      titleMobile="Neuigkeiten"
      subtitle={`${RELEASES.length} Releases · ${BLOG.length} Artikel`}
      dock={{
        onDragUp: tagroUpdates,
        primary: {
          id: 'discuss',
          label: 'Neuigkeiten besprechen...',
          icon: <Sparkle size={14} weight="fill" />,
          onClick: tagroUpdates,
          ariaLabel: 'Mit Tagro besprechen',
        },
        secondary: {
          id: 'tagro',
          icon: <PencilSimple size={20} weight="bold" />,
          onClick: tagroUpdates,
          ariaLabel: 'Mit Tagro bearbeiten',
        },
      }}
      extraCss={UPD_CSS}
    >
      <header className="upd-dt-head">
        <h1>What&apos;s New</h1>
        <p>Produkt-Updates, Releases und Blogartikel rund um Festag.</p>
      </header>

      <div className="upd-grid">
        <section className="upd-card">
          <div className="upd-card-head">
            <div className="upd-card-head-row">
              <Sparkle size={18} weight="regular" />
              <h2>Releases</h2>
            </div>
            <p>Die letzten Produktverbesserungen im Überblick.</p>
          </div>
          <div className="upd-list">
            {RELEASES.map((item, index) => (
              <div key={item} className={`upd-list-item${index < RELEASES.length - 1 ? ' has-border' : ''}`}>
                <span className="upd-dot" aria-hidden />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="upd-side">
          <article className="upd-card">
            <div className="upd-card-head">
              <div className="upd-card-head-row">
                <BookOpenText size={18} weight="regular" />
                <h2>Blogartikel</h2>
              </div>
              <p>Positionierung, Architektur und Produktgedanken aus dem Festag-System.</p>
            </div>
            <div className="upd-list">
              {BLOG.map((item, index) => (
                <div key={item.title} className={`upd-list-item${index < BLOG.length - 1 ? ' has-border' : ''}`}>
                  {item.href ? (
                    <Link href={item.href} className="upd-link">
                      <span>{item.title}</span>
                      <ArrowSquareOut size={15} weight="regular" />
                    </Link>
                  ) : (
                    <p>{item.title}</p>
                  )}
                </div>
              ))}
            </div>
          </article>

          <article className="upd-card upd-discover">
            <div className="upd-card-head-row">
              <Megaphone size={18} weight="regular" />
              <h2>Mehr entdecken</h2>
            </div>
            <p>Öffne den Aktivitätsfeed für operative Produktbewegungen oder gehe in die Projektbriefings für projektbezogene Updates.</p>
            <div className="upd-discover-links">
              <Link href="/activity" className="upd-discover-link">
                <span>Produkt-Aktivitäten</span>
                <ArrowSquareOut size={16} weight="regular" />
              </Link>
              <Link href="/reports" className="upd-discover-link">
                <span>Projektbriefings</span>
                <ArrowSquareOut size={16} weight="regular" />
              </Link>
            </div>
          </article>
        </section>
      </div>
    </MobileCodexListChrome>
  )
}

const UPD_CSS = `
  .upd-dt-head { display: none; }
  .upd-dt-head h1 { margin: 0; font-size: 22px; font-weight: 500; }
  .upd-dt-head p { margin: 6px 0 0; color: var(--text-secondary); font-size: 14px; }

  .upd-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .upd-side { display: grid; gap: 16px; align-content: start; }
  .upd-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
  }
  .upd-card-head { padding: 18px 20px 14px; border-bottom: 1px solid var(--border); }
  .upd-card-head-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .upd-card-head h2 { margin: 0; font-size: 18px; font-weight: 500; }
  .upd-card-head p { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
  .upd-list { padding: 8px 0; }
  .upd-list-item { padding: 14px 20px; display: flex; gap: 12px; align-items: flex-start; }
  .upd-list-item.has-border { border-bottom: 1px solid var(--border); }
  .upd-list-item p { margin: 0; font-size: 14px; color: var(--text); line-height: 1.55; }
  .upd-dot {
    width: 8px; height: 8px; margin-top: 6px; border-radius: 50%;
    background: var(--text-muted); flex-shrink: 0;
  }
  .upd-link {
    margin: 0; font-size: 14px; color: var(--text); line-height: 1.55;
    text-decoration: none; display: flex; align-items: center;
    justify-content: space-between; gap: 12px; width: 100%;
  }
  .upd-discover { padding: 20px; }
  .upd-discover h2 { margin: 0; font-size: 18px; font-weight: 500; }
  .upd-discover p { margin: 8px 0 14px; font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
  .upd-discover-links { display: grid; gap: 10px; }
  .upd-discover-link {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    text-decoration: none; color: var(--text);
    background: var(--surface-2); border-radius: 12px; padding: 12px 14px;
    font-size: 14px;
  }

  @media (min-width: 769px) {
    .upd-dt-head { display: block; margin-bottom: 20px; }
  }

  @media (max-width: 768px) {
    .upd-grid { grid-template-columns: 1fr; gap: 12px; }
    .upd-card {
      border: 1px solid rgba(0, 0, 0, 0.07);
      border-radius: 14px;
      background: #FFFFFF;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 1),
        0 1px 0 rgba(0, 0, 0, 0.04),
        0 4px 10px rgba(144, 149, 159, 0.16);
    }
    [data-theme="dark"] .upd-card,
    [data-theme="classic-dark"] .upd-card {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.14);
    }
    .upd-card-head { padding: 16px 16px 12px; }
    .upd-list-item { padding: 12px 16px; }
    .upd-discover { padding: 16px; }
  }
`
