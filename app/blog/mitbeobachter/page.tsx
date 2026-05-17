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
        @font-face { font-family: 'Aeonik'; src: url('/fonts/Aeonik-Bold.ttf') format('truetype'); font-weight:600 700; font-display:swap; }
        @font-face { font-family: 'Qurova DEMO'; src: url('/fonts/QurovaDEMO-Medium.otf') format('opentype'); font-weight:500; font-display:swap; }
        * { box-sizing:border-box; }
        .blog-shell {
          max-width:760px; margin:0 auto;
          padding:84px 28px 140px;
          font-family:'Aeonik', Inter, system-ui, sans-serif;
          font-weight:400; letter-spacing:.02em;
          color:#1F2531;
          position:relative;
        }
        .blog-shell::before {
          content:''; position:absolute;
          top:60px; left:-100px; width:240px; height:240px;
          background:radial-gradient(circle at center, rgba(91,100,125,0.10), transparent 70%);
          filter:blur(40px); z-index:-1; pointer-events:none;
        }
        .blog-shell::after {
          content:''; position:absolute;
          top:340px; right:-120px; width:300px; height:300px;
          background:radial-gradient(circle at center, rgba(232,232,229,0.5), rgba(247,244,236,0.3) 50%, transparent 75%);
          filter:blur(48px); z-index:-1; pointer-events:none;
        }
        body { background:linear-gradient(to bottom, #FAFBFC 0%, #F6F7F9 100%); }
        .blog-top {
          display:flex; align-items:center; justify-content:space-between;
          margin-bottom:48px;
        }
        .blog-brand {
          font-family:'Qurova DEMO', serif; font-size:20px; font-weight:500;
          color:#202532; text-decoration:none; letter-spacing:-.2px;
        }
        .blog-back { font-size:13px; color:#5B647D; text-decoration:none; font-weight:500; }
        .blog-back:hover { color:#202532; }

        .blog-eyebrow {
          display:inline-flex; align-items:center; gap:10px;
          color:#7B8294; font-size:11px; font-weight:600;
          letter-spacing:.22em; text-transform:uppercase;
          margin:0 0 22px; position:relative;
        }
        .blog-eyebrow::before {
          content:''; width:30px; height:1px; background:#5B647D;
        }
        .blog-title {
          font-size:clamp(40px, 6vw, 60px);
          font-weight:700; line-height:1.02;
          letter-spacing:-.028em;
          margin:0 0 22px; color:#0F141B;
        }
        .blog-title em {
          font-style:italic;
          font-family:'Qurova DEMO', serif;
          font-weight:500;
          color:#5B647D;
          letter-spacing:-.01em;
        }
        .blog-lead {
          font-size:19px; line-height:1.65;
          color:#3a4150; margin:0 0 12px;
          font-weight:400; letter-spacing:.015em;
          max-width:620px;
        }
        .blog-lead strong { color:#0F141B; font-weight:600; letter-spacing:.015em; }
        .blog-meta {
          display:inline-flex; align-items:center; gap:14px;
          font-size:12px; color:#9aa1ad; font-weight:500;
          margin:32px 0 48px; letter-spacing:.05em;
          text-transform:uppercase;
        }
        .blog-meta span { color:#C7CDD6; }

        .blog-hero {
          margin:48px 0;
          padding:38px 30px;
          border-radius:20px;
          background:linear-gradient(135deg, #EEF2F7 0%, #F6F9FC 100%);
          border:1px solid #E7EBF0;
          display:flex; align-items:center; justify-content:center; gap:18px;
          flex-wrap:wrap;
        }
        .hero-node {
          display:flex; flex-direction:column; align-items:center; gap:8px;
        }
        .hero-circle {
          width:64px; height:64px; border-radius:999px;
          display:flex; align-items:center; justify-content:center;
          color:#fff; font-size:14px; font-weight:700;
          box-shadow:0 8px 28px rgba(32,37,50,.10);
        }
        .hero-label {
          font-size:11.5px; font-weight:600;
          color:#4E5567; letter-spacing:.04em;
        }
        .hero-arrow { display:flex; align-items:center; opacity:.5; }

        h2.blog-h {
          font-size:32px; font-weight:600; letter-spacing:-.022em;
          color:#0F141B; margin:64px 0 18px;
          line-height:1.12;
          max-width:560px;
        }
        h2.blog-h::before {
          content:''; display:block; width:24px; height:2px;
          background:#5B647D; margin-bottom:18px; opacity:.5;
        }
        h3.blog-h3 {
          font-size:17px; font-weight:600; letter-spacing:-.008em;
          color:#202532; margin:28px 0 8px;
        }
        p.blog-p {
          font-size:16.5px; line-height:1.78;
          color:#3a4150; margin:0 0 18px;
          max-width:640px;
          letter-spacing:.018em;
        }
        p.blog-p em { font-style:italic; color:#5B647D; }
        p.blog-p strong { color:#0F141B; font-weight:600; letter-spacing:.018em; }

        .blog-cards {
          display:grid;
          grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));
          gap:14px;
          margin:24px 0;
        }
        .blog-card {
          padding:20px 22px; border-radius:14px;
          border:1px solid #E7EBF0;
          background:#fff;
        }
        .blog-card-icon {
          width:34px; height:34px; border-radius:9px;
          background:linear-gradient(135deg, #EEF2F7, #F6F9FC);
          border:1px solid #E7EBF0;
          display:flex; align-items:center; justify-content:center;
          color:#5B647D; margin-bottom:14px;
        }
        .blog-card h4 {
          font-size:14.5px; font-weight:600; margin:0 0 4px; color:#0F141B;
        }
        .blog-card p {
          font-size:13px; line-height:1.55; color:#4E5567; margin:0;
        }

        .blog-quote {
          margin:56px 0; padding:32px 0 32px 0;
          font-family:'Qurova DEMO', serif;
          font-size:clamp(24px, 3.2vw, 32px);
          line-height:1.3; color:#202532;
          font-style:italic; font-weight:500;
          letter-spacing:-.014em;
          position:relative;
          max-width:680px;
        }
        .blog-quote::before {
          content:'"'; position:absolute;
          top:-12px; left:-30px;
          font-family:'Qurova DEMO', serif;
          font-size:80px; color:#5B647D; opacity:.16;
          line-height:1;
        }
        .blog-quote cite {
          display:block; margin-top:18px; font-size:12.5px;
          font-style:normal; color:#7B8294; font-weight:500;
          font-family:'Aeonik', sans-serif;
          letter-spacing:.05em;
          text-transform:uppercase;
        }

        .blog-cta {
          margin:88px 0 0;
          padding:48px 0 0; position:relative;
          border-top:1px solid #E7EBF0;
        }
        .blog-cta-eyebrow {
          font-size:11px; color:#7B8294; font-weight:600;
          letter-spacing:.22em; text-transform:uppercase;
          margin:0 0 14px;
        }
        .blog-cta h3 {
          margin:0 0 8px; font-size:clamp(26px, 3.2vw, 34px);
          font-weight:600; letter-spacing:-.022em;
          color:#0F141B; line-height:1.16;
          max-width:500px;
        }
        .blog-cta p {
          margin:0 0 22px; font-size:15px; color:#4E5567;
          line-height:1.6; max-width:480px; letter-spacing:.018em;
        }
        .blog-cta-btn {
          display:inline-flex; align-items:center; gap:10px;
          height:46px; padding:0 22px; border-radius:999px;
          background:#0F141B; color:#fff;
          font-size:14px; font-weight:500; text-decoration:none;
          letter-spacing:.02em;
          transition:transform .15s ease, background .15s ease;
        }
        .blog-cta-btn:hover { transform:translateY(-1px); background:#202532; }

        .blog-bullets { padding:0 0 0 4px; margin:14px 0; }
        .blog-bullets li {
          list-style:none; padding-left:26px; margin:8px 0;
          position:relative; font-size:15px; line-height:1.6; color:#3a4150;
        }
        .blog-bullets li::before {
          content:''; position:absolute; left:0; top:8px;
          width:14px; height:14px; border-radius:5px;
          background:linear-gradient(135deg, #EEF2F7, #DCE1EA);
          border:1px solid #C7CDD6;
        }
        .blog-bullets li::after {
          content:'✓'; position:absolute; left:3px; top:5px;
          font-size:9px; color:#5B647D; font-weight:700;
        }

        /* Diagram: how it works */
        .blog-flow {
          margin:24px 0;
          padding:28px 24px;
          border:1px solid #E7EBF0; border-radius:14px;
          background:#fff;
          display:grid;
          grid-template-columns:1fr auto 1fr auto 1fr;
          gap:12px; align-items:center;
        }
        .flow-step {
          text-align:center; padding:14px 10px;
          border-radius:10px; background:#F6F9FC; border:1px solid #EEF2F7;
        }
        .flow-step-num {
          width:24px; height:24px; border-radius:999px;
          background:#5B647D; color:#fff; margin:0 auto 8px;
          display:flex; align-items:center; justify-content:center;
          font-size:11.5px; font-weight:700;
        }
        .flow-step h5 { margin:0 0 4px; font-size:13px; font-weight:600; color:#0F141B; }
        .flow-step p { margin:0; font-size:11.5px; color:#5B647D; line-height:1.45; }
        .flow-arrow { color:#C7CDD6; font-size:18px; text-align:center; }

        @media(max-width:640px) {
          .blog-flow { grid-template-columns:1fr; }
          .flow-arrow { transform:rotate(90deg); }
          .blog-cta { flex-direction:column; align-items:flex-start; }
        }
      `}</style>

      <div className="blog-shell">
        <header className="blog-top">
          <Link href="/" className="blog-brand">festag</Link>
          <Link href="/" className="blog-back">← Zurück</Link>
        </header>

        <p className="blog-eyebrow">Produkt — Mitwirkende</p>
        <h1 className="blog-title">Stille <em>Stakeholder.</em><br/>Ohne Lärm.</h1>
        <p className="blog-lead">
          Co-Founder, Marketing, Eltern, Investoren, Partner. Es gibt immer Menschen, die wissen wollen wie&apos;s
          läuft — aber nicht im Daily sitzen sollten. Festag macht aus diesem stillen Mitlaufen ein eigenes
          Konzept: <strong>Mitwirkende</strong>.
        </p>
        <p className="blog-meta">17. Mai 2026 <span>—</span> 4 Min. Lesezeit <span>—</span> Festag Studio</p>

        {/* Hero-Diagramm */}
        <div className="blog-hero" aria-label="Mitwirkende-Konzept">
          <div className="hero-node">
            <div className="hero-circle" style={{ background:'#5B647D' }}>DU</div>
            <span className="hero-label">Inhaber:in</span>
          </div>
          <div className="hero-arrow">
            <svg width="40" height="14" viewBox="0 0 40 14"><path d="M2 7 H35 M30 2 L37 7 L30 12" stroke="#7B8294" strokeWidth="1.4" fill="none" /></svg>
          </div>
          <div className="hero-node">
            <div className="hero-circle" style={{ background:'#202532' }}>F</div>
            <span className="hero-label">Festag-Workspace</span>
          </div>
          <div className="hero-arrow">
            <svg width="40" height="14" viewBox="0 0 40 14"><path d="M2 7 H35 M30 2 L37 7 L30 12" stroke="#7B8294" strokeWidth="1.4" fill="none" /></svg>
          </div>
          <div className="hero-node">
            <div className="hero-circle" style={{ background:'#9aa1ad' }} aria-label="Mitwirkende">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M14 17.5c.4-1.6 1.7-2.5 3-2.5 2 0 3.5 1.5 3.5 3.5"/></svg>
            </div>
            <span className="hero-label">Mitwirkende</span>
          </div>
        </div>

        <h2 className="blog-h">Warum überhaupt ein neues Konzept?</h2>
        <p className="blog-p">
          Klassische SaaS-Tools kennen zwei Rollen: <em>Member</em> (baut mit) und <em>Admin</em>
          (verwaltet). Wer „nur mitschauen" will, bekommt entweder einen Vollzugriff, den niemand braucht — oder gar nichts. Beides ist falsch.
        </p>
        <p className="blog-p">
          In den meisten Projekten gibt es eine dritte Gruppe: Menschen, die <strong>still informiert</strong>
          bleiben sollen. Sie schreiben keine Tasks, machen keine Status-Reviews, brauchen keine Schreibrechte. Aber wenn sie fragen „wie weit seid ihr?",
          willst du nicht 20 Minuten lang erklären müssen.
        </p>
        <p className="blog-p">Genau dafür gibt es Mitwirkende.</p>

        <h2 className="blog-h">Was Mitwirkende können — und was nicht</h2>
        <div className="blog-cards">
          <div className="blog-card">
            <div className="blog-card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <h4>Sehen, was passiert</h4>
            <p>Projektstatus, Phase, Fortschritt, Tasks, Risiken — alles read-only sichtbar.</p>
          </div>
          <div className="blog-card">
            <div className="blog-card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h4>Auf Wunsch kommentieren</h4>
            <p>Wer Comment-Zugriff hat, kann Rückfragen stellen. Niemand muss es zulassen — du entscheidest.</p>
          </div>
          <div className="blog-card">
            <div className="blog-card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13 1.05.37 2.07.71 3.06a2 2 0 0 1-.45 2.11l-1.27 1.27a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.99.34 2.01.58 3.06.71A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <h4>Briefings automatisch erhalten</h4>
            <p>Tagro schickt zusammengefasste Updates, ohne dass du eine Mail tippst.</p>
          </div>
          <div className="blog-card">
            <div className="blog-card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h4>Nicht in deine Daten</h4>
            <p>Keine Tasks ändern, keine Briefings löschen, keine internen Notizen sehen. Trennscharf.</p>
          </div>
        </div>

        <h2 className="blog-h">So funktioniert&apos;s</h2>
        <div className="blog-flow" aria-label="3-Schritt-Flow">
          <div className="flow-step">
            <div className="flow-step-num">1</div>
            <h5>Einladen</h5>
            <p>E-Mail + Projekte wählen.</p>
          </div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">
            <div className="flow-step-num">2</div>
            <h5>Annehmen</h5>
            <p>Person folgt dem Link, sieht nur ihren Scope.</p>
          </div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">
            <div className="flow-step-num">3</div>
            <h5>Mitlaufen</h5>
            <p>Tagro hält still informiert, du arbeitest weiter.</p>
          </div>
        </div>

        <h2 className="blog-h">Wer profitiert davon?</h2>
        <ul className="blog-bullets">
          <li><strong>Co-Founder ohne operativen Tagesjob</strong> — wollen den Pulsschlag, nicht das Mikromanagement.</li>
          <li><strong>Marketing-Team</strong> — braucht Status, um Launch-Kommunikation vorzubereiten.</li>
          <li><strong>Investoren & Beirat</strong> — Quartalsupdate war gestern. Live-Status ist heute.</li>
          <li><strong>Eltern & Partner bei Bootstrapper-Projekten</strong> — wollen einfach sehen, dass es vorangeht.</li>
          <li><strong>Externe Berater</strong> — punktueller Read-only-Zugriff statt Slack-Account.</li>
        </ul>

        <div className="blog-quote">
          „Ich brauche keine zehn Meetings pro Woche. Aber ich will wissen, was meine Co-Founder bauen.
          Mitwirkende hat das erste Mal genau diese Lücke geschlossen."
          <cite>— Lukas, Co-Founder, Mode-A-Pilot-Workspace</cite>
        </div>

        <h2 className="blog-h">Was Mitwirkende <em>nicht</em> sind</h2>
        <p className="blog-p">
          Wichtig: Mitwirkende sind <strong>keine Team-Member</strong>. Sie haben keine Zuständigkeit, keine Tasks zugewiesen,
          tauchen nicht in Workload-Auswertungen auf. Sie sind auch <strong>kein „Team"</strong> im Festag-Sinne — denn ein Team
          beschreibt die <em>Form</em> deines Workspace (Founder-Squad, Agentur, Inhouse-Crew). Mitwirkende sind individuelle
          Personen mit Read-Access — nichts mehr, nichts weniger.
        </p>

        <h2 className="blog-h">Privatsphäre & Vertrauen</h2>
        <p className="blog-p">
          Mitwirkende sehen exakt das, was du freigegeben hast. Andere Projekte? Unsichtbar. Interne Tagro-Notizen? Versteckt.
          Dev-Notizen, die nur dein technisches Team kennt? Bleiben intern. Trennscharf, jederzeit revidierbar.
        </p>
        <p className="blog-p">
          Der Zugriff lässt sich mit einem Klick entfernen — die Person verliert sofort Sicht, ihre Profildaten werden anonymisiert.
        </p>

        <div className="blog-cta">
          <p className="blog-cta-eyebrow">Festag — Mitwirkende</p>
          <h3>Bereit, jemanden still mitschauen zu lassen?</h3>
          <p>Im Dashboard unter „Persönlicher Bereich → Mitwirkende" einrichten. Dauert keine 30 Sekunden.</p>
          <Link href="/observers" className="blog-cta-btn">
            <span>Mitwirkende öffnen</span>
            <svg width="16" height="12" viewBox="0 0 16 12"><path d="M1 6 H13 M9 1 L14 6 L9 11" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
          </Link>
        </div>
      </div>
    </main>
  )
}
