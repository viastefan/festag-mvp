'use client'

/**
 * Engineering deep dive: how the 16:00 Veyra loop is wired end-to-end.
 *
 * Audience: dev + internal + investor-curious. Diagrams every layer so
 * the reader sees who writes what, who reads what, and which guardrails
 * exist. Calm voice, no marketing flourish.
 */

import { findArticle } from '@/lib/blog'
import BlogShell from '@/components/BlogShell'
import BlogDiagram from '@/components/BlogDiagram'

const SLUG = 'daily-status-loop'

const dailyFlow = `16:00 Berlin                          jederzeit
   │                                     │
   ▼                                     ▼
Vercel Cron ──► /api/cron/tagro-daily   Client klickt
                -dev-prompt              "Status jetzt abrufen"
                │                              │
                ▼                              ▼
   dev_daily_prompts (eine pro       /api/client/status-now POST
   dev + projekt + heute)            (60s Cooldown)
                │                              │
   Notification: "Wie weit bist               │
   du heute mit X gekommen?"                  │
                │                              │
                ▼                              ▼
   Dev sieht Card auf /dev          Veyra liest die letzten 24h
                │                    developer_updates, baut einen
   Textarea: ein Satz                ruhigen Status-Bericht, schreibt
                │                    via service-role in status_reports
                ▼                              │
   /api/dev/daily-update                       ▼
                │                    Report ist sofort im Client-
   ▶ developer_updates (intern)      Dashboard sichtbar
   ▶ status_reports                       │
     (audience=client, visible=true)      │
   ▶ Notification an den Client     ──── ◄  matched ─────┐
     mit Link auf /reports                              │
                                                        │
   Client sieht roten Inbox-Counter,                    │
   liest in der Rail die übersetzte Lage ───────────────┘`

const nervousSystem = `┌────────────────────────────────────────────────────────────────┐
│                        FESTAG NERVOUS SYSTEM                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   AUSFÜHRUNG                ÜBERSETZUNG               SICHT    │
│   ──────────                ───────────               ─────    │
│                                                                │
│   Dev Panel  ───►  developer_updates  ───►  Veyra Layer       │
│   GitHub     ───►  github_commits     ───►  Plausibilität     │
│   Tasks      ───►  tasks              ───►  Verdichtung       │
│   Voice-Input ──►  raw_transcript     ───►  Übersetzung       │
│                                              │                 │
│                                              ▼                 │
│                                       status_reports           │
│                                       (audience=client,        │
│                                        visible=true)           │
│                                              │                 │
│                                              ▼                 │
│                                       Client Panel             │
│                                       ruhige Lage              │
│                                                                │
└────────────────────────────────────────────────────────────────┘`

const visibilityMatrix = `              │  Dev Panel │  Veyra Layer │  Client Panel
──────────────┼────────────┼──────────────┼─────────────────
Rohes Update  │  ●         │  ● (filtert) │  ─
Evidence      │  ●         │  ● (prüft)   │  ─
Blocker       │  ●         │  ● (ordnet)  │  ● (als Risiko)
Commits / PRs │  ●         │  ● (mapped)  │  ─
Confidence    │  ─         │  ●           │  ─
Übersetzung   │  ─         │  ●           │  ● (liest)
Audio Briefing│  ─         │  ●           │  ● (hört)
Entscheidung  │  ─         │  ● (markiert)│  ● (entscheidet)`

const tableSchema = `dev_daily_prompts            developer_updates             status_reports
──────────────────           ──────────────────            ──────────────
id              uuid         id              uuid          id              uuid
developer_id    fk           developer_id    fk            project_id      fk
project_id      fk           project_id      fk            audience        text
prompt_date     date  ─┐     update_text     text          visible_to_     bool
state           text   │     status          text          client
submitted_at    ts     │     blocker         bool          summary         text
related_update  fk ────┤     blocker_desc    text          current_work_   jsonb
payload         jsonb  │     created_at      ts            blockers_json   jsonb
                       │            │                      generated_on    date
                       │            ▼                      created_by      fk
                       └─► matched on submit     ◄────────────────────────┘
                            (related_update_id)            ▲
                                                           │
client_status_queries                                      │
─────────────────────                                      │
user_id        fk                                          │
project_id     fk                                          │
status_report_id fk ──────────────────────────────────────►│
generated_fresh bool                                       │
created_at      ts (used for 60s cooldown)`

const securityModel = `┌──────────────────────────┐     ┌──────────────────────────┐
│       VERCEL CRON        │     │       USER REQUEST       │
│                          │     │                          │
│   Authorization:         │     │   Supabase Auth Session  │
│   Bearer ${'$'}CRON_SECRET │     │   (cookie-bound, RLS)   │
│                          │     │                          │
└──────────────┬───────────┘     └──────────────┬───────────┘
               │                                │
               ▼                                ▼
       service-role client               user-session client
       (bypasses RLS)                    (RLS enforced)
               │                                │
               │  writes:                       │  reads:
               ▼                                ▼
       • dev_daily_prompts             • status_reports
       • notifications                   (filtered by project membership)
       • status_reports                • developer_updates
         (audience=client)               (only own + admin)
               │                        • notifications
               ▼                          (user_id = me)
       inserts are always
       intentional + audited
       in audit_logs`

const trustLayer = `        Trust Layer
        ───────────

        ┌──────────────┐
        │  STATUS      │  ← Was der Client liest
        │  REPORT      │
        └──────┬───────┘
               │ generiert aus
               ▼
        ┌──────────────┐
        │  VEYRA       │  ← Engine: Plausibilität, Confidence, Übersetzung
        │  VERIFICATION│
        └──────┬───────┘
               │ liest
               ▼
        ┌──────────────┐
        │  EVIDENCE    │  ← developer_updates, commits, tasks, decisions
        │  LAYER       │
        └──────┬───────┘
               │ basiert auf
               ▼
        ┌──────────────┐
        │  AUSFÜHRUNG  │  ← echte Arbeit des Developers
        │              │
        └──────────────┘

   Kein Bericht ohne Evidence.
   Kein Evidence-Punkt ohne Audit-Spur.`

const tocItems = [
  { id: 'why', label: 'Warum dieser Loop existiert' },
  { id: 'flow', label: 'Der Ablauf, end-to-end' },
  { id: 'who-sees-what', label: 'Wer sieht was' },
  { id: 'data-model', label: 'Datenmodell' },
  { id: 'security', label: 'Sicherheit & Cron' },
  { id: 'trust-layer', label: 'Trust Layer' },
  { id: 'next', label: 'Was als nächstes kommt' },
]

export default function DailyStatusLoopArticle() {
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
        .bs-prose h3 {
          margin: 32px 0 10px;
          color: var(--bs-text);
          font-size: 15px;
        }
        .bs-prose p {
          margin: 0 0 14px;
          color: var(--bs-text-secondary);
          font-size: 14.5px;
          line-height: 1.65;
        }
        .bs-prose ul, .bs-prose ol {
          margin: 8px 0 18px;
          padding-left: 22px;
        }
        .bs-prose li {
          margin: 6px 0;
          color: var(--bs-text-secondary);
          font-size: 14.5px;
          line-height: 1.55;
        }
        .bs-prose code {
          padding: 1px 5px;
          border-radius: 4px;
          background: color-mix(in srgb, var(--bs-text) 6%, transparent);
          color: var(--bs-text);
          font-family: 'SF Mono', ui-monospace, monospace;
          font-size: 12.5px;
        }
        .bs-callout {
          margin: 22px 0;
          padding: 14px 16px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--bs-accent) 7%, transparent);
          border-left: 3px solid var(--bs-accent);
          color: var(--bs-text-secondary);
          font-size: 13.5px;
          line-height: 1.55;
        }
        .bs-callout strong { color: var(--bs-text); font-weight: 500; }
      `}</style>

      <div className="bs-prose">

        <h2 id="why">Warum dieser Loop existiert</h2>
        <p>
          Projektmanagement-Tools sammeln entweder zu wenig oder zu viel. Slack ist zu laut, Tickets sind zu trocken, und der Kunde bekommt entweder gar keine Updates oder eine ungefilterte Wand aus Commits. Beides macht Vertrauen kaputt.
        </p>
        <p>
          Festag löst das mit einem strukturierten täglichen Mini-Ritual. <code>Veyra</code> fragt jeden Developer einmal am Tag — pünktlich um 16:00 Berlin — kurz nach dem Stand. Aus diesen Sätzen baut Veyra einen ruhigen, übersetzten Bericht, den der Client bei Bedarf sofort abrufen kann. Mehr nicht.
        </p>
        <div className="bs-callout">
          <strong>Der Kern:</strong> Devs schreiben einen Satz, Veyra macht daraus eine professionelle Lage. Kein Daily, kein Statusmeeting, keine Excel-Liste.
        </div>

        <h2 id="flow">Der Ablauf, end-to-end</h2>
        <p>
          Zwei Eingänge, ein Ausgang. Der Cron-Job feuert deterministisch um 16:00, der Client darf jederzeit on-demand fragen. Beide Wege schreiben in dieselbe Tabelle — der Client sieht keinen Unterschied zwischen „heute geplant gepingt" und „eben frisch erzeugt".
        </p>

        <BlogDiagram kicker="Grafik 01" title="Beide Eingänge, eine Wahrheit">
{dailyFlow}
        </BlogDiagram>

        <h2 id="who-sees-what">Wer sieht was</h2>
        <p>
          Sichtbarkeit ist Architektur, nicht UI. Veyra filtert nicht erst beim Render — die Trennung beginnt schon in der Datenbank, mit RLS-Policies und einer ausdrücklichen <code>visible_to_client</code>-Flag auf jedem Bericht.
        </p>

        <BlogDiagram kicker="Grafik 02" title="Sichtbarkeitsmatrix" variant="light">
{visibilityMatrix}
        </BlogDiagram>

        <p>
          Der Client sieht nie rohe Commit-Messages, nie Confidence-Werte und nie interne Dev-Notizen. Was er liest, ist eine bewusste, kurze, professionelle Lage — mit klarem Hinweis, wenn eine Entscheidung gebraucht wird.
        </p>

        <h2 id="data-model">Datenmodell</h2>
        <p>
          Drei zentrale Tabellen halten den Loop zusammen. Sie sind so klein wie möglich gehalten — jede Spalte ist da, weil sie konkret benutzt wird.
        </p>

        <BlogDiagram kicker="Grafik 03" title="Tabellen + Beziehungen">
{tableSchema}
        </BlogDiagram>

        <ul>
          <li><code>dev_daily_prompts</code> hält den 16:00-Ping. <code>unique(developer_id, project_id, prompt_date)</code> sorgt dafür, dass der Cron idempotent ist — der doppelte 14:00/15:00-UTC-Fire (für Sommer- und Winterzeit) erzeugt nie zwei Karten.</li>
          <li><code>developer_updates</code> ist die intern lesbare Rohversion. Sie wird nie an den Client gespiegelt.</li>
          <li><code>status_reports</code> mit <code>audience=client</code> und <code>visible_to_client=true</code> ist die einzige Quelle, die der Client je zu sehen bekommt.</li>
          <li><code>client_status_queries</code> ist der Audit-Log für jeden „Status jetzt abrufen"-Klick. Er trägt auch den 60-Sekunden-Cooldown.</li>
        </ul>

        <h2 id="security">Sicherheit &amp; Cron</h2>
        <p>
          Der Cron-Endpoint ist öffentlich erreichbar — er wird von Vercels Cron-Infrastructure aufgerufen, und der Code muss damit umgehen können, dass jemand anderes ihn anpingt.
        </p>

        <BlogDiagram kicker="Grafik 04" title="Wer darf was schreiben" variant="accent">
{securityModel}
        </BlogDiagram>

        <p>
          Zwei Authentifizierungspfade nebeneinander: Der Cron-Pfad nutzt einen serverseitigen Bearer-Token (oder Vercels eigenen <code>x-vercel-cron</code>-Header) und schreibt mit der Supabase Service-Role — sauber abgegrenzt vom User-Pfad, der weiterhin durch RLS gegated ist. Jeder Write landet zusätzlich in <code>audit_logs</code>, damit auch der Cron rückverfolgbar bleibt.
        </p>

        <h2 id="trust-layer">Trust Layer</h2>
        <p>
          Das eigentliche Festag-Prinzip steht hinter dem Loop: Ein Statusbericht darf nicht aus dünner Luft entstehen. Veyra liest, verdichtet, übersetzt — aber jeder Satz muss eine Wurzel in echter Arbeit haben.
        </p>

        <BlogDiagram kicker="Grafik 05" title="Trust Layer Stack" variant="light">
{trustLayer}
        </BlogDiagram>

        <p>
          Kein Bericht ohne Evidence. Keine Evidence ohne Audit-Spur. Der Client kann sich darauf verlassen, dass ein „Alles im Plan" in seinem Dashboard nicht eine freundliche Behauptung ist, sondern eine Folge aus geprüften Signalen.
        </p>

        <h2 id="next">Was als nächstes kommt</h2>
        <p>
          Drei Ausbaustufen sind im Code schon vorbereitet:
        </p>
        <ol>
          <li><strong>Veyra-LLM-Übersetzung</strong> statt der aktuellen Heuristik — bessere Tonalität, immer noch dieselbe Evidence-Wurzel.</li>
          <li><strong>Voice-Input</strong> in der Dev-Card — der Dev darf sprechen statt tippen, Veyra transkribiert + übersetzt.</li>
          <li><strong>Per-Project-Berichte</strong> mit Dropdown im Client-Dashboard — bei Kunden mit mehreren Projekten parallel.</li>
        </ol>
        <p>
          Der Loop ist der erste vollständige Veyra-Kreis, der ohne Mensch in der Mitte funktioniert. Die nächsten Schichten — Risiken automatisch erkennen, Entscheidungen vorschlagen, Tasks aus Berichten ableiten — bauen alle darauf auf.
        </p>
      </div>
    </BlogShell>
  )
}
