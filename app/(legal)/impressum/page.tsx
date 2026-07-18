import type { Metadata } from 'next'
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

      <div className="legal-box">
        <p>
          <strong>Stefan Dirnberger</strong>
          <br />
          Lindenstraße 15
          <br />
          84036 Kumhausen
          <br />
          Deutschland
        </p>
      </div>

      <h2 id="kontakt">Kontakt</h2>
      <p>
        Telefon: <a href="tel:+4987653399973">08765 33 999 73</a>
        <br />
        WhatsApp:{' '}
        <a href="https://wa.me/4915207849821" target="_blank" rel="noopener noreferrer">
          0152 078 498 21
        </a>
        <br />
        E-Mail: <a href="mailto:hello@festag.app">hello@festag.app</a>
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
      </p>

      <h2 id="zahlung">Zahlungsabwicklung</h2>
      <p>
        Rechnungen und Zahlungen werden ausschließlich als technischer Zahlungsdienstleister über die
        <strong> Enjyn® Gruppe</strong> entgegengenommen. Inhaltlich und rechtlich verantwortlich
        für festag ist allein Stefan Dirnberger.
      </p>

      <h2 id="streitschlichtung">EU-Streitschlichtung</h2>
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

      <h2 id="haftung">Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach
        den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter
        jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen
        oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
      </p>

      <LegalStand>Stand: 29. Juni 2026</LegalStand>
    </LegalDoc>
  )
}
