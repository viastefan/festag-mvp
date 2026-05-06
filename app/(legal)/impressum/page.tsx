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

      {/* Primary owner */}
      <div className="box">
        <p style={{ margin:0 }}>
          <strong>Stefan Dirnberger</strong><br/>
          Lindenstraße 15<br/>
          84036 Kumhausen<br/>
          Deutschland
        </p>
      </div>

      <h2>Kontakt</h2>
      <p>
        Telefon: <a href="tel:+4987653399973">08765 33 999 73</a><br/>
        WhatsApp: <a href="https://wa.me/4915207849821" target="_blank" rel="noopener noreferrer">0152 078 498 21</a><br/>
        E-Mail: <a href="mailto:hello@festag.io">hello@festag.io</a>
      </p>

      <h2>Umsatzsteuer-ID</h2>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG:<br/>
        <strong>DE362716091</strong>
      </p>

      <h2>Verantwortlich für den Inhalt</h2>
      <p>nach § 18 Abs. 2 MStV:<br/><strong>Stefan Dirnberger</strong></p>

      <h2>Zahlungsabwicklung</h2>
      <p>
        Rechnungen und Zahlungen werden derzeit über die <strong>Enjyn® Gruppe</strong> entgegengenommen.
        Die Enjyn® Gruppe fungiert dabei ausschließlich als Zahlungsstelle; inhaltlich und rechtlich
        verantwortlich für festag ist Stefan Dirnberger.
      </p>

      {/* Co-founder — subdued, small */}
      <p style={{ marginTop:8, fontSize:12.5, color:'var(--text-muted)', lineHeight:1.6 }}>
        Co-Founder &amp; technische Zahlungsinfrastruktur: Ramon Dehner, Enjyn® Gruppe,
        Bahnhofstraße 15, 84079 Bruckberg.
      </p>

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
