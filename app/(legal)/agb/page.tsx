import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDoc from '@/components/legal/LegalDoc'
import LegalPageHead from '@/components/legal/LegalPageHead'
import { legalMetadata } from '@/lib/legal-metadata'

export const metadata: Metadata = legalMetadata(
  'AGB',
  'Allgemeine Geschäftsbedingungen für Festag-Softwareentwicklung, Design und KI-gestützte Projektabwicklung.',
  '/agb',
)

export default function AGBPage() {
  return (
    <LegalDoc>
      <LegalPageHead
        title="Allgemeine Geschäftsbedingungen"
        lead="Vertragsbedingungen zwischen dir und Stefan Dirnberger (festag). Zahlungen werden technisch über die Enjyn® Gruppe abgewickelt."
        meta="Stand: 29. Juni 2026"
      />

      <h2>§ 1 Geltungsbereich</h2>
      <p>
        Für alle Verträge, die zwischen Stefan Dirnberger (nachfolgend „Anbieter") und dem Kunden
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
        <li>Mit Eingang der Zahlung (SEPA-Überweisung mit eindeutigem Verwendungszweck, abgewickelt durch den Zahlungsdienstleister) kommt der Vertrag zustande.</li>
        <li>Der Kunde erhält eine Bestätigung per E-Mail.</li>
      </ol>

      <h2>§ 4 Preise und Zahlung</h2>
      <p>
        Es gelten die zum Zeitpunkt der Bestellung auf der Plattform angegebenen Preise. Alle Preise
        sind in Euro und enthalten — sofern nicht anders ausgewiesen — die gesetzliche Umsatzsteuer.
        Zahlungen erfolgen per SEPA-Überweisung mit dem auf der Bestellseite angegebenen
        Verwendungszweck.
      </p>

      <h2>§ 5 Leistungserbringung und Mitwirkung</h2>
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
        Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Details siehe{' '}
        <Link href="/widerruf">Widerrufsbelehrung</Link>.
      </p>

      <h2>§ 10 Schlussbestimmungen</h2>
      <p>
        Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Sollten einzelne Bestimmungen
        dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
      </p>
    </LegalDoc>
  )
}
