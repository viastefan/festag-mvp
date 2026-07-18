import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDoc from '@/components/legal/LegalDoc'
import LegalPageHead, { LegalStand } from '@/components/legal/LegalPageHead'
import { legalMetadata } from '@/lib/legal-metadata'
import { AGB_TOC } from '@/lib/legal-toc'

export const metadata: Metadata = legalMetadata(
  'AGB',
  'Allgemeine Geschäftsbedingungen für die Nutzung von Festag als Delivery-Intelligence-Plattform.',
  '/agb',
)

export default function AGBPage() {
  return (
    <LegalDoc toc={AGB_TOC}>
      <LegalPageHead title="Allgemeine Geschäftsbedingungen" />

      <h2 id="geltungsbereich">§ 1 Geltungsbereich</h2>
      <p>
        Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge über die Nutzung
        der Plattform festag.app und verwandter Dienste zwischen Stefan Dirnberger (nachfolgend
        „Anbieter“ oder „Festag“) und dem Kunden — unabhängig davon, ob der Kunde als Unternehmer
        oder Verbraucher handelt.
      </p>
      <p>
        Abweichende, entgegenstehende oder ergänzende Bedingungen des Kunden werden nur
        Vertragsbestandteil, wenn Festag ihrer Geltung ausdrücklich schriftlich zugestimmt hat.
        Individuelle Vereinbarungen (z. B. Agency- oder Enterprise-Verträge) haben Vorrang vor
        diesen AGB, soweit sie ausdrücklich etwas anderes regeln.
      </p>
      <p>
        Ergänzend gelten die <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link> und die{' '}
        <Link href="/datenschutz">Datenschutzerklärung</Link>. Bei Widersprüchen zwischen
        Nutzungsbedingungen und AGB gehen die AGB vor, soweit sie den Vertragsgegenstand,
        Vergütung, Haftung oder Laufzeit betreffen.
      </p>

      <h2 id="vertragsgegenstand">§ 2 Vertragsgegenstand</h2>
      <p>
        Festag ist eine Delivery-Intelligence-Plattform. Der Anbieter stellt Software und
        zugehörige Online-Dienste bereit, mit denen Teams und Agenturen Projekt-, Delivery- und
        Portfoliosignale zusammenführen, Status und Risiken nachvollziehbar machen, Entscheidungen
        und Freigaben abbilden und Auftraggeber klar informieren können.
      </p>
      <p>
        Zum Leistungsumfang können je nach gebuchtem Plan und Konfiguration insbesondere gehören:
      </p>
      <ul>
        <li>Kundenportal und Workspace-Oberflächen (u. a. Status, Entscheidungen, Aktivität)</li>
        <li>Tagro als projektbezogene KI-Unterstützung (Interpretation, Entwürfe, Zusammenfassungen)</li>
        <li>Anbindungen an Drittsysteme (z. B. Code-, Issue- oder Chat-Tools), soweit freigeschaltet</li>
        <li>White-Label- und Agenturfunktionen, soweit im Plan enthalten</li>
        <li>optionale Zusatzleistungen (Setup, Onboarding, individualisierte Umsetzung), soweit gesondert vereinbart</li>
      </ul>
      <p>
        Festag ist kein generisches Projektmanagement-, Chat- oder Workspace-Produkt. Die
        konkreten Funktionen ergeben sich aus dem jeweils gebuchten Plan, der Produktbeschreibung
        zum Zeitpunkt des Vertragsschlusses sowie ggf. einer schriftlichen Zusatzvereinbarung.
        Nicht geschuldet ist ein bestimmtes wirtschaftliches Ergebnis beim Kunden oder dessen
        Auftraggebern.
      </p>

      <h2 id="vertragsschluss">§ 3 Vertragsschluss und Registrierung</h2>
      <ol>
        <li>
          Die Darstellung von Plänen und Preisen auf festag.app ist freibleibend und stellt kein
          verbindliches Angebot im Rechtssinne dar.
        </li>
        <li>
          Der Kunde schließt den Vertrag, indem er sich registriert bzw. einen Plan bestellt und
          den Bestellvorgang abschließt. Mit Zugang der Bestätigung (in der Regel per E-Mail) bzw.
          Freischaltung des Zugangs kommt der Vertrag zustande.
        </li>
        <li>
          Soweit Zahlungen per SEPA-Überweisung mit definiertem Verwendungszweck erfolgen, kommt
          der Vertrag mit dem Eingang der Zahlung und der zugehörigen Freischaltung zustande.
          Zahlungen werden technisch über die Enjyn® Gruppe abgewickelt.
        </li>
        <li>
          Festag kann Bestellungen aus berechtigtem Grund ablehnen (z. B. unvollständige Angaben,
          begründeter Missbrauchsverdacht, fehlende Lieferfähigkeit).
        </li>
      </ol>

      <h2 id="konten">§ 4 Konten, Workspaces und Verantwortlichkeit</h2>
      <p>
        Der Kunde ist für die Wahrheitsgemäßheit seiner Angaben und für die Sicherheit seiner
        Zugangsdaten verantwortlich. Aktivitäten über sein Konto bzw. seinen Workspace gelten —
        bis zum Nachweis des Gegenteils — als durch ihn veranlasst.
      </p>
      <p>
        Workspace-Administratoren entscheiden über Einladungen, Rollen und den Zugriff auf
        Kundendaten innerhalb des Workspaces. Der Kunde stellt sicher, dass nur berechtigte
        Personen Zugang erhalten und dass die Nutzung im Einklang mit anwendbarem Recht sowie
        bestehenden Vertraulichkeitsverpflichtungen gegenüber Dritten steht.
      </p>
      <p>
        Für White-Label-Umgebungen und Kundenunterkonten gelten die vom Kunden konfigurierten
        Zugangsregeln; der Kunde bleibt gegenüber Festag Vertragspartner, sofern nichts anderes
        schriftlich vereinbart ist.
      </p>

      <h2 id="preise">§ 5 Preise, Abrechnung und Steuern</h2>
      <p>
        Es gelten die zum Zeitpunkt der Bestellung ausgewiesenen Preise. Preise sind in Euro
        angegeben. Enthaltene oder zuzüglich anfallende Umsatzsteuer wird kenntlich gemacht, soweit
        gesetzlich vorgesehen.
      </p>
      <p>
        Abonnements werden, soweit nicht anders angegeben, im Voraus für den jeweiligen
        Abrechnungszeitraum berechnet. Einmalige Leistungen werden gemäß Bestellung abgerechnet.
        Rechnungs- und Zahlungsdaten verarbeitet Festag nur in dem für Vertrag und Buchhaltung
        erforderlichen Umfang; die technische Zahlungsabwicklung erfolgt über Enjyn®. Festag
        speichert keine vollständigen Zahlungsinstrumentdaten.
      </p>
      <p>
        Bei Zahlungsverzug kann Festag nach Mahnung den Zugang vorübergehend einschränken oder
        den Vertrag außerordentlich kündigen. Ausstehende Beträge bleiben fällig. Aufrechnung und
        Zurückbehaltung sind nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen
        zulässig.
      </p>

      <h2 id="leistung">§ 6 Leistungserbringung und Mitwirkung</h2>
      <p>
        Festag erbringt die Leistungen mit der Sorgfalt eines ordentlichen Kaufmanns. Der Kunde
        wirkt angemessen mit: rechtzeitige Angaben, Ansprechpartner, Freigaben, korrekte
        Konfiguration von Integrationen und Einhaltung bestehender Rechte Dritter an eingebrachten
        Inhalten.
      </p>
      <p>
        Verzögert sich die Leistung wegen fehlender Mitwirkung, verschieben sich vereinbarte
        Termine und die Haftung von Festag für hierdurch verursachte Nachteile entfällt, soweit
        gesetzlich zulässig.
      </p>
      <p>
        Festag darf Teilleistungen und Unterauftragnehmer einsetzen, sofern die vertragliche
        Verantwortlichkeit gegenüber dem Kunden erhalten bleibt und Datenschutzvorgaben
        eingehalten werden.
      </p>

      <h2 id="kundeninhalte">§ 7 Kundeninhalte und Vertraulichkeit</h2>
      <p>
        Inhalte, die der Kunde oder seine Nutzer in Festag einstellt (Projekte, Berichte,
        Entscheidungen, Uploads, Signaldaten aus Anbindungen u. a.), bleiben Eigentum bzw. unter
        der Rechtsinhaberschaft des Kunden bzw. der Berechtigten. Der Kunde räumt Festag die für
        Betrieb, Sicherung, Support und vertragliche Funktionen erforderlichen Nutzungsrechte ein.
      </p>
      <p>
        Festag behandelt Kundendaten vertraulich und verwendet sie nicht für Werbung Dritter.
        Details zur Verarbeitung personenbezogener Daten enthält die{' '}
        <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>
      <p>
        Der Kunde sichert zu, dass er zur Einstellung und Verarbeitung der eingebrachten Inhalte
        berechtigt ist und keine Rechte Dritter verletzt.
      </p>

      <h2 id="ki">§ 8 KI-Funktionen (Tagro)</h2>
      <p>
        Tagro und verwandte KI-Funktionen erzeugen Vorschläge, Zusammenfassungen und Entwürfe auf
        Grundlage der vom Kunden bereitgestellten bzw. freigegebenen Kontexte. KI-Ausgaben sind
        Hilfsmittel — keine verbindliche Rechts-, Steuer-, Finanz- oder Fachberatung und keine
        Garantie für inhaltliche Korrektheit in jedem Einzelfall.
      </p>
      <p>
        Der Kunde prüft KI-Ausgaben vor weitergabe- oder entscheidungsrelevantem Einsatz. Er
        unterlässt die Eingabe unnötiger personenbezogener Daten Dritter und sensibler Daten, die
        für den jeweiligen Zweck nicht erforderlich sind.
      </p>

      <h2 id="verfuegbarkeit">§ 9 Verfügbarkeit und Änderungen am Dienst</h2>
      <p>
        Festag strebt eine hohe Verfügbarkeit an, schuldet aber — außer bei ausdrücklich
        vereinbarten SLA — keine ununterbrochene Erreichbarkeit. Wartung, Sicherheitsupdates und
        Störungen Dritter (Hosting, Netze, Integrationen) können die Nutzung vorübergehend
        beeinträchtigen. Geplante Wartungen werden, soweit zumutbar, angekündigt.
      </p>
      <p>
        Festag darf den Dienst weiterentwickeln, Funktionen anpassen oder ersetzen, solange der
        vertragliche Kernzweck (Delivery Intelligence im gebuchten Umfang) erhalten bleibt.
        Wesentliche Einschränkungen der vereinbarten Kernleistung werden dem Kunden angemessen
        mitgeteilt.
      </p>

      <h2 id="garantie">§ 10 Garantie und Nacherfüllung (Projektdienstleistungen)</h2>
      <p>
        Soweit Festag neben dem Plattformzugang gesondert Software-, Design- oder
        Projektdienstleistungen schuldet und in Angebot oder Plan eine Garantiezeit genannt ist
        (z. B. „30 Tage“ oder „3 Monate“ ab Abnahme), behebt Festag in dieser Zeit Fehler im
        gelieferten Liefergegenstand, die einer vereinbarten Spezifikation widersprechen —
        kostenlos, soweit die Ursache nicht in geänderten Anforderungen, Drittsoftware oder
        fehlender Mitwirkung des Kunden liegt.
      </p>
      <p>
        Für den laufenden SaaS-Betrieb gilt gesetzliche Mängelhaftung für Unternehmer nach Maßgabe
        dieser AGB und des BGB; reine Verfügbarkeits- oder Feature-Wünsche ohne Mangelqualität
        begründen keinen Mangelanspruch.
      </p>

      <h2 id="nutzungsrechte">§ 11 Nutzungsrechte an Liefergegenständen</h2>
      <p>
        Mit vollständiger Bezahlung gesondert beauftragter Liefergegenstände (Code, Design o. Ä.)
        erhält der Kunde — soweit nicht anders vereinbart — die ausschließlichen, übertragbaren
        Nutzungsrechte an diesen Liefergegenständen. Vorausbestehende Komponenten, Bibliotheken
        und die Plattformsoftware selbst bleiben beim Anbieter bzw. den Rechteinhabern; der Kunde
        erhält daran nur die für die Nutzung erforderlichen Lizenzen.
      </p>
      <p>
        Festag darf das Vertragsverhältnis und die Zusammenarbeit referenziell nennen (Name, Logo,
        Kurzbeschreibung), sofern der Kunde dem nicht widersprochen hat.
      </p>

      <h2 id="haftung">§ 12 Haftung</h2>
      <p>
        Festag haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie nach Maßgabe des
        Produkthaftungsgesetzes und für Schäden aus der Verletzung des Lebens, des Körpers oder
        der Gesundheit.
      </p>
      <p>
        Bei leichter Fahrlässigkeit haftet Festag nur bei Verletzung wesentlicher Vertragspflichten
        (Kardinalpflichten), und der Höhe nach begrenzt auf den vorhersehbaren, vertragstypischen
        Schaden. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen, soweit
        gesetzlich zulässig.
      </p>
      <p>
        Die Haftung für entgangenen Gewinn, mittelbare Schäden und Datenverlust ist — außer bei
        Vorsatz, grober Fahrlässigkeit oder der Verletzung von Kardinalpflichten — ausgeschlossen,
        soweit gesetzlich zulässig. Der Kunde ist für angemessene eigene Sicherungskopien
        kritischer Daten verantwortlich.
      </p>

      <h2 id="widerruf">§ 13 Widerrufsrecht für Verbraucher</h2>
      <p>
        Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Einzelheiten enthält die{' '}
        <Link href="/widerruf">Widerrufsbelehrung</Link>.
      </p>
      <p>
        Verlangt der Verbraucher ausdrücklich, dass mit der Erbringung digitaler Inhalte oder
        Dienstleistungen vor Ablauf der Widerrufsfrist begonnen wird, kann das Widerrufsrecht unter
        den gesetzlichen Voraussetzungen erlöschen bzw. eine anteilige Vergütung geschuldet sein.
      </p>

      <h2 id="laufzeit">§ 14 Laufzeit und Kündigung</h2>
      <p>
        Abonnements laufen für den vereinbarten Zeitraum und verlängern sich — soweit in der
        Bestellung vorgesehen — automatisch um denselben Zeitraum, wenn nicht fristgerecht
        gekündigt wird. Kündigungswege und Fristen werden im Account bzw. in der Bestätigung
        ausgewiesen; die Kündigung in Textform (E-Mail an die Vertragsadresse) genügt jedenfalls.
      </p>
      <p>
        Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Bei
        schwerwiegenden Verstößen gegen diese AGB oder die Nutzungsbedingungen kann Festag den
        Zugang sperren und den Vertrag außerordentlich beenden.
      </p>
      <p>
        Nach Vertragsende wird der Zugang zum Workspace deaktiviert. Exportmöglichkeiten vor
        Vertragsende richtet Festag nach den in der App angebotenen Funktionen und gesetzlichen
        Pflichten.
      </p>

      <h2 id="schluss">§ 15 Schlussbestimmungen</h2>
      <p>
        Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts
        (CISG). Verbrauchern bleiben zwingende Schutzvorschriften ihres gewöhnlichen
        Aufenthaltsstaates unbenommen, soweit anwendbar.
      </p>
      <p>
        Ist der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder
        öffentlich-rechtliches Sondervermögen, ist Gerichtsstand der Sitz des Anbieters, soweit
        gesetzlich zulässig. Ansonsten gelten die gesetzlichen Gerichtsstände.
      </p>
      <p>
        Sollten einzelne Bestimmungen unwirksam sein oder werden, bleibt die Wirksamkeit der
        übrigen Bestimmungen unberührt. An die Stelle der unwirksamen Bestimmung tritt eine
        wirksame Regelung, die dem wirtschaftlichen Zweck am nächsten kommt.
      </p>
      <p>
        Anbieterkennzeichnung: <Link href="/impressum">Impressum</Link>. Kontakt:{' '}
        <a href="mailto:hello@festag.app">hello@festag.app</a>.
      </p>

      <LegalStand>Stand: 19. Juli 2026</LegalStand>
    </LegalDoc>
  )
}
