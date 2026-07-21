import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDoc from '@/components/legal/LegalDoc'
import LegalPageHead, { LegalStand } from '@/components/legal/LegalPageHead'
import { LEGAL_COMPANY } from '@/lib/legal-company'
import { legalMetadata } from '@/lib/legal-metadata'
import { IMPRESSUM_TOC } from '@/lib/legal-toc'

export const metadata: Metadata = legalMetadata(
  'Impressum',
  'Impressum und Anbieterkennzeichnung für festag.app.',
  '/impressum',
)

const c = LEGAL_COMPANY

export default function ImpressumPage() {
  return (
    <LegalDoc toc={IMPRESSUM_TOC}>
      <LegalPageHead title="Impressum" />

      <h2 id="anbieter">Anbieter</h2>
      <div className="legal-box">
        <p>
          <span className="legal-box-org">
            <strong>{c.brand}</strong>
          </span>
          {c.operatorName}
          <br />
          {c.street}
          <br />
          {c.postalCity}
          <br />
          {c.country}
          <span className="legal-box-meta">
            E-Mail:{' '}
            <a href={`mailto:${c.email}`}>{c.email}</a>
            <br />
            Telefon:{' '}
            <a href={`tel:${c.phoneTel}`}>{c.phoneDisplay}</a>
          </span>
        </p>
      </div>
      <p>
        Dieses Impressum gilt für die Web-App unter {c.siteHost}, das Kundenportal, öffentlich
        erreichbare Produktseiten sowie verwandte Oberflächen, die unter der Marke Festag
        betrieben werden — soweit nicht ausdrücklich ein anderer Anbieter ausgewiesen ist.
      </p>

      <h2 id="kontakt">Kontakt</h2>
      <p>
        Allgemeine Anfragen:{' '}
        <a href={`mailto:${c.email}`}>{c.email}</a>
        <br />
        Telefon: <a href={`tel:${c.phoneTel}`}>{c.phoneDisplay}</a>
        <br />
        WhatsApp:{' '}
        <a href={c.whatsappUrl} target="_blank" rel="noopener noreferrer">
          {c.whatsappDisplay}
        </a>
      </p>
      <p>
        Für Datenschutzanfragen dieselbe Adresse — siehe{' '}
        <Link href="/datenschutz">Datenschutzerklärung</Link>. Ein gesonderter
        Datenschutzbeauftragter ist derzeit nicht bestellt.
      </p>

      <h2 id="gegenstand">Unternehmensgegenstand</h2>
      <p>{c.subjectMatter}</p>
      <p>
        Festag ist eine Delivery- und Operational-Intelligence-Plattform: Sie hilft Agenturen,
        Teams und Auftraggebern, Arbeitssignale in Status, Risiken, Entscheidungen und nächste
        Schritte zu übersetzen. Festag ist kein generisches Chat-, Social- oder
        Projektmanagement-Produkt.
      </p>
      <p>
        Die Intelligenzschicht hinter der Ausführung (intern als Leqra modelliert) bleibt im
        Produkt für Endnutzer als Festag-Oberfläche sichtbar — nicht als separates Drittprodukt.
      </p>

      <h2 id="ust">Umsatzsteuer-ID</h2>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:
        <br />
        <strong>{c.vatId}</strong>
      </p>

      <h2 id="register">Register- und Gesellschaftsangaben</h2>
      <p>
        Der Anbieter betreibt Festag derzeit als Einzelunternehmen. Ein Eintrag im Handelsregister
        liegt nicht vor. Sollte später eine Kapitalgesellschaft gegründet oder ein
        Handelsregistereintrag erforderlich werden, werden die Angaben hier aktualisiert.
      </p>
      <p>
        Es besteht keine Pflicht zur Angabe einer Wirtschafts-Identifikationsnummer, solange eine
        solche dem Anbieter nicht zugeteilt wurde bzw. gesetzlich nicht auszuweisen ist.
      </p>

      <h2 id="verantwortlich">Verantwortlich für den Inhalt</h2>
      <p>
        nach § 18 Abs. 2 MStV:
        <br />
        <strong>{c.operatorName}</strong>
        <br />
        Anschrift wie unter Anbieter.
      </p>

      <h2 id="zahlung">Zahlungsabwicklung</h2>
      <p>
        Rechnungen und Zahlungen werden als technischer Zahlungsdienstleister über die{' '}
        <strong>{c.paymentProcessor}</strong> entgegengenommen. Inhaltlich und rechtlich
        verantwortlich für {c.siteHost} ist allein {c.operatorName}. Festag speichert keine
        vollständigen Zahlungsinstrumentdaten (z. B. vollständige IBAN oder Kartendaten).
      </p>

      <h2 id="berufsrecht">Aufsicht und Berufsrecht</h2>
      <p>
        Für den Betrieb der Festag-Softwareplattform besteht keine besondere
        berufsrechtliche Zulassung und keine spezielle Aufsichtsbehörde jenseits der allgemeinen
        gewerbe- und datenschutzrechtlichen Vorgaben. Es gelten die allgemeinen Gesetze der
        Bundesrepublik Deutschland.
      </p>
      <p>
        Festag erbringt keine Rechts-, Steuer- oder Wirtschaftsprüfungsberatung. Tagro und andere
        KI-Funktionen ersetzen keine fachliche Beratung durch zugelassene Berufsgruppen.
      </p>

      <h2 id="streitschlichtung">EU-Streitschlichtung und Verbraucherschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          ec.europa.eu/consumers/odr
        </a>
      </p>
      <p>
        Unsere E-Mail-Adresse findest du oben unter Kontakt. Wir sind nicht verpflichtet und nicht
        bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </p>

      <h2 id="haftung">Haftung für Inhalte und Links</h2>
      <p>
        Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen
        Gesetzen verantwortlich. Wir sind nicht verpflichtet, übermittelte oder gespeicherte fremde
        Informationen dauerhaft zu überwachen oder nach Umständen zu forschen, die auf eine
        rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung
        von Informationen nach den allgemeinen Gesetzen bleiben unberührt. Eine diesbezügliche
        Haftung ist erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich.
        Bei Bekanntwerden entsprechender Rechtsverletzungen entfernen wir diese Inhalte umgehend.
      </p>
      <p>
        Unser Angebot kann Links zu externen Websites Dritter enthalten. Auf deren Inhalte haben
        wir keinen Einfluss; für sie ist der jeweilige Anbieter verantwortlich. Die verlinkten
        Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße geprüft. Eine
        permanente inhaltliche Kontrolle ist ohne konkrete Anhaltspunkte nicht zumutbar. Bei
        Bekanntwerden von Rechtsverletzungen entfernen wir entsprechende Links.
      </p>

      <h2 id="weitere">Weitere Rechtstexte</h2>
      <p>
        <Link href="/agb">AGB</Link>
        {', '}
        <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link>
        {', '}
        <Link href="/datenschutz">Datenschutz</Link>
        {', '}
        <Link href="/widerruf">Widerrufsbelehrung</Link>
      </p>

      <LegalStand version="2.0" />
    </LegalDoc>
  )
}
