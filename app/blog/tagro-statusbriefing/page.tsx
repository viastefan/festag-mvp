import Link from 'next/link'

const dailyFlow = `16:00 Berlin
   |
   v
Vercel Cron -> /api/cron/tagro-daily-dev-prompt
   |
   v
dev_daily_prompts
eine Karte pro Developer + Projekt + Tag
   |
   v
"Wie weit bist du heute mit X gekommen?"
   |
   v
Dev antwortet in einem Satz auf /dev
   |
   v
/api/dev/daily-update
   |
   v
developer_updates  ->  status_reports
intern                 client-safe`

const clientFlow = `jederzeit
   |
   v
Client klickt "Status jetzt abrufen"
   |
   v
/api/client/status-now
60 Sekunden Cooldown
   |
   v
Tagro liest die letzten 24h:
developer_updates, Tasks, Risiken, Entscheidungen
   |
   v
ruhiger Statusbericht in status_reports
audience=client, visible=true
   |
   v
Dashboard, Reports, Audio und Inbox sind sofort aktuell`

const dataGraphic = `developer_updates
  project_id
  developer_id
  update_text
  created_at
       |
       v
tagro_events
  event_type = status_translation
  confidence_score
  source_window = 24h
       |
       v
status_reports
  audience = client
  visible = true
  text_transcript
  audio_url optional
       |
       v
tasks / risks / decisions
nur wenn wirklich Handlung entsteht`

const visibilityGraphic = `Dev Panel                 Tagro Layer                  Client Panel
---------                 -----------                  ------------
Rohes Update       ->     prüfen + übersetzen     ->   klare Lage
Evidence           ->     Plausibilität           ->   Statusbericht
Blocker            ->     Risiko einordnen        ->   Entscheidung
interne Details    ->     filtern                 ->   ruhige Sprache
Task-Fortschritt   ->     zusammenfassen          ->   nächster Schritt`

const reportLifecycle = `1. Dev gibt tägliches Update ab
2. Tagro baut daraus eine verständliche Lage
3. Client liest oder hört den Bericht
4. Risiken und Entscheidungen werden zu Aktionspunkten
5. Aus offenen Punkten können neue Tasks entstehen`

export default function TagroStatusbriefingBlogPage() {
  return (
    <main className="blog-shell">
      <style>{`
        .blog-shell {
          min-height: 100dvh;
          background:
            radial-gradient(circle at 18% 0%, rgba(91,100,125,.08), transparent 34%),
            #FCFCFD;
          color: #202532;
          padding: 46px clamp(20px, 5vw, 72px) 104px;
          font-family: var(--font-aeonik, 'Aeonik', Inter, -apple-system, BlinkMacSystemFont, sans-serif);
          -webkit-font-smoothing: antialiased;
        }
        .blog-top {
          max-width: 1180px;
          margin: 0 auto 54px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }
        .blog-brand {
          color: #202532;
          text-decoration: none;
          font-size: 15px;
          letter-spacing: -.01em;
          font-weight: 500;
        }
        .blog-back {
          color: #7A8497;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
        }
        .blog-grid {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, .88fr) minmax(380px, 1.12fr);
          gap: clamp(28px, 5vw, 68px);
          align-items: start;
        }
        .blog-eyebrow {
          margin: 0 0 13px;
          color: #7A54E8;
          font-size: 12px;
          letter-spacing: .13em;
          text-transform: uppercase;
          font-weight: 500;
        }
        .blog-title {
          margin: 0;
          max-width: 680px;
          color: #171C28;
          font-size: clamp(42px, 7vw, 86px);
          line-height: .94;
          letter-spacing: -.055em;
          font-weight: 500;
        }
        .blog-lead {
          margin: 25px 0 0;
          max-width: 590px;
          color: #5A6478;
          font-size: clamp(17px, 2.1vw, 22px);
          line-height: 1.48;
          font-weight: 500;
        }
        .blog-meta {
          margin: 24px 0 0;
          color: #9AA3B3;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 500;
        }
        .blog-section {
          max-width: 760px;
          margin: 74px auto 0;
        }
        .blog-section h2 {
          margin: 0 0 14px;
          color: #171C28;
          font-size: clamp(26px, 3.1vw, 42px);
          line-height: 1.08;
          letter-spacing: -.035em;
          font-weight: 500;
        }
        .blog-section p {
          margin: 0;
          color: #5A6478;
          font-size: 16px;
          line-height: 1.72;
          font-weight: 500;
        }
        .blog-section p + p { margin-top: 18px; }
        .visual-stack {
          display: grid;
          gap: 14px;
        }
        .visual-card {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          background:
            radial-gradient(circle at 18% 0%, rgba(255,255,255,.86), transparent 38%),
            linear-gradient(145deg, #222326, #151617);
          color: #F4F4F0;
          box-shadow:
            0 1px 0 rgba(255,255,255,.08) inset,
            0 24px 70px rgba(19,24,34,.16);
        }
        .visual-card.light {
          background:
            radial-gradient(circle at 12% 0%, rgba(91,100,125,.08), transparent 42%),
            #fff;
          color: #202532;
          box-shadow:
            0 1px 2px rgba(15,23,42,.05),
            0 22px 62px rgba(15,23,42,.08);
        }
        .visual-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 18px 0;
        }
        .visual-kicker {
          margin: 0;
          color: rgba(255,255,255,.58);
          font-size: 11px;
          letter-spacing: .12em;
          text-transform: uppercase;
          font-weight: 500;
        }
        .visual-card.light .visual-kicker { color: #8B94A5; }
        .visual-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          border: 2px solid #7A54E8;
        }
        .visual-pre {
          margin: 0;
          padding: 18px;
          white-space: pre-wrap;
          color: inherit;
          font-family: 'SFMono-Regular', 'Cascadia Mono', 'Menlo', monospace;
          font-size: clamp(12px, 1.2vw, 15px);
          line-height: 1.54;
          letter-spacing: -.015em;
        }
        .system-card {
          margin: 28px 0;
          padding: 18px;
          border-radius: 18px;
          background: #fff;
          box-shadow:
            0 1px 2px rgba(15,23,42,.05),
            0 16px 42px rgba(15,23,42,.07);
        }
        .system-card h3 {
          margin: 0 0 12px;
          color: #202532;
          font-size: 17px;
          letter-spacing: -.01em;
          font-weight: 500;
        }
        .system-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 9px;
        }
        .system-list li {
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr);
          gap: 10px;
          color: #5A6478;
          font-size: 14px;
          line-height: 1.5;
          font-weight: 500;
        }
        .system-list li::before {
          content: '';
          width: 8px;
          height: 8px;
          margin-top: 7px;
          border-radius: 999px;
          border: 2px solid #5B647D;
        }
        .blog-cta {
          max-width: 760px;
          margin: 76px auto 0;
          padding: 24px;
          border-radius: 22px;
          background: #fff;
          box-shadow:
            0 1px 2px rgba(15,23,42,.05),
            0 24px 72px rgba(15,23,42,.08);
        }
        .blog-cta p {
          margin: 0;
          color: #5A6478;
          font-size: 15px;
          line-height: 1.65;
          font-weight: 500;
        }
        .blog-cta a {
          margin-top: 16px;
          height: 40px;
          padding: 0 16px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          color: #fff;
          background: #202532;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
        }
        @media (max-width: 980px) {
          .blog-grid { grid-template-columns: 1fr; }
          .visual-stack { order: -1; }
        }
        @media (max-width: 640px) {
          .blog-shell { padding-top: 30px; }
          .blog-top { margin-bottom: 34px; }
          .blog-section { margin-top: 54px; }
          .visual-card { border-radius: 14px; }
        }
      `}</style>

      <header className="blog-top">
        <Link href="/" className="blog-brand">festag</Link>
        <Link href="/updates" className="blog-back">Zurück zu Updates</Link>
      </header>

      <section className="blog-grid">
        <div>
          <p className="blog-eyebrow">Tagro Statusbriefing</p>
          <h1 className="blog-title">Vom Dev-Update zur ruhigen Client-Lage.</h1>
          <p className="blog-lead">
            Festag macht tägliche Arbeit nicht lauter, sondern klarer. Entwickler geben kurze Updates ab. Tagro übersetzt daraus einen verständlichen Statusbericht mit Risiken, Entscheidungen und nächsten Schritten.
          </p>
          <p className="blog-meta">19. Mai 2026 · Produktarchitektur · Festag Studio</p>
        </div>

        <div className="visual-stack" aria-label="Tagro Statusbriefing Grafiken">
          <article className="visual-card">
            <div className="visual-header">
              <p className="visual-kicker">Grafik 01 · Tagesprompt</p>
              <span className="visual-dot" />
            </div>
            <pre className="visual-pre">{dailyFlow}</pre>
          </article>
          <article className="visual-card light">
            <div className="visual-header">
              <p className="visual-kicker">Grafik 02 · Sofort abrufen</p>
              <span className="visual-dot" />
            </div>
            <pre className="visual-pre">{clientFlow}</pre>
          </article>
        </div>
      </section>

      <section className="blog-section">
        <h2>Warum diese Logik wichtig ist</h2>
        <p>
          Der Kunde will nicht jeden Commit, jede interne Rückfrage und jede technische Nuance lesen. Er will wissen, ob das Projekt ruhig läuft, ob etwas blockiert ist, ob eine Entscheidung gebraucht wird und was als nächstes passiert.
        </p>
        <p>
          Genau dafür sitzt Tagro zwischen Ausführung und Client-Sicht. Die Arbeitsrealität bleibt vollständig dokumentiert, aber die Client-Kommunikation wird bewusst klar, kurz und professionell.
        </p>
      </section>

      <section className="blog-section">
        <h2>Der tägliche Status ist kein Chat</h2>
        <p>
          Das Developer-Update ist bewusst klein: ein Satz, ein Fortschritt, ein Blocker oder ein Hinweis. Tagro sammelt diese Signale über 24 Stunden und macht daraus eine Lage, die im Dashboard, in Statusberichten und optional als Audio verfügbar ist.
        </p>
        <div className="system-card">
          <h3>Was Tagro daraus ableitet</h3>
          <ul className="system-list">
            <li>Was wurde seit dem letzten Bericht tatsächlich bewegt?</li>
            <li>Welche Risiken oder Blocker brauchen Aufmerksamkeit?</li>
            <li>Welche Entscheidung muss vom Client oder Projektverantwortlichen kommen?</li>
            <li>Welche neue Aufgabe sollte aus dem Bericht entstehen?</li>
            <li>Welche Formulierung ist client-safe und nicht unnötig technisch?</li>
          </ul>
        </div>
      </section>

      <section className="blog-section">
        <h2>Datenmodell als Trust-Layer</h2>
        <p>
          Statusberichte dürfen nicht aus dünner Luft entstehen. Der Bericht muss auf echten Developer-Updates, Aufgaben, Entscheidungen und optionalen Nachweisen basieren. Deshalb trennt Festag interne Signale von sichtbaren Client-Berichten.
        </p>
        <article className="visual-card">
          <div className="visual-header">
            <p className="visual-kicker">Grafik 03 · Datenfluss</p>
            <span className="visual-dot" />
          </div>
          <pre className="visual-pre">{dataGraphic}</pre>
        </article>
      </section>

      <section className="blog-section">
        <h2>Client-Sicht bleibt ruhig</h2>
        <p>
          Tagro ist kein Überwachungswerkzeug. Es ist eine Übersetzungsschicht. Der Developer arbeitet intern, Tagro prüft und verdichtet, und der Client bekommt nur die klare Lage: Fortschritt, Risiko, Entscheidung, nächster Schritt.
        </p>
        <article className="visual-card light">
          <div className="visual-header">
            <p className="visual-kicker">Grafik 04 · Sichtbarkeit</p>
            <span className="visual-dot" />
          </div>
          <pre className="visual-pre">{visibilityGraphic}</pre>
        </article>
      </section>

      <section className="blog-section">
        <h2>Wenn aus Bericht Arbeit wird</h2>
        <p>
          Ein Statusbericht ist nicht das Ende der Arbeit. Wenn Tagro einen offenen Punkt erkennt, kann daraus eine Aufgabe, ein Risiko, eine Entscheidung oder ein Projektbriefing entstehen. So wird Reporting nicht nur Dokumentation, sondern operative Steuerung.
        </p>
        <article className="visual-card">
          <div className="visual-header">
            <p className="visual-kicker">Grafik 05 · Lebenszyklus</p>
            <span className="visual-dot" />
          </div>
          <pre className="visual-pre">{reportLifecycle}</pre>
        </article>
      </section>

      <section className="blog-cta">
        <p>
          Zielbild: Der Client öffnet Festag, hört ein 30- bis 60-sekündiges Tagro-Briefing und versteht sofort, was passiert ist, was blockiert ist und worauf er achten muss.
        </p>
        <Link href="/reports">Statusberichte öffnen</Link>
      </section>
    </main>
  )
}
