import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Datenschutz — festag' }

export default function DatenschutzPage() {
  return (
    <article className="legal">
      <style>{`
        .legal h1 { font-size:32px; font-weight:700; letter-spacing:-.6px; margin:0 0 8px; }
        .legal h2 { font-size:18px; font-weight:700; margin:28px 0 10px; }
        .legal h3 { font-size:15px; font-weight:600; margin:18px 0 6px; }
        .legal p, .legal li { font-size:14.5px; line-height:1.7; color:var(--text-secondary); }
        .legal ul { padding-left:22px; margin:6px 0 12px; }
        .legal strong { color:var(--text); font-weight:600; }
        .legal .lead { font-size:15px; color:var(--text-muted); margin:0 0 32px; }
        .legal a { color:var(--text); text-decoration:underline; }
      `}</style>

      <h1>Datenschutzerklärung</h1>
      <p className="lead">
        Diese Datenschutzerklärung informiert dich über Art, Umfang und Zweck der Verarbeitung
        personenbezogener Daten in unserem Online-Angebot. Verantwortlicher für die Datenverarbeitung
        ist die <strong>Enjyn Gruppe</strong>, über welche festag seine Geschäftspraktiken abwickelt.
      </p>

      <h2>1. Verantwortlicher</h2>
      <p>
        Enjyn Gruppe<br/>
        [Strasse Nr.], [PLZ Ort]<br/>
        E-Mail: <a href="mailto:hello@festag.io">hello@festag.io</a>
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li><strong>Account-Daten:</strong> E-Mail, Name, Profilbild (via Google/Apple OAuth)</li>
        <li><strong>Projektdaten:</strong> Inhalte die du in der App erstellst (Projekte, Tasks, Nachrichten)</li>
        <li><strong>Zahlungsdaten:</strong> Verarbeitung über die Enjyn Banking-API (SEPA-Referenz, Beträge — keine Kontodaten bei uns gespeichert)</li>
        <li><strong>Technische Daten:</strong> IP-Adresse, Browser, Betriebssystem, Zeitstempel</li>
      </ul>

      <h2>3. Rechtsgrundlagen</h2>
      <p>
        Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung),
        Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) und ggf. Art. 6 Abs. 1 lit. a DSGVO
        (Einwilligung).
      </p>

      <h2>4. Drittanbieter</h2>
      <ul>
        <li><strong>Supabase</strong> (EU-Hosting) — Datenbank, Authentifizierung, Realtime</li>
        <li><strong>Vercel</strong> — Hosting der Web-App</li>
        <li><strong>Anthropic Claude</strong> — KI-Funktionen (Tagro AI). Keine personenbezogenen Daten in Prompts ohne Notwendigkeit.</li>
        <li><strong>Enjyn Banking-API</strong> — Zahlungsabwicklung via SEPA</li>
      </ul>

      <h2>5. Cookies</h2>
      <p>
        Wir nutzen technisch notwendige Cookies (Session-Management, Auth-Tokens). Tracking-Cookies
        werden nur nach deiner Einwilligung gesetzt.
      </p>

      <h2>6. Deine Rechte</h2>
      <ul>
        <li>Auskunft über gespeicherte Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch (Art. 21 DSGVO)</li>
        <li>Beschwerde bei einer Aufsichtsbehörde</li>
      </ul>

      <h2>7. Speicherdauer</h2>
      <p>
        Wir speichern deine Daten so lange, wie es für die Erbringung unserer Dienste erforderlich
        ist oder gesetzliche Aufbewahrungsfristen bestehen. Account-Daten löschen wir auf Anfrage
        binnen 30 Tagen.
      </p>

      <h2>8. Kontakt</h2>
      <p>
        Bei Fragen zum Datenschutz wende dich an&nbsp;
        <a href="mailto:hello@festag.io">hello@festag.io</a>.
      </p>

      <p style={{ marginTop:32, fontSize:12, color:'var(--text-muted)' }}>
        Stand: {new Date().toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' })}
      </p>
    </article>
  )
}
