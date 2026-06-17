'use client'

import { FunnelSimple, Lightning, DotsThree } from '@phosphor-icons/react'
import DecisionRow, { type DecisionItem } from '@/components/portal/DecisionRow'

const MOCK: DecisionItem[] = [
  {
    id: '1',
    title: 'Logo Farbe freigeben',
    project: 'Festag Website Relaunch',
    category: 'Designentscheidung',
    recommendation:
      'Die aktuelle Farbvariante passt zur Branche und verbessert die Lesbarkeit um 17% auf der gesamten Nutzeroberfläche und....',
    impact: 'Designphase kann abgeschlossen werden.',
    timeNeeded: '30 Sekunden',
    priority: 'Hoch',
    primaryAction: 'Freigeben',
    secondaryActions: ['Ablehnen', 'Details'],
  },
  {
    id: '2',
    title: 'Zahlungsanbieter wählen',
    project: 'Festag Website Relaunch',
    category: 'Designentscheidung',
    recommendation:
      'Die aktuelle Farbvariante passt zur Branche und verbessert die Lesbarkeit um 17% auf der gesamten Nutzeroberfläche und....',
    impact: 'Designphase kann abgeschlossen werden.',
    timeNeeded: '30 Sekunden',
    priority: 'Hoch',
    primaryAction: 'Stripe',
    secondaryActions: ['Optionen', 'Details'],
    highlighted: true,
  },
  {
    id: '3',
    title: 'Zahlungsanbieter wählen',
    project: 'Festag Website Relaunch',
    category: 'Designentscheidung',
    recommendation:
      'Die aktuelle Farbvariante passt zur Branche und verbessert die Lesbarkeit um 17% auf der gesamten Nutzeroberfläche und....',
    impact: 'Designphase kann abgeschlossen werden.',
    timeNeeded: '30 Sekunden',
    priority: 'Hoch',
    primaryAction: 'Stripe',
    secondaryActions: ['Optionen', 'Details'],
  },
]

export default function DecisionsView() {
  const openCount = MOCK.length

  return (
    <div className="decisions-shell">
      <style>{`
        .decisions-shell {
          flex: 1;
          min-width: 0;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 -2px 4px rgba(110,113,126,0.05), 0 2px 4px rgba(110,113,126,0.05);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 16px);
        }
        .decisions-hero-top {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 255px;
          pointer-events: none;
          z-index: 0;
        }
        .decisions-hero-top img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .decisions-hero-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 129px;
          pointer-events: none;
          z-index: 0;
        }
        .decisions-hero-bottom img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .decisions-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 0;
          padding: 64px 164px 80px;
          flex: 1;
          overflow-y: auto;
        }
        .decisions-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 64px;
        }
        .decisions-headline {
          max-width: 556px;
          margin: 0;
        }
        .decisions-headline h1 {
          font-size: 28px;
          font-weight: 400;
          letter-spacing: 0.56px;
          color: #0f0f10;
          line-height: 1.2;
          margin: 0 0 12px;
        }
        .decisions-headline p {
          font-size: 20px;
          line-height: 25px;
          color: #8f93a4;
          margin: 0;
        }
        .decisions-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .decisions-icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 32px;
          border: 1px solid rgba(202,207,212,0.2);
          background: #fff;
          box-shadow: 0 2px 5px 0.5px rgba(46,47,51,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0f0f10;
          cursor: pointer;
          padding: 0;
        }
        .decisions-icon-btn.is-accent {
          background: #f1f3f5;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .decisions-divider {
          height: 0.5px;
          background: linear-gradient(90deg, rgba(233,239,246,0.4) 0%, rgb(227,232,239) 27.404%, rgb(233,239,246) 63.702%, rgba(233,239,246,0.4) 100%);
          margin-bottom: 0;
        }
        .decision-row {
          display: flex;
          gap: 56px;
          align-items: center;
          padding: 16px 24px;
        }
        .decision-row.is-highlighted {
          background: rgba(241,243,245,0.4);
          border-radius: 12px;
          box-shadow: 0 4px 4px rgba(0,0,0,0.05);
        }
        .decision-col-title { width: 179px; flex-shrink: 0; display: flex; flex-direction: column; gap: 32px; }
        .decision-col-body { width: 298px; flex-shrink: 0; display: flex; flex-direction: column; gap: 24px; }
        .decision-col-meta { width: 93px; flex-shrink: 0; display: flex; flex-direction: column; gap: 57px; }
        .decision-col-actions { width: 105px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px; align-items: flex-end; margin-left: auto; }
        .decision-title-block { display: flex; flex-direction: column; gap: 8px; }
        .decision-title { font-size: 18px; font-weight: 500; color: #0f0f10; margin: 0; line-height: 1.25; }
        .decision-project { font-size: 14px; color: #8f93a4; letter-spacing: 0.28px; margin: 0; }
        .decision-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f1f3f5;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 14px;
          color: #000;
          letter-spacing: 0.28px;
          align-self: flex-start;
        }
        .decision-tag-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #5b647d;
          flex-shrink: 0;
        }
        .decision-block { display: flex; flex-direction: column; gap: 8px; }
        .decision-label { font-size: 14px; font-weight: 500; color: #000; letter-spacing: 0.14px; margin: 0; }
        .decision-copy { font-size: 14px; line-height: 20px; color: #8f93a4; letter-spacing: 0.28px; margin: 0; }
        .decision-priority {
          display: inline-flex;
          align-items: center;
          background: #f1f3f5;
          border-radius: 999px;
          padding: 6px 12px;
          height: 29px;
          font-size: 14px;
          color: #000;
          letter-spacing: 0.28px;
        }
        .decision-menu {
          border: none;
          background: transparent;
          color: #8f93a4;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .decision-btn {
          width: 100%;
          height: 33px;
          border-radius: 32px;
          font-size: 14px;
          letter-spacing: 0.28px;
          font-family: inherit;
          font-weight: 400;
          cursor: pointer;
          padding: 8px 20px;
          white-space: nowrap;
        }
        .decision-btn-primary {
          background: #5b647d;
          color: #fff;
          border: none;
          box-shadow: 0 8px 24px rgba(200,169,91,0.14);
        }
        .decision-btn-secondary {
          background: #fff;
          color: #202532;
          border: 0.7px solid #e7ebf0;
          box-shadow: 0 2px 2px rgba(0,0,0,0.05);
        }
        .decision-divider {
          height: 0.5px;
          background: linear-gradient(90deg, rgba(233,239,246,0.4) 0%, rgb(227,232,239) 27.404%, rgb(233,239,246) 63.702%, rgba(233,239,246,0.4) 100%);
        }
        @media (max-width: 1200px) {
          .decisions-inner { padding: 48px 48px 64px; }
          .decision-row { flex-wrap: wrap; gap: 24px; }
          .decision-col-title, .decision-col-body, .decision-col-meta, .decision-col-actions { width: 100%; }
          .decision-col-actions { flex-direction: row; flex-wrap: wrap; align-items: center; }
          .decision-btn { width: auto; min-width: 105px; }
        }
        @media (max-width: 900px) {
          .decisions-inner { padding: 32px 20px 48px; }
          .decisions-header { flex-direction: column; margin-bottom: 32px; }
        }
      `}</style>

      <div className="decisions-hero-top">
        <img src="/decisions/hero-top.png" alt="" />
      </div>
      <div className="decisions-hero-bottom">
        <img src="/decisions/hero-bottom.png" alt="" />
      </div>

      <div className="decisions-inner">
        <header className="decisions-header">
          <div className="decisions-headline">
            <h1>Heute sind {openCount} Entscheidungen offen.</h1>
            <p>
              Die wichtigste Entscheidung betrifft die Zahlungsintegration der Festag Plattform.
              <br />
              Eine Freigabe würde den Projektfortschritt um etwa 4 Tage beschleunigen.
            </p>
          </div>
          <div className="decisions-toolbar">
            <button type="button" className="decisions-icon-btn" aria-label="Filter">
              <FunnelSimple size={20} weight="fill" />
            </button>
            <button type="button" className="decisions-icon-btn is-accent" aria-label="Schnellaktionen">
              <Lightning size={20} weight="fill" />
            </button>
            <button type="button" className="decisions-icon-btn" aria-label="Mehr">
              <DotsThree size={24} weight="bold" />
            </button>
          </div>
        </header>

        <div className="decisions-divider" style={{ marginBottom: 0 }} />

        {MOCK.map((item) => (
          <DecisionRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
