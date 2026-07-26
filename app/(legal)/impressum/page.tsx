import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDoc from '@/components/legal/LegalDoc'
import LegalPageHead, { LegalStand } from '@/components/legal/LegalPageHead'
import { legalMetadata } from '@/lib/legal-metadata'

export const metadata: Metadata = legalMetadata(
  'Impressum',
  'Impressum und Anbieterkennzeichnung für festag.app.',
  '/impressum',
)

export default function ImpressumPage() {
  return (
    <LegalDoc>
      <LegalPageHead title="Impressum" />

      <h2 id="anbieter">Anbieter</h2>
      <div className="legal-box">
        <p>
          <span className="legal-box-org">
            <strong>Festag</strong>
          </span>
          Stefan Dirnberger
          <br />
          Lindenstraße 15
          <br />
          84036 Kumhausen
          <br />
          Deutschland
          <span className="legal-box-meta">
            E-Mail:{' '}
            <a href="mailto:hello@festag.app">hello@festag.app</a>
            <br />
            Telefon:{' '}
            <a href="tel:+4987653399973">08765 33 999 73</a>
          </span>
        </p>
      </div>
      <p>
        Festag betreibt unter festag.app eine Delivery-Intelligence-Plattform für Agenturen,
        Teams und Auftraggeber. Dieses Impressum gilt für die Web-App, das Kundenportal und die
        öffentlich erreichbaren festag.app-Seiten.
      </p>

      <h2 id="kontakt">Kontakt</h2>
      <p>
        Allgemeine Anfragen:{' '}
        <a href="mailto:hello@festag.app">hello@festag.app</a>
        <br />
        Telefon: <a href="tel:+4987653399973">08765 33 999 73</a>
        <br />
        WhatsApp:{' '}
        <a href="https://wa.me/4915207849821" target="_blank" rel="noopener noreferrer">
          0152 078 498 21
        </a>
      </p>

      <h2 id="ust">Umsatzsteuer-ID</h2>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG:
        <br />
        <strong>DE362716091</strong>
      </p>

      <h2 id="verantwortlich">Verantwortlich für den Inhalt</h2>
      <p>
        nach § 18 Abs. 2 MStV:
        <br />
        <strong>Stefan Dirnberger</strong>
        <br />
        Anschrift wie unter Anbieter.
      </p>

      <h2 id="zahlung">Zahlungsabwicklung</h2>
      <p>
        Rechnungen und Zahlungen werden als technischer Zahlungsdienstleister über die{' '}
        <strong>Enjyn® Gruppe</strong> entgegengenommen. Inhaltlich und rechtlich verantwortlich
        für festag.app ist allein Stefan Dirnberger. Festag speichert keine vollständigen
        Zahlungsinstrumentdaten.
      </p>

      <h2 id="streitschlichtung">EU-Streitschlichtung und Verbraucherschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          ec.europa.eu/consumers/odr
        </a>
      </p>
      <p>
        Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2 id="haftung">Haftung für Inhalte und Links</h2>
      <p>
        Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen
        Gesetzen verantwortlich. Wir sind nicht verpflichtet, übermittelte oder gespeicherte fremde
        Informationen dauerhaft zu überwachen oder nach Umständen zu forschen, die auf eine
        rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung
        von Informationen nach den allgemeinen Gesetzen bleiben unberührt.
      </p>
      <p>
        Unser Angebot kann Links zu externen Websites Dritter enthalten. Auf deren Inhalte haben
        wir keinen Einfluss; für sie ist der jeweilige Anbieter verantwortlich. Bei Bekanntwerden
        von Rechtsverletzungen entfernen wir entsprechende Links.
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

      <LegalStand>Stand: 19. Juli 2026. Gültig ab diesem Datum.</LegalStand>
    </LegalDoc>
  )
}
