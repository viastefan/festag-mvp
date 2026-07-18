import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDoc from '@/components/legal/LegalDoc'
import LegalPageHead, { LegalStand } from '@/components/legal/LegalPageHead'
import { legalMetadata } from '@/lib/legal-metadata'

export const metadata: Metadata = legalMetadata(
  'Widerrufsbelehrung',
  'Widerrufsrecht und Muster-Widerrufsformular für Festag-Verträge.',
  '/widerruf',
)

export default function WiderrufPage() {
  return (
    <LegalDoc>
      <LegalPageHead title="Widerrufsbelehrung" />

      <h2 id="widerrufsrecht">Widerrufsrecht</h2>
      <p>
        Wenn du Verbraucher bist, hast du das Recht, binnen <strong>vierzehn Tagen</strong> ohne
        Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage
        ab dem Tag des Vertragsabschlusses.
      </p>
      <p>
        Um dein Widerrufsrecht auszuüben, musst du uns mittels einer eindeutigen Erklärung (z. B.
        Brief oder E-Mail) über deinen Entschluss informieren, diesen Vertrag zu widerrufen. Du
        kannst dafür das untenstehende Muster-Widerrufsformular verwenden, bist dazu aber nicht
        verpflichtet.
      </p>

      <div className="legal-box">
        <p>
          <strong>Adressat des Widerrufs</strong>
          <br />
          Stefan Dirnberger, festag
          <br />
          Lindenstraße 15
          <br />
          84036 Kumhausen
          <br />
          Telefon: 08765 33 999 73
          <br />
          E-Mail: <a href="mailto:hello@festag.app">hello@festag.app</a>
        </p>
      </div>

      <p>
        Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des
        Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.
      </p>

      <h2 id="folgen">Folgen des Widerrufs</h2>
      <p>
        Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten
        haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem
        die Mitteilung über deinen Widerruf bei uns eingegangen ist. Für diese Rückzahlung verwenden
        wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast, es
        sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden dir
        wegen dieser Rückzahlung Entgelte berechnet.
      </p>
      <p>
        Hast du verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen sollen, so
        hast du uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu
        dem du uns von der Ausübung des Widerrufsrechts unterrichtest, bereits erbrachten
        Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen
        entspricht.
      </p>

      <h2 id="vorzeitiger-beginn">Vorzeitiger Beginn digitaler Leistungen</h2>
      <p>
        Bei Verträgen über die Lieferung digitaler Inhalte, die nicht auf einem körperlichen
        Datenträger geliefert werden, bzw. bei Dienstleistungen kann das Widerrufsrecht unter
        den gesetzlichen Voraussetzungen erlöschen, wenn die Ausführung mit deiner ausdrücklichen
        Zustimmung vor Ablauf der Widerrufsfrist begonnen hat und du Kenntnis vom Erlöschen
        erlangt hast. Einzelheiten ergeben sich aus dem Bestellvorgang und den{' '}
        <Link href="/agb">AGB</Link>.
      </p>

      <h2 id="muster">Muster-Widerrufsformular</h2>
      <p>
        Wenn du den Vertrag widerrufen willst, kannst du dieses Formular ausfüllen und an uns
        zurücksenden:
      </p>
      <div className="legal-box">
        <p style={{ whiteSpace: 'pre-line', fontSize: 14.5, fontWeight: 400 }}>
          {`An:
Stefan Dirnberger, festag
Lindenstraße 15
84036 Kumhausen
hello@festag.app

Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen
Vertrag über die Erbringung der folgenden Dienstleistung:
______________________________________________________

Bestellt am: __________ / Erhalten am: __________
Name des/der Verbraucher(s): __________
Anschrift des/der Verbraucher(s): __________

Datum: __________
Unterschrift (nur bei Mitteilung auf Papier): __________

(*) Unzutreffendes streichen.`}
        </p>
      </div>

      <LegalStand>Stand: 19. Juli 2026</LegalStand>
    </LegalDoc>
  )
}
