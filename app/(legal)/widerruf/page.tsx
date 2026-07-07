import type { Metadata } from 'next'
import LegalDoc from '@/components/legal/LegalDoc'
import LegalPageHead from '@/components/legal/LegalPageHead'
import { legalMetadata } from '@/lib/legal-metadata'

export const metadata: Metadata = legalMetadata(
  'Widerrufsbelehrung',
  'Widerrufsrecht und Muster-Widerrufsformular für Festag-Verträge.',
  '/widerruf',
)

export default function WiderrufPage() {
  return (
    <LegalDoc>
      <LegalPageHead
        title="Widerrufsbelehrung"
        lead="Verbraucher haben ein gesetzliches Widerrufsrecht. Vertragspartner ist Stefan Dirnberger, Inhaber von festag."
        meta="Stand: 29. Juni 2026"
      />

      <h2>Widerrufsrecht</h2>
      <p>
        Du hast das Recht, binnen <strong>vierzehn Tagen</strong> ohne Angabe von Gründen diesen
        Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des
        Vertragsabschlusses.
      </p>
      <p>
        Um dein Widerrufsrecht auszuüben, musst du uns mittels einer eindeutigen Erklärung
        (z. B. ein mit der Post versandter Brief oder eine E-Mail) über deinen Entschluss,
        diesen Vertrag zu widerrufen, informieren.
      </p>

      <div className="legal-box">
        <p>
          <strong>Adressat des Widerrufs:</strong><br />
          Stefan Dirnberger, festag<br />
          Lindenstraße 15<br />
          84036 Kumhausen<br />
          Telefon: 08765 33 999 73<br />
          E-Mail: <a href="mailto:hello@festag.app">hello@festag.app</a>
        </p>
      </div>

      <p>
        Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des
        Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.
      </p>

      <h2>Folgen des Widerrufs</h2>
      <p>
        Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten
        haben, unverzüglich und spätestens binnen <strong>vierzehn Tagen</strong> ab dem Tag
        zurückzuzahlen, an dem die Mitteilung über deinen Widerruf bei uns eingegangen ist.
      </p>
      <p>
        Für die Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen
        Transaktion eingesetzt hast (in der Regel SEPA-Rücküberweisung), es sei denn, mit dir wurde
        ausdrücklich etwas anders vereinbart. In keinem Fall werden dir wegen dieser Rückzahlung
        Entgelte berechnet.
      </p>

      <h2>Vorzeitiges Erlöschen des Widerrufsrechts</h2>
      <p>
        Das Widerrufsrecht erlischt bei einem Vertrag zur Erbringung von Dienstleistungen vorzeitig,
        wenn wir die Dienstleistung mit deiner ausdrücklichen Zustimmung vollständig erbracht haben
        und du gleichzeitig bestätigt hast, dass du dein Widerrufsrecht bei vollständiger
        Vertragserfüllung verlierst.
      </p>

      <h2>Muster-Widerrufsformular</h2>
      <div className="legal-box">
        <p style={{ whiteSpace: 'pre-line', fontSize: 13.5 }}>{`An: Stefan Dirnberger, festag, Lindenstraße 15, 84036 Kumhausen, hello@festag.app

Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen
Vertrag über die Erbringung der folgenden Dienstleistung:
______________________________________________________

Bestellt am: __________ / Erhalten am: __________
Name des/der Verbraucher(s): __________
Anschrift des/der Verbraucher(s): __________

Datum: __________
Unterschrift (nur bei Mitteilung auf Papier): __________

(*) Unzutreffendes streichen.`}</p>
      </div>
    </LegalDoc>
  )
}
