import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'AGB — festag' }

export default function AGBPage() {
  return (
    <article className="legal">
      <style>{`
        .legal h1 { font-size:32px; font-weight:700; letter-spacing:-.6px; margin:0 0 8px; }
        .legal h2 { font-size:18px; font-weight:700; margin:28px 0 10px; }
        .legal p, .legal li { font-size:14.5px; line-height:1.7; color:var(--text-secondary); }
        .legal ul, .legal ol { padding-left:22px; margin:6px 0 12px; }
        .legal strong { color:var(--text); font-weight:600; }
        .legal .lead { font-size:15px; color:var(--text-muted); margin:0 0 32px; }
        .legal a { color:var(--text); text-decoration:underline; }
      `}</style>

      <h1>Allgemeine Geschäftsbedingungen</h1>
      <p className="lead">
        Diese AGB regeln das Vertragsverhältnis zwischen dir und der <strong>Enjyn Gruppe</strong>,
        über welche das Projekt festag seine Geschäftspraktiken abwickelt.
      </p>

      <h2>§ 1 Geltungsbereich</h2>
      <p>
        Für alle Verträge, die zwischen der Enjyn Gruppe (nachfolgend „Anbieter") und dem Kunden
        über die Plattform festag geschlossen werden, gelten ausschließlich die nachfolgenden
        Allgemeinen Geschäftsbedingungen in der zum Zeitpunkt des Vertragsschlusses gültigen Fassung.
      </p>

      <h2>§ 2 Vertragsgegenstand</h2>
      <p>
        Der Anbieter bietet Software-Entwicklung, Design-Dienstleistungen und KI-gestützte
        Projekt­abwicklung an. Konkrete Leistungen ergeben sich aus dem gewählten Paket
        (Starter, Pro, Growth, Scale) sowie ggf. zusätzlich gebuchten Add-Ons.
      </p>

      <h2>§ 3 Vertragsschluss</h2>
      <ol>
        <li>Der Kunde wählt ein Paket bzw. Add-On und löst die Bestellung über die Plattform aus.</li>
        <li>Mit Eingang der Zahlung über die Enjyn Banking-API (SEPA-Überweisung mit eindeutigem Verwendungszweck) kommt der Vertrag zustande.</li>
        <li>Der Kunde erhält eine Bestätigung per E-Mail.</li>
      </ol>

      <h2>§ 4 Preise und Zahlung</h2>
      <p>
        Es gelten die zum Zeitpunkt der Bestellung auf der Plattform angegebenen Preise. Alle Preise
        sind in Euro und enthalten — sofern nicht anders ausgewiesen — die gesetzliche Umsatzsteuer.
        Zahlungen erfolgen per SEPA-Überweisung mit dem auf der Bestellseite angegebenen
        Verwendungszweck.
      </p>

      <h2>§ 5 Leistungserbringung & Mitwirkung</h2>
      <p>
        Der Anbieter erbringt die vereinbarten Leistungen mit der Sorgfalt eines ordentlichen
        Kaufmanns. Der Kunde verpflichtet sich, alle für die Projektrealisierung erforderlichen
        Informationen, Materialien und Freigaben rechtzeitig bereitzustellen.
      </p>

      <h2>§ 6 Garantie</h2>
      <p>
        Die in den jeweiligen Paketen angegebene Garantiezeit (z. B. „30 Tage Garantie" oder
        „3 Monate Garantie") greift ab Abnahme des Projekts. Während der Garantiezeit werden
        Fehler im gelieferten Code, Performance-Probleme und Funktions­abweichungen vom
        Pflichtenheft kostenlos behoben. Details sind in der Plattform unter „Garantie-Details"
        einsehbar.
      </p>

      <h2>§ 7 Nutzungsrechte</h2>
      <p>
        Mit vollständiger Bezahlung erhält der Kunde die ausschließlichen, übertragbaren
        Nutzungsrechte am gelieferten Code und Design. Der Anbieter behält sich das Recht vor,
        das Projekt im Portfolio zu referenzieren, sofern nicht ausdrücklich anders vereinbart.
      </p>

      <h2>§ 8 Haftung</h2>
      <p>
        Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie nach Maßgabe
        des Produkthaftungsgesetzes. Bei leichter Fahrlässigkeit haftet der Anbieter — außer bei
        Verletzung von Leben, Körper oder Gesundheit — nur bei Verletzung wesentlicher
        Vertragspflichten und begrenzt auf den vorhersehbaren, vertragstypischen Schaden.
      </p>

      <h2>§ 9 Widerrufsrecht</h2>
      <p>
        Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Details siehe&nbsp;
        <a href="/widerruf">Widerrufsbelehrung</a>.
      </p>

      <h2>§ 10 Schlussbestimmungen</h2>
      <p>
        Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Sollten einzelne Bestimmungen
        dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
      </p>

      <p style={{ marginTop:32, fontSize:12, color:'var(--text-muted)' }}>
        Stand: {new Date().toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' })}
      </p>
    </article>
  )
}
