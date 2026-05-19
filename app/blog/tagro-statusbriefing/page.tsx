'use client'

/**
 * Tagro Statusbriefing — Produkt-Erklärung.
 * Refactored auf BlogShell + BlogDiagram, damit das Layout konsistent
 * mit allen anderen Docs-Beiträgen ist.
 */

import { findArticle } from '@/lib/blog'
import BlogShell from '@/components/BlogShell'
import BlogDiagram from '@/components/BlogDiagram'

const SLUG = 'tagro-statusbriefing'

const dailyFlow = `16:00 Berlin
   │
   ▼
Vercel Cron ──► /api/cron/tagro-daily-dev-prompt
   │
   ▼
dev_daily_prompts (eine Karte pro
   Developer + Projekt + Tag)
   │
   ▼
"Wie weit bist du heute mit X gekommen?"
   │
   ▼
Dev antwortet in einem Satz auf /dev
   │
   ▼
/api/dev/daily-update
   │
   ▼
developer_updates  ──►  status_reports
intern                  client-safe`

const clientFlow = `jederzeit
   │
   ▼
Client klickt "Status jetzt abrufen"
   │
   ▼
/api/client/status-now
60 Sekunden Cooldown
   │
   ▼
Tagro liest die letzten 24h:
developer_updates, Tasks, Risiken, Entscheidungen
   │
   ▼
ruhiger Statusbericht in status_reports
audience=client, visible=true
   │
   ▼
Dashboard, Reports, Audio und Inbox
sind sofort aktuell`

const dataGraphic = `developer_updates
  project_id
  developer_id
  update_text
  created_at
       │
       ▼
tagro_events
  event_type = status_translation
  confidence_score
  source_window = 24h
       │
       ▼
status_reports
  audience = client
  visible = true
  text_transcript
  audio_url optional
       │
       ▼
tasks / risks / decisions
nur wenn wirklich Handlung entsteht`

const visibilityGraphic = `Dev Panel                 Tagro Layer                  Client Panel
─────────                 ───────────                  ────────────
Rohes Update       ──►    prüfen + übersetzen   ──►    klare Lage
Evidence           ──►    Plausibilität         ──►    Statusbericht
Blocker            ──►    Risiko einordnen      ──►    Entscheidung
interne Details    ──►    filtern               ──►    ruhige Sprache
Task-Fortschritt   ──►    zusammenfassen        ──►    nächster Schritt`

const reportLifecycle = `1. Dev gibt tägliches Update ab
2. Tagro baut daraus eine verständliche Lage
3. Client liest oder hört den Bericht
4. Risiken und Entscheidungen werden zu Aktionspunkten
5. Aus offenen Punkten können neue Tasks entstehen`

const tocItems = [
  { id: 'warum', label: 'Warum diese Logik wichtig ist' },
  { id: 'kein-chat', label: 'Der tägliche Status ist kein Chat' },
  { id: 'datenmodell', label: 'Datenmodell als Trust-Layer' },
  { id: 'client-sicht', label: 'Client-Sicht bleibt ruhig' },
  { id: 'lebenszyklus', label: 'Wenn aus Bericht Arbeit wird' },
]

export default function TagroStatusbriefingArticle() {
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
        .bs-prose ul {
          margin: 8px 0 18px;
          padding-left: 22px;
        }
        .bs-prose li {
          margin: 6px 0;
          color: var(--bs-text-secondary);
          font-size: 14.5px;
          line-height: 1.55;
        }
      `}</style>

      <div className="bs-prose">
        <BlogDiagram kicker="Grafik 01" title="Tagesprompt">
{dailyFlow}
        </BlogDiagram>

        <BlogDiagram kicker="Grafik 02" title="Sofort abrufen" variant="light">
{clientFlow}
        </BlogDiagram>

        <h2 id="warum">Warum diese Logik wichtig ist</h2>
        <p>
          Der Kunde will nicht jeden Commit, jede interne Rückfrage und jede technische Nuance lesen. Er will wissen, ob das Projekt ruhig läuft, ob etwas blockiert ist, ob eine Entscheidung gebraucht wird und was als nächstes passiert.
        </p>
        <p>
          Genau dafür sitzt Tagro zwischen Ausführung und Client-Sicht. Die Arbeitsrealität bleibt vollständig dokumentiert, aber die Client-Kommunikation wird bewusst klar, kurz und professionell.
        </p>

        <h2 id="kein-chat">Der tägliche Status ist kein Chat</h2>
        <p>
          Das Developer-Update ist bewusst klein: ein Satz, ein Fortschritt, ein Blocker oder ein Hinweis. Tagro sammelt diese Signale über 24 Stunden und macht daraus eine Lage, die im Dashboard, in Statusberichten und optional als Audio verfügbar ist.
        </p>
        <p>Was Tagro daraus ableitet:</p>
        <ul>
          <li>Was wurde seit dem letzten Bericht tatsächlich bewegt?</li>
          <li>Welche Risiken oder Blocker brauchen Aufmerksamkeit?</li>
          <li>Welche Entscheidung muss vom Client oder Projektverantwortlichen kommen?</li>
          <li>Welche neue Aufgabe sollte aus dem Bericht entstehen?</li>
          <li>Welche Formulierung ist client-safe und nicht unnötig technisch?</li>
        </ul>

        <h2 id="datenmodell">Datenmodell als Trust-Layer</h2>
        <p>
          Statusberichte dürfen nicht aus dünner Luft entstehen. Der Bericht muss auf echten Developer-Updates, Aufgaben, Entscheidungen und optionalen Nachweisen basieren. Deshalb trennt Festag interne Signale von sichtbaren Client-Berichten.
        </p>
        <BlogDiagram kicker="Grafik 03" title="Datenfluss">
{dataGraphic}
        </BlogDiagram>

        <h2 id="client-sicht">Client-Sicht bleibt ruhig</h2>
        <p>
          Tagro ist kein Überwachungswerkzeug. Es ist eine Übersetzungsschicht. Der Developer arbeitet intern, Tagro prüft und verdichtet, und der Client bekommt nur die klare Lage: Fortschritt, Risiko, Entscheidung, nächster Schritt.
        </p>
        <BlogDiagram kicker="Grafik 04" title="Sichtbarkeit" variant="light">
{visibilityGraphic}
        </BlogDiagram>

        <h2 id="lebenszyklus">Wenn aus Bericht Arbeit wird</h2>
        <p>
          Ein Statusbericht ist nicht das Ende der Arbeit. Wenn Tagro einen offenen Punkt erkennt, kann daraus eine Aufgabe, ein Risiko, eine Entscheidung oder ein Projektbriefing entstehen. So wird Reporting nicht nur Dokumentation, sondern operative Steuerung.
        </p>
        <BlogDiagram kicker="Grafik 05" title="Lebenszyklus">
{reportLifecycle}
        </BlogDiagram>

        <p>
          Zielbild: Der Client öffnet Festag, hört ein 30- bis 60-sekündiges Tagro-Briefing und versteht sofort, was passiert ist, was blockiert ist und worauf er achten muss.
        </p>
      </div>
    </BlogShell>
  )
}
