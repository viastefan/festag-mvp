import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Impressum — festag' }

export default function ImpressumPage() {
  return (
    <article className="legal">
      <style>{`
        .legal h1 { font-size:32px; font-weight:700; letter-spacing:-.6px; margin:0 0 8px; }
        .legal h2 { font-size:18px; font-weight:700; margin:28px 0 10px; }
        .legal p, .legal li { font-size:14.5px; line-height:1.7; color:var(--text-secondary); }
        .legal strong { color:var(--text); font-weight:600; }
        .legal .lead { font-size:15px; color:var(--text-muted); margin:0 0 32px; }
        .legal .box { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:18px 20px; margin:18px 0; }
        .legal a { color:var(--text); text-decoration:underline; }
      `}</style>

      <h1>Impressum</h1>
      <p className="lead">Angaben gemäß § 5 TMG</p>

      <div className="box">
        <p style={{ margin:0 }}>
          <strong>festag</strong> — AI-native Softwareproduktion<br/>
          ein Projekt der Enjyn Gruppe<br/>
          [Strasse Nr.]<br/>
          [PLZ Ort]<br/>
          Deutschland
        </p>
      </div>

      <h2>Rechtsträger und Vertragsabwicklung</h2>
      <p>
        festag ist ein unabhängiges Projekt. Sämtliche Geschäftspraktiken, Verträge,
        Rechnungen und Zahlungen werden über die <strong>Enjyn Gruppe</strong> als verantwortlichen
        Rechtsträger abgewickelt.
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href="mailto:hello@festag.io">hello@festag.io</a><br/>
        Telefon: +49 089 123 456 78
      </p>

      <h2>Vertretungsberechtigt</h2>
      <p>[Name der Geschäftsführung / Inhaber:in]</p>

      <h2>Umsatzsteuer-ID</h2>
      <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG:<br/>[USt-IdNr.]</p>

      <h2>Verantwortlich für den Inhalt</h2>
      <p>nach § 18 Abs. 2 MStV:<br/>[Name], [Adresse]</p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:&nbsp;
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          ec.europa.eu/consumers/odr
        </a>
      </p>
      <p>
        Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach
        den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter
        jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen
        oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
      </p>

      <p style={{ marginTop:32, fontSize:12, color:'var(--text-muted)' }}>
        Stand: {new Date().toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' })}
      </p>
    </article>
  )
}
