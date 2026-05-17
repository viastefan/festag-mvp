import Link from 'next/link'

export const metadata = {
  title: 'Mitwirkende — Stille Stakeholder ohne Lärm | Festag',
  description: 'Wie Festag Co-Founder, Marketing, Investoren und Partner still mitlaufen lässt — ohne dass dein Projekt zum Meeting-Marathon wird.',
}

export default function BlogMitwirkendePage() {
  return (
    <main style={{ background:'#FAFBFC', minHeight:'100vh', color:'#202532' }}>
      <style>{`
        @font-face { font-family: 'Aeonik'; src: url('/fonts/Aeonik-Regular.ttf') format('truetype'); font-weight:400; font-display:swap; }
        @font-face { font-family: 'Aeonik'; src: url('/fonts/Aeonik-Medium.ttf') format('truetype'); font-weight:500; font-display:swap; }
        @font-face { font-family: 'Qurova DEMO'; src: url('/fonts/QurovaDEMO-Medium.otf') format('opentype'); font-weight:500; font-display:swap; }
        @font-face { font-family: 'Editors Note'; src: url('/fonts/EditorsNote-MediumItalic.otf') format('opentype'); font-weight:500; font-style:italic; font-display:swap; }
        * { box-sizing:border-box; }

        body { background:#FAFBFC; }

        .blog-shell {
          max-width:680px; margin:0 auto;
          padding:72px 28px 120px;
          font-family:'Aeonik', Inter, system-ui, sans-serif;
          font-weight:500; letter-spacing:.015em;
          color:#202532;
        }
        .blog-top {
          display:flex; align-items:center; justify-content:space-between;
          margin-bottom:64px;
        }
        .blog-brand {
          font-family:'Qurova DEMO', serif; font-size:18px; font-weight:500;
          color:#202532; text-decoration:none; letter-spacing:-.01em;
        }
        .blog-back {
          font-size:12.5px; color:#7B8294; text-decoration:none; font-weight:500;
          letter-spacing:.015em;
        }
        .blog-back:hover { color:#4E5567; }

        .blog-eyebrow {
          color:#7B8294; font-size:10.5px; font-weight:500;
          letter-spacing:.2em; text-transform:uppercase;
          margin:0 0 18px;
        }
        .blog-title {
          font-size:clamp(28px, 3.6vw, 36px);
          font-weight:500; line-height:1.22;
          letter-spacing:-.01em;
          margin:0 0 22px; color:#202532;
        }
        .blog-title em {
          font-family:'Editors Note', serif;
          font-style:italic;
          font-weight:500;
          color:#4E5567;
          letter-spacing:.005em;
        }
        .blog-lead {
          font-size:15.5px; line-height:1.7;
          color:#4E5567; margin:0;
          font-weight:500; letter-spacing:.015em;
          max-width:560px;
        }
        .blog-lead em { font-family:'Editors Note', serif; font-style:italic; font-weight:500; color:#202532; }
        .blog-meta {
          display:inline-flex; align-items:center; gap:12px;
          font-size:11px; color:#7B8294; font-weight:500;
          margin:28px 0 56px; letter-spacing:.12em;
          text-transform:uppercase;
        }
        .blog-meta span { color:#C7CDD6; }

        .blog-hero {
          margin:0 0 64px;
          padding:28px 24px;
          border-radius:12px;
          background:#F6F7F9;
          display:flex; align-items:center; justify-content:center; gap:14px;
          flex-wrap:wrap;
        }
        .hero-node {
          display:flex; flex-direction:column; align-items:center; gap:8px;
        }
        .hero-circle {
          width:44px; height:44px; border-radius:999px;
          display:flex; align-items:center; justify-content:center;
          color:#fff; font-size:11px; font-weight:500; letter-spacing:.04em;
        }
        .hero-label {
          font-size:10.5px; font-weight:500;
          color:#4E5567; letter-spacing:.05em;
        }
        .hero-arrow { display:flex; align-items:center; opacity:.36; }

        h2.blog-h {
          font-size:20px; font-weight:500; letter-spacing:-.005em;
          color:#202532; margin:56px 0 14px;
          line-height:1.32;
          max-width:560px;
        }
        h2.blog-h em {
          font-family:'Editors Note', serif; font-style:italic; font-weight:500; color:#4E5567;
        }
        p.blog-p {
          font-size:15px; line-height:1.78;
          color:#4E5567; margin:0 0 16px;
          max-width:580px;
          letter-spacing:.015em;
          font-weight:500;
        }
        p.blog-p em { font-family:'Editors Note', serif; font-style:italic; font-weight:500; color:#202532; }
        p.blog-p strong { color:#202532; font-weight:500; letter-spacing:.015em; }

        .blog-cards {
          display:grid;
          grid-template-columns:repeat(2, minmax(0, 1fr));
          gap:8px;
          margin:24px 0 4px;
        }
        .blog-card {
          padding:18px 20px; border-radius:10px;
          background:#fff;
          border:1px solid #EEF1F4;
        }
        .blog-card-icon {
          width:28px; height:28px; border-radius:8px;
          background:#F6F7F9;
          display:flex; align-items:center; justify-content:center;
          color:#4E5567; margin-bottom:14px;
        }
        .blog-card h4 {
          font-size:13.5px; font-weight:500; margin:0 0 4px; color:#202532;
          letter-spacing:.015em;
        }
        .blog-card p {
          font-size:12.5px; line-height:1.55; color:#7B8294; margin:0;
          font-weight:500; letter-spacing:.015em;
        }

        .blog-quote {
          margin:64px 0 56px;
          padding:8px 0 0;
          font-family:'Editors Note', serif;
          font-size:clamp(22px, 2.6vw, 26px);
          line-height:1.42; color:#202532;
          font-style:italic; font-weight:500;
          letter-spacing:-.005em;
          max-width:600px;
        }
        .blog-quote cite {
          display:block; margin-top:18px; font-size:11px;
          font-style:normal; color:#7B8294; font-weight:500;
          font-family:'Aeonik', sans-serif;
          letter-spacing:.12em;
          text-transform:uppercase;
        }

        .blog-bullets { padding:0; margin:14px 0 4px; list-style:none; }
        .blog-bullets li {
          padding-left:20px; margin:10px 0;
          position:relative; font-size:14.5px; line-height:1.65; color:#4E5567;
          font-weight:500; letter-spacing:.015em;
          max-width:580px;
        }
        .blog-bullets li::before {
          content:''; position:absolute; left:0; top:11px;
          width:5px; height:5px; border-radius:999px;
          background:#C7CDD6;
        }
        .blog-bullets li strong { color:#202532; font-weight:500; }

        /* Diagram: how it works — minimal, no nested containers */
        .blog-flow {
          margin:24px 0;
          display:grid;
          grid-template-columns:1fr auto 1fr auto 1fr;
          gap:12px; align-items:center;
        }
        .flow-step { text-align:center; padding:14px 6px; }
        .flow-step-num {
          width:24px; height:24px; border-radius:999px;
          background:transparent;
          border:1px solid #C7CDD6;
          color:#4E5567; margin:0 auto 10px;
          display:flex; align-items:center; justify-content:center;
          font-size:11px; font-weight:500; letter-spacing:0;
        }
        .flow-step h5 {
          margin:0 0 4px; font-size:13px; font-weight:500; color:#202532;
          letter-spacing:.015em;
        }
        .flow-step p {
          margin:0; font-size:11.5px; color:#7B8294; line-height:1.5;
          font-weight:500; letter-spacing:.015em;
        }
        .flow-arrow { color:#C7CDD6; opacity:.6; }

        /* CTA — kein dunkler Button, nur weiß/outline */
        .blog-cta {
          margin:80px 0 0; padding-top:40px;
          border-top:1px solid #EEF1F4;
        }
        .blog-cta-eyebrow {
          font-size:10.5px; color:#7B8294; font-weight:500;
          letter-spacing:.2em; text-transform:uppercase;
          margin:0 0 12px;
        }
        .blog-cta h3 {
          margin:0 0 8px; font-size:20px;
          font-weight:500; letter-spacing:-.005em;
          color:#202532; line-height:1.32;
          max-width:480px;
        }
        .blog-cta p {
          margin:0 0 22px; font-size:14px; color:#4E5567;
          line-height:1.6; max-width:480px; letter-spacing:.015em;
          font-weight:500;
        }
        .blog-cta-btn {
          display:inline-flex; align-items:center; gap:8px;
          height:38px; padding:0 18px; border-radius:999px;
          background:#fff; color:#202532;
          border:1px solid #E7EBF0;
          font-size:13px; font-weight:500; text-decoration:none;
          letter-spacing:.015em;
          transition:border-color .15s ease, background .15s ease;
        }
        .blog-cta-btn:hover { border-color:#C7CDD6; background:#FAFBFC; }
        .blog-cta-btn svg { transition:transform .15s ease; }
        .blog-cta-btn:hover svg { transform:translateX(2px); }

        @media(max-width:640px) {
          .blog-shell { padding:48px 22px 96px; }
          .blog-cards { grid-template-columns:1fr; }
          .blog-flow { grid-template-columns:1fr; gap:8px; }
          .flow-arrow { transform:rotate(90deg); }
        }
      `}</style>

      <div className="blog-shell">
        <header className="blog-top">
          <Link href="/" className="blog-brand">festag</Link>
          <Link href="/" className="blog-back">← Zurück</Link>
        </header>

        <p className="blog-eyebrow">Produkt — Mitwirkende</p>
        <h1 className="blog-title">Stille <em>Stakeholder.</em> Ohne Lärm.</h1>
        <p className="blog-lead">
          Co-Founder, Marketing, Investoren, Partner. Es gibt immer Menschen, die wissen wollen wie&apos;s
          läuft — aber nicht im Daily sitzen sollten. Festag macht aus diesem stillen Mitlaufen ein eigenes
          Konzept: <em>Mitwirkende</em>.
        </p>
        <p className="blog-meta">17. Mai 2026 <span>·</span> 4 Min. Lesezeit <span>·</span> Festag Studio</p>

        {/* Hero-Diagramm */}
        <div className="blog-hero" aria-label="Mitwirkende-Konzept">
          <div className="hero-node">
            <div className="hero-circle" style={{ background:'#5B647D' }}>DU</div>
            <span className="hero-label">Inhaber:in</span>
          </div>
          <div className="hero-arrow">
            <svg width="28" height="10" viewBox="0 0 28 10"><path d="M2 5 H24 M20 1 L25 5 L20 9" stroke="#7B8294" strokeWidth="1" fill="none" strokeLinecap="round"/></svg>
          </div>
          <div className="hero-node">
            <div className="hero-circle" style={{ background:'#202532' }}>F</div>
            <span className="hero-label">Workspace</span>
          </div>
          <div className="hero-arrow">
            <svg width="28" height="10" viewBox="0 0 28 10"><path d="M2 5 H24 M20 1 L25 5 L20 9" stroke="#7B8294" strokeWidth="1" fill="none" strokeLinecap="round"/></svg>
          </div>
          <div className="hero-node">
            <div className="hero-circle" style={{ background:'#9aa1ad' }} aria-label="Mitwirkende">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M14 17.5c.4-1.6 1.7-2.5 3-2.5 2 0 3.5 1.5 3.5 3.5"/></svg>
            </div>
            <span className="hero-label">Mitwirkende</span>
          </div>
        </div>

        <h2 className="blog-h">Warum überhaupt ein neues Konzept?</h2>
        <p className="blog-p">
          Klassische SaaS-Tools kennen zwei Rollen: <em>Member</em> (baut mit) und <em>Admin</em>
          {' '}(verwaltet). Wer nur mitschauen will, bekommt entweder Vollzugriff, den niemand braucht — oder gar nichts. Beides ist falsch.
        </p>
        <p className="blog-p">
          In den meisten Projekten gibt es eine dritte Gruppe: Menschen, die <strong>still informiert</strong>
          {' '}bleiben sollen. Sie schreiben keine Tasks, machen keine Status-Reviews. Aber wenn sie fragen „wie weit seid ihr?", willst du nicht 20 Minuten lang erklären müssen.
        </p>
        <p className="blog-p">Genau dafür gibt es Mitwirkende.</p>

        <h2 className="blog-h">Was Mitwirkende können — und was nicht</h2>
        <div className="blog-cards">
          <div className="blog-card">
            <div className="blog-card-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <h4>Sehen, was passiert</h4>
            <p>Status, Phase, Fortschritt, Tasks, Risiken — alles read-only sichtbar.</p>
          </div>
          <div className="blog-card">
            <div className="blog-card-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h4>Auf Wunsch kommentieren</h4>
            <p>Wer Comment-Zugriff hat, kann Rückfragen stellen. Du entscheidest pro Person.</p>
          </div>
          <div className="blog-card">
            <div className="blog-card-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </div>
            <h4>Briefings automatisch</h4>
            <p>Tagro schickt zusammengefasste Updates, ohne dass du Mails tippst.</p>
          </div>
          <div className="blog-card">
            <div className="blog-card-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h4>Nicht in deine Daten</h4>
            <p>Keine Edits, keine internen Notizen sichtbar. Trennscharf.</p>
          </div>
        </div>

        <h2 className="blog-h">So funktioniert&apos;s</h2>
        <div className="blog-flow" aria-label="3-Schritt-Flow">
          <div className="flow-step">
            <div className="flow-step-num">1</div>
            <h5>Einladen</h5>
            <p>E-Mail, Rolle, Projekte wählen.</p>
          </div>
          <div className="flow-arrow"><svg width="14" height="8" viewBox="0 0 14 8"><path d="M1 4 H11 M9 1 L12 4 L9 7" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/></svg></div>
          <div className="flow-step">
            <div className="flow-step-num">2</div>
            <h5>Annehmen</h5>
            <p>Person folgt dem Link, sieht ihren Scope.</p>
          </div>
          <div className="flow-arrow"><svg width="14" height="8" viewBox="0 0 14 8"><path d="M1 4 H11 M9 1 L12 4 L9 7" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/></svg></div>
          <div className="flow-step">
            <div className="flow-step-num">3</div>
            <h5>Mitlaufen</h5>
            <p>Tagro hält still informiert, du arbeitest weiter.</p>
          </div>
        </div>

        <h2 className="blog-h">Wer profitiert davon?</h2>
        <ul className="blog-bullets">
          <li><strong>Co-Founder ohne operativen Tagesjob</strong> — wollen den Pulsschlag, nicht das Mikromanagement.</li>
          <li><strong>Marketing-Team</strong> — braucht Status für die Launch-Kommunikation.</li>
          <li><strong>Investoren &amp; Beirat</strong> — Quartalsupdate war gestern. Live-Status ist heute.</li>
          <li><strong>Eltern &amp; Partner bei Bootstrapper-Projekten</strong> — wollen sehen, dass es vorangeht.</li>
          <li><strong>Externe Berater</strong> — punktueller Read-Access statt Slack-Account.</li>
        </ul>

        <div className="blog-quote">
          „Ich brauche keine zehn Meetings pro Woche. Aber ich will wissen, was meine Co-Founder bauen. Mitwirkende hat das erste Mal genau diese Lücke geschlossen."
          <cite>Lukas, Co-Founder · Mode-A-Pilot-Workspace</cite>
        </div>

        <h2 className="blog-h">Was Mitwirkende <em>nicht</em> sind</h2>
        <p className="blog-p">
          Mitwirkende sind <strong>keine Team-Member</strong>. Keine Zuständigkeit, keine Tasks, keine Workload-Auswertung. Auch <strong>kein „Team"</strong> im Festag-Sinne — denn ein Team beschreibt die <em>Form</em> deines Workspace (Founder-Squad, Agentur, Inhouse-Crew). Mitwirkende sind individuelle Personen mit Read-Access. Nicht mehr, nicht weniger.
        </p>

        <h2 className="blog-h">Privatsphäre &amp; Vertrauen</h2>
        <p className="blog-p">
          Mitwirkende sehen exakt das, was du freigegeben hast. Andere Projekte? Unsichtbar. Interne Tagro-Notizen? Versteckt. Dev-Notizen, die nur dein technisches Team kennt? Bleiben intern.
        </p>
        <p className="blog-p">
          Der Zugriff lässt sich mit einem Klick entfernen. Die Person verliert sofort Sicht, ihre Profildaten werden anonymisiert.
        </p>

        <div className="blog-cta">
          <p className="blog-cta-eyebrow">Festag — Mitwirkende</p>
          <h3>Bereit, jemanden still mitschauen zu lassen?</h3>
          <p>Im Dashboard unter „Persönlicher Bereich → Mitwirkende" einrichten. Dauert keine 30 Sekunden.</p>
          <Link href="/observers" className="blog-cta-btn">
            <span>Mitwirkende öffnen</span>
            <svg width="14" height="10" viewBox="0 0 14 10"><path d="M1 5 H11 M8 1 L12 5 L8 9" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/></svg>
          </Link>
        </div>
      </div>
    </main>
  )
}
