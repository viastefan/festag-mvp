import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Widerrufsbelehrung — festag' }

export default function WiderrufPage() {
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

      <h1>Widerrufsbelehrung</h1>
      <p className="lead">
        Verbraucher haben ein Widerrufsrecht nach Maßgabe der nachfolgenden Bestimmungen.
        Vertrags­partner ist <strong>Stefan Dirnberger</strong>, Inhaber von festag.
      </p>

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

      <div className="box">
        <p style={{ margin:0 }}>
          <strong>Adressat des Widerrufs:</strong><br/>
          Stefan Dirnberger — festag<br/>
          Lindenstraße 15<br/>
          84036 Kumhausen<br/>
          Telefon: 08765 33 999 73<br/>
          E-Mail: <a href="mailto:stefandirnberger@viawen.com">stefandirnberger@viawen.com</a>
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
        ausdrücklich etwas anderes vereinbart. In keinem Fall werden dir wegen dieser Rückzahlung
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
      <div className="box">
        <p style={{ margin:0, whiteSpace:'pre-line', fontSize:13.5 }}>{`An: Stefan Dirnberger — festag, Lindenstraße 15, 84036 Kumhausen, stefandirnberger@viawen.com

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

      <p style={{ marginTop:32, fontSize:12, color:'var(--text-muted)' }}>
        Stand: {new Date().toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' })}
      </p>
    </article>
  )
}
