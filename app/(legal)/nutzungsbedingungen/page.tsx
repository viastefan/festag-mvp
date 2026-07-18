import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDoc from '@/components/legal/LegalDoc'
import LegalPageHead, { LegalStand } from '@/components/legal/LegalPageHead'
import { legalMetadata } from '@/lib/legal-metadata'
import { NUTZUNG_TOC } from '@/lib/legal-toc'

export const metadata: Metadata = legalMetadata(
  'Nutzungsbedingungen',
  'Regeln für die Nutzung der Festag-Plattform, Tagro, Integrationen und des Kundenportals.',
  '/nutzungsbedingungen',
)

export default function NutzungPage() {
  return (
    <LegalDoc toc={NUTZUNG_TOC}>
      <LegalPageHead title="Nutzungsbedingungen" />

      <h2 id="was-festag-ist">1. Was Festag ist</h2>
      <p>
        Festag ist eine Delivery-Intelligence-Plattform für Agenturen, Studios, Beratungsteams und
        interne Delivery-Organisationen. Die Plattform hilft, Arbeitssignale in klaren Status,
        Risiken, Entscheidungen und nächste Schritte zu übersetzen — für Auftraggeber, Führung und
        Projektverantwortliche.
      </p>
      <p>
        Festag ersetzt nicht Slack, Notion, Jira, Linear oder vergleichbare Ausführungswerkzeuge.
        Festag sitzt darüber: Integrationen und Eingaben werden so aufbereitet, dass Fortschritt
        und Blocker verständlich werden. Tagro dient als Projekt-Interpreter, nicht als offener
        Allzweck-Chatbot.
      </p>

      <h2 id="geltung">2. Geltung dieser Bedingungen</h2>
      <p>
        Diese Nutzungsbedingungen regeln den Zugang zu und die Nutzung von festag.app, dem
        Kundenportal, optionalen Browser-Erweiterungen und verwandten Oberflächen. Sie gelten
        ergänzend zu den <Link href="/agb">Allgemeinen Geschäftsbedingungen</Link>. Bei Konflikten
        zu Vergütung, Vertragsschluss, Laufzeit oder Haftung gehen die AGB vor.
      </p>
      <p>
        Mit Registrierung oder Nutzung erklärst du dich mit diesen Bedingungen einverstanden. Wenn
        du Festag für ein Unternehmen nutzt, bestätigst du, dazu berechtigt zu sein.
      </p>

      <h2 id="zugang">3. Zugang und Konto</h2>
      <p>
        Für die Nutzung benötigst du ein Konto. Die Anmeldung kann per E-Mail, unterstütztem OAuth
        (z. B. Google), Passkey oder anderen von Festag freigegebenen Verfahren erfolgen. Du bist
        für die Sicherheit deiner Zugangsdaten und Geräte verantwortlich und meldest missbräuchliche
        Nutzung unverzüglich an <a href="mailto:hello@festag.app">hello@festag.app</a>.
      </p>
      <p>
        Angaben zu Person, Workspace und Rolle müssen korrekt und aktuell sein. Festag kann den
        Zugang sperren, wenn begründeter Verdacht auf Identitätsmissbrauch, Sicherheitsrisiko oder
        schwere Regelverstöße besteht.
      </p>

      <h2 id="workspaces">4. Workspaces, Rollen und White-Label</h2>
      <p>
        Festag organisiert Arbeit in Workspaces. Administratoren vergeben Rollen, Einladungen und
        Sichtbarkeiten. Was innerhalb eines Workspaces sichtbar ist, folgt den dortigen
        Berechtigungen — nicht jedem festag-weiten Default.
      </p>
      <p>
        In Agentur- oder White-Label-Kontexten kannst du Klienten Zugänge unter deiner Marke
        bereitstellen, soweit dein Plan das vorsieht. Du bleibst verantwortlich dafür, dass
        Klienteninformationen, Logos und Inhalte rechtmäßig genutzt und Freigaben eingehalten
        werden.
      </p>
      <p>
        Workspace-Modi (z. B. Delivery, Teams, Agency) ändern die Oberfläche und den Fokus —
        nicht die Grundpflichten aus diesen Bedingungen.
      </p>

      <h2 id="erlaubt">5. Erlaubte Nutzung</h2>
      <ul>
        <li>
          Du nutzt Festag, um eigene oder beauftragte Projekte, Portfolios und Delivery-Prozesse
          transparent zu steuern und zu kommunizieren.
        </li>
        <li>
          Du stellst nur Inhalte ein, die du besitzen oder zu deren Nutzung du berechtigt bist —
          einschließlich Daten aus verbundenen Tools.
        </li>
        <li>
          KI-gestützte Entwürfe (Status, Texte, Zusammenfassungen) prüfst du vor Weitergabe an
          Kunden, Führung oder Dritte.
        </li>
        <li>
          Du hältst geltendes Recht ein, insbesondere Datenschutz, Geschäftsgeheimnisse und
          Urheberrecht.
        </li>
      </ul>

      <h2 id="verboten">6. Was nicht erlaubt ist</h2>
      <ul>
        <li>
          Reverse Engineering, Scraping, Massenabfragen oder Belastung der Infrastruktur jenseits
          normaler interaktiver Nutzung — ohne schriftliche Zustimmung.
        </li>
        <li>
          Hochladen von Schadsoftware, rechtswidrigen Inhalten oder Material ohne erforderliche
          Rechte.
        </li>
        <li>Umgehung von Authentifizierung, Rollen, Zahlungs-, Sicherheits- oder Rate-Limits.</li>
        <li>
          Weitergabe von Zugangsdaten an Dritte außerhalb des berechtigten Teams im Workspace.
        </li>
        <li>
          Nutzung von Festag zum Profiling oder zur Überwachung von Personen außerhalb des
          legitimen Delivery-/Betriebskontexts des Workspaces.
        </li>
        <li>
          Darstellung von Festag- oder Tagro-Ausgaben als Garantie für Fakten, Fristen oder
          rechtliche Schlussfolgerungen gegenüber Dritten.
        </li>
      </ul>

      <h2 id="inhalte">7. Inhalte und Eigentum</h2>
      <p>
        Du behältst die Rechte an deinen Workspace-Inhalten. Festag erhält eine nicht-exklusive,
        widerrufliche (mit Kontolöschung endende) Lizenz, diese Inhalte ausschließlich zur
        Bereitstellung, Sicherung, Fehleranalyse und vereinbarten Produktfunktionen zu
        verarbeiten — nicht zum Weiterverkauf an Dritte.
      </p>
      <p>
        Plattform, Marken, Designsystem und festag-eigene Komponenten bleiben Eigentum von Festag
        bzw. der Rechteinhaber. Gelieferte Projektergebnisse aus gesonderten Werkverträgen richten
        sich nach den <Link href="/agb">AGB</Link>.
      </p>

      <h2 id="tagro">8. Tagro und KI-Outputs</h2>
      <p>
        Tagro interpretiert Projekt- und Portfoliokontext: Status, Risiken, Entscheidungen,
        Entwürfe. Outputs sind Werkzeuge. Festag übernimmt keine Garantie dafür, dass KI-Inhalte
        vollständig, aktuell oder für deinen konkreten Zweck geeignet sind.
      </p>
      <p>
        Du bleibst verantwortlich für freigegebene Berichte, Kundenkommunikation und operative
        Entscheidungen. Sensible oder personenbezogene Daten Dritter gibst du nur ein, soweit für
        den jeweiligen Workspace-Zweck erforderlich und rechtlich zulässig. Details zur
        Verarbeitung: <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>

      <h2 id="integrationen">9. Integrationen und Drittanbieter</h2>
      <p>
        Verbundene Tools (z. B. GitHub, Slack, Linear oder vergleichbare Systeme) unterliegen den
        Bedingungen der jeweiligen Anbieter. Festag speichert und zeigt Signale nur in dem Umfang,
        den du verbindest und der Integration freigibst.
      </p>
      <p>
        Ausfälle oder API-Änderungen bei Drittanbietern können Funktionen einschränken, ohne dass
        Festag dafür einstehen muss, soweit gesetzlich zulässig. Du kannst Integrationen jederzeit
        trennen; Nachwirkungen in bereits gespeicherten Workspace-Artefakten bleiben bis zur
        Löschung bestehen.
      </p>

      <h2 id="verfuegbarkeit">10. Verfügbarkeit und Änderungen</h2>
      <p>
        Festag betreibt die Plattform sorgfältig, garantiert aber keine ununterbrochene
        Verfügbarkeit. Wartung, Sicherheitsupdates und Ereignisse bei Hosting- oder
        Netzbetreibern können spürbar sein. Planbare Wartungen kündigt Festag — soweit möglich —
        an.
      </p>
      <p>
        Funktionen können weiterentwickelt, umbenannt oder zurückgenommen werden, solange der
        Kernzweck deines gebuchten Plans im Wesentlichen erhalten bleibt. Vertragliche
        Lieferversprechen aus gesonderten Projektaufträgen bleiben nach den AGB unberührt.
      </p>

      <h2 id="beendigung">11. Beendigung und Kontolöschung</h2>
      <p>
        Du kannst dein Konto über die Einstellungen löschen oder den Workspace verlassen, soweit
        die Rolle das vorsieht. Administratoren sollten vor Löschung kritische Daten exportieren,
        soweit die App das anbietet.
      </p>
      <p>
        Festag kann Konten bei wiederholten oder schweren Verstößen gegen diese Bedingungen oder
        die AGB sperren oder kündigen. Gesetzliche Aufbewahrungspflichten und laufende
        Zahlungsforderungen bleiben unberührt.
      </p>

      <h2 id="haftung">12. Haftung</h2>
      <p>
        Im Rahmen der Plattformnutzung gilt die Haftungsregelung der{' '}
        <Link href="/agb">AGB</Link>: unbeschränkt für Vorsatz und grobe Fahrlässigkeit; bei
        leichter Fahrlässigkeit nur bei Verletzung wesentlicher Vertragspflichten, begrenzt auf den
        vorhersehbaren vertragstypischen Schaden — soweit gesetzlich zulässig.
      </p>
      <p>
        Für Inhalte, die Nutzer einstellen, sowie für die Nutzung von Drittintegrationen und
        KI-Ausgaben bist du bzw. dein Workspace verantwortlich. Festag haftet nicht für
        Geschäftsentscheidungen, die allein auf ungeprüften KI-Vorschlägen beruhen.
      </p>

      <h2 id="aenderungen">13. Änderungen dieser Bedingungen</h2>
      <p>
        Festag kann diese Nutzungsbedingungen anpassen, wenn Recht, Sicherheit oder Produkt das
        erfordern. Wesentliche Änderungen werden — sofern möglich — mindestens 14 Tage vorher per
        E-Mail an die hinterlegte Adresse oder durch Hinweis in der App angekündigt.
      </p>
      <p>
        Widersprichst du innerhalb der Ankündigungsfrist und ist eine fortgesetzte Nutzung nicht
        zumutbar, kannst du den Vertrag zum Wirksamkeitsdatum der Änderung beenden. Nutzt du
        Festag danach weiter ohne Widerspruch, gilt die neue Fassung als angenommen — soweit
        gesetzlich zulässig.
      </p>

      <h2 id="schluss">14. Schlussbestimmungen</h2>
      <p>
        Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Zwingende Verbraucherschutzrechte
        bleiben unberührt. Ist eine Bestimmung unwirksam, bleibt der Rest wirksam.
      </p>
      <p>
        Gerichtsstand für Kaufleute ist — soweit zulässig — der Sitz des Anbieters. Anbieterkennzeichnung:{' '}
        <Link href="/impressum">Impressum</Link>.
      </p>

      <h2 id="kontakt">15. Kontakt</h2>
      <p>
        Fragen zu diesen Bedingungen:{' '}
        <a href="mailto:hello@festag.app">hello@festag.app</a>
      </p>

      <LegalStand>Stand: 19. Juli 2026, Version 2.0</LegalStand>
    </LegalDoc>
  )
}
