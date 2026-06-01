'use client'

import Link from 'next/link'
import { findArticle } from '@/lib/blog'
import BlogShell from '@/components/BlogShell'

const SLUG = 'mitbeobachter'

const tocItems = [
  { id: 'warum', label: 'Warum ein neues Konzept?' },
  { id: 'koennen', label: 'Was Mitwirkende können' },
  { id: 'flow', label: 'So funktioniert’s' },
  { id: 'wer', label: 'Wer profitiert' },
  { id: 'nicht', label: 'Was sie nicht sind' },
  { id: 'privacy', label: 'Privatsphäre & Vertrauen' },
]

export default function MitbeobachterArticle() {
  const article = findArticle(SLUG)!
  return (
    <BlogShell article={article} tocItems={tocItems}>
      <style>{`
        .bs-prose h2 {
          margin: 56px 0 14px;
          color: var(--bs-text);
          font-size: 22px;
          line-height: 1.25;
          letter-spacing: -.018em;
        }
        .bs-prose p {
          margin: 0 0 14px;
          color: var(--bs-text-secondary);
          font-size: 14.5px;
          line-height: 1.65;
        }
        .bs-prose ul { margin: 8px 0 18px; padding-left: 22px; }
        .bs-prose li {
          margin: 6px 0;
          color: var(--bs-text-secondary);
          font-size: 14.5px;
          line-height: 1.55;
        }
        .obs-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
          margin: 18px 0 26px;
        }
        .obs-card {
          padding: 16px;
          border: 1px solid var(--bs-border);
          border-radius: 12px;
          background: var(--bs-surface);
        }
        .obs-card h4 {
          margin: 0 0 6px;
          color: var(--bs-text);
          font-size: 13.5px;
        }
        .obs-card p {
          margin: 0;
          color: var(--bs-text-secondary);
          font-size: 13px;
          line-height: 1.5;
        }
        .obs-flow {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 18px 0 28px;
        }
        @media (max-width: 640px) { .obs-flow { grid-template-columns: 1fr; } }
        .obs-step {
          padding: 14px 16px;
          border: 1px solid var(--bs-border);
          border-radius: 12px;
          background: var(--bs-surface);
        }
        .obs-step-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--bs-accent) 16%, transparent);
          color: var(--bs-accent);
          font-size: 12px;
          margin-bottom: 8px;
        }
        .obs-step h5 {
          margin: 0 0 4px;
          color: var(--bs-text);
          font-size: 13px;
        }
        .obs-step p {
          margin: 0;
          color: var(--bs-text-secondary);
          font-size: 12.5px;
          line-height: 1.45;
        }
        .obs-quote {
          margin: 24px 0;
          padding: 18px 20px;
          border-left: 3px solid var(--bs-accent);
          background: color-mix(in srgb, var(--bs-accent) 5%, transparent);
          color: var(--bs-text-secondary);
          font-size: 14px;
          line-height: 1.55;
          font-style: italic;
        }
        .obs-quote cite {
          display: block;
          margin-top: 8px;
          color: var(--bs-text-muted);
          font-style: normal;
          font-size: 12px;
        }
        .obs-cta {
          margin-top: 40px;
          padding: 22px;
          border: 1px solid var(--bs-border);
          border-radius: 14px;
          background: var(--bs-surface);
        }
        .obs-cta h3 {
          margin: 0 0 6px;
          color: var(--bs-text);
          font-size: 17px;
        }
        .obs-cta p {
          margin: 0 0 14px;
          color: var(--bs-text-secondary);
          font-size: 13.5px;
        }
        .obs-cta a {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px;
          border: 1px solid var(--bs-border);
          border-radius: 999px;
          color: var(--bs-text);
          text-decoration: none;
          font-size: 13px;
        }
      `}</style>

      <div className="bs-prose">
        <h2 id="warum">Warum ein neues Konzept?</h2>
        <p>
          Klassische SaaS-Tools kennen zwei Rollen: <em>Member</em> (baut mit) und <em>Admin</em> (verwaltet). Wer nur mitschauen will, bekommt entweder Vollzugriff, den niemand braucht — oder gar nichts. Beides ist falsch.
        </p>
        <p>
          In den meisten Projekten gibt es eine dritte Gruppe: Menschen, die <strong>still informiert</strong> bleiben sollen. Sie schreiben keine Tasks, machen keine Status-Reviews. Aber wenn sie fragen „wie weit seid ihr?", willst du nicht 20 Minuten lang erklären müssen.
        </p>
        <p>Genau dafür gibt es Mitwirkende.</p>

        <h2 id="koennen">Was Mitwirkende können — und was nicht</h2>
        <div className="obs-cards">
          <div className="obs-card">
            <h4>Sehen, was passiert</h4>
            <p>Status, Phase, Fortschritt, Tasks, Risiken — alles read-only sichtbar.</p>
          </div>
          <div className="obs-card">
            <h4>Auf Wunsch kommentieren</h4>
            <p>Wer Comment-Zugriff hat, kann Rückfragen stellen. Du entscheidest pro Person.</p>
          </div>
          <div className="obs-card">
            <h4>Briefings automatisch</h4>
            <p>Veyra schickt zusammengefasste Updates, ohne dass du Mails tippst.</p>
          </div>
          <div className="obs-card">
            <h4>Nicht in deine Daten</h4>
            <p>Keine Edits, keine internen Notizen sichtbar. Trennscharf.</p>
          </div>
        </div>

        <h2 id="flow">So funktioniert&apos;s</h2>
        <div className="obs-flow">
          <div className="obs-step">
            <span className="obs-step-num">1</span>
            <h5>Einladen</h5>
            <p>E-Mail, Rolle, Projekte wählen.</p>
          </div>
          <div className="obs-step">
            <span className="obs-step-num">2</span>
            <h5>Annehmen</h5>
            <p>Person folgt dem Link, sieht ihren Scope.</p>
          </div>
          <div className="obs-step">
            <span className="obs-step-num">3</span>
            <h5>Mitlaufen</h5>
            <p>Veyra hält still informiert, du arbeitest weiter.</p>
          </div>
        </div>

        <h2 id="wer">Wer profitiert davon?</h2>
        <ul>
          <li><strong>Co-Founder ohne operativen Tagesjob</strong> — wollen den Pulsschlag, nicht das Mikromanagement.</li>
          <li><strong>Marketing-Team</strong> — braucht Status für die Launch-Kommunikation.</li>
          <li><strong>Investoren &amp; Beirat</strong> — Quartalsupdate war gestern. Live-Status ist heute.</li>
          <li><strong>Eltern &amp; Partner bei Bootstrapper-Projekten</strong> — wollen sehen, dass es vorangeht.</li>
          <li><strong>Externe Berater</strong> — punktueller Read-Access statt Slack-Account.</li>
        </ul>

        <blockquote className="obs-quote">
          „Ich brauche keine zehn Meetings pro Woche. Aber ich will wissen, was meine Co-Founder bauen. Mitwirkende hat das erste Mal genau diese Lücke geschlossen."
          <cite>Lukas, Co-Founder · Mode-A-Pilot-Workspace</cite>
        </blockquote>

        <h2 id="nicht">Was Mitwirkende <em>nicht</em> sind</h2>
        <p>
          Mitwirkende sind <strong>keine Team-Member</strong>. Keine Zuständigkeit, keine Tasks, keine Workload-Auswertung. Auch <strong>kein „Team"</strong> im Festag-Sinne — denn ein Team beschreibt die <em>Form</em> deines Workspace (Founder-Squad, Agentur, Inhouse-Crew). Mitwirkende sind individuelle Personen mit Read-Access. Nicht mehr, nicht weniger.
        </p>

        <h2 id="privacy">Privatsphäre &amp; Vertrauen</h2>
        <p>
          Mitwirkende sehen exakt das, was du freigegeben hast. Andere Projekte? Unsichtbar. Interne Veyra-Notizen? Versteckt. Dev-Notizen, die nur dein technisches Team kennt? Bleiben intern.
        </p>
        <p>
          Der Zugriff lässt sich mit einem Klick entfernen. Die Person verliert sofort Sicht, ihre Profildaten werden anonymisiert.
        </p>

        <div className="obs-cta">
          <h3>Bereit, jemanden still mitschauen zu lassen?</h3>
          <p>Im Dashboard unter „Persönlicher Bereich → Mitwirkende" einrichten. Dauert keine 30 Sekunden.</p>
          <Link href="/observers">Zu den Mitwirkenden →</Link>
        </div>
      </div>
    </BlogShell>
  )
}
