import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDoc from '@/components/legal/LegalDoc'
import LegalPageHead from '@/components/legal/LegalPageHead'
import { legalMetadata } from '@/lib/legal-metadata'
import { DATENSCHUTZ_TOC } from '@/lib/legal-toc'

export const metadata: Metadata = legalMetadata(
  'Datenschutz',
  'Wie Festag personenbezogene Daten in der Web-App, im Kundenportal und in der Tagro-Erweiterung verarbeitet.',
  '/datenschutz',
)

export default function DatenschutzPage() {
  return (
    <LegalDoc toc={DATENSCHUTZ_TOC}>
      <LegalPageHead
        title="Datenschutzerklärung"
        lead="Wie Festag personenbezogene Daten verarbeitet — in der Web-App, im Kundenportal und in der optionalen Browser-Erweiterung Tagro."
        meta="Stand: 29. Juni 2026, Version 2.0"
      />

      <h2 id="verantwortlicher">1. Verantwortlicher</h2>
      <div className="legal-box">
        <p>
          <strong>Stefan Dirnberger</strong><br />
          Lindenstraße 15<br />
          84036 Kumhausen, Deutschland<br />
          Telefon: <a href="tel:+4987653399973">08765 33 999 73</a><br />
          E-Mail: <a href="mailto:hello@festag.app">hello@festag.app</a>
        </p>
      </div>
      <p className="legal-note">
        Inhaltlich verantwortlich nach § 18 Abs. 2 MStV: Stefan Dirnberger.
        Zahlungen werden über die Enjyn® Gruppe als technischen Zahlungsdienstleister abgewickelt.
        Festag speichert keine vollständigen Zahlungsdaten.
      </p>

      <h2 id="was-festag-ist">2. Was Festag ist</h2>
      <p>
        Festag ist eine Delivery-Intelligence-Plattform für Agenturen, Teams und Auftraggeber.
        Wir verarbeiten Daten, um Projekte transparent zu machen, Status zu kommunizieren,
        Entscheidungen nachzuverfolgen und KI-gestützte Unterstützung über Tagro bereitzustellen.
        Festag ist kein generisches Workspace- oder Chat-Produkt — wir speichern nur,
        was für Delivery Intelligence erforderlich ist.
      </p>

      <h2 id="welche-daten">3. Welche Daten wir verarbeiten</h2>

      <h3>Account und Profil</h3>
      <ul>
        <li>E-Mail-Adresse, Name, Profilbild (bei OAuth-Anmeldung über Google o. Ä.)</li>
        <li>Workspace-Zugehörigkeit, Rolle, Sprach- und Theme-Einstellungen</li>
        <li>Optionale Profildaten (Position, Telefon, Unternehmensangaben)</li>
      </ul>

      <h3>Projekt- und Workspace-Inhalte</h3>
      <ul>
        <li>Projekte, Briefings, Statusberichte, Entscheidungen, Freigaben und Kommentare</li>
        <li>Uploads und Dokumente, die du in Festag ablegst</li>
        <li>Team- und Kundenbeziehungen innerhalb deines Workspaces</li>
      </ul>

      <h3>Tagro und KI-Funktionen</h3>
      <ul>
        <li>Prompts und Kontext, die du Tagro bewusst übergibst (z. B. Statusfragen, Textverbesserungen)</li>
        <li>Tagro-Memory und Schreibstil-Präferenzen, wenn du diese aktivierst oder Inhalte übernimmst</li>
        <li>Metadaten zu KI-Anfragen (Zeitpunkt, Modell, Erfolg/Fehler) — keine dauerhafte Speicherung von Seiteninhalten ohne deine Aktion</li>
      </ul>

      <h3>Integrationen</h3>
      <ul>
        <li>Verbindungsstatus und Metadaten angebundener Tools (z. B. GitHub, Slack, Linear)</li>
        <li>Signale und Ereignisse aus verbundenen Systemen, soweit du Integrationen aktivierst</li>
      </ul>

      <h3>Zahlung und Vertrag</h3>
      <ul>
        <li>Rechnungsadresse, Paketwahl, SEPA-Referenzen und Zahlungsstatus</li>
        <li>Verarbeitung über Enjyn® als Zahlungsdienstleister — keine Kontodaten bei Festag gespeichert</li>
      </ul>

      <h3>Technische Daten</h3>
      <ul>
        <li>IP-Adresse, Browser, Betriebssystem, Gerätetyp, Zeitstempel</li>
        <li>Sitzungs- und Auth-Tokens zur sicheren Anmeldung</li>
        <li>Optionale, anonyme Produkt-Analytics (nur mit deiner Einwilligung in den Einstellungen)</li>
      </ul>

      <h3>Browser-Erweiterung Tagro</h3>
      <p>
        Die optionale Chrome- und Safari-Erweiterung verarbeitet Text nur, wenn du eine Aktion startest
        (z. B. Text verbessern oder markierten Text analysieren). Dabei können Seiten-URL und -Titel
        als Domain-Kontext übermittelt werden — kein Pfad-Tracking. Einstellungen der Erweiterung
        (Toggles, blockierte Seiten) liegen lokal auf deinem Gerät.
        Details: <Link href="#erweiterung">Abschnitt 8</Link>.
      </p>

      <h2 id="rechtsgrundlagen">4. Rechtsgrundlagen</h2>
      <ul>
        <li><strong>Art. 6 Abs. 1 lit. b DSGVO</strong> — Vertragserfüllung und Bereitstellung von Festag</li>
        <li><strong>Art. 6 Abs. 1 lit. f DSGVO</strong> — berechtigtes Interesse (Sicherheit, Stabilität, Produktverbesserung)</li>
        <li><strong>Art. 6 Abs. 1 lit. a DSGVO</strong> — Einwilligung (z. B. optionale Analytics, Marketing-Cookies)</li>
        <li><strong>Art. 6 Abs. 1 lit. c DSGVO</strong> — gesetzliche Pflichten (z. B. steuerliche Aufbewahrung)</li>
      </ul>

      <h2 id="empfaenger">5. Empfänger und Auftragsverarbeiter</h2>
      <ul>
        <li><strong>Supabase</strong> (EU-Region) — Datenbank, Authentifizierung, Echtzeit-Sync</li>
        <li><strong>Vercel</strong> — Hosting der Web-App und Edge-Funktionen</li>
        <li><strong>Anthropic</strong> (Claude) und ggf. weitere KI-Anbieter — Verarbeitung von Tagro-Anfragen im Auftrag</li>
        <li><strong>Google</strong> — OAuth-Anmeldung, sofern du diese Methode wählst</li>
        <li><strong>Enjyn® Gruppe</strong> — technischer Zahlungsdienstleister (SEPA)</li>
      </ul>
      <p>
        Mit allen Auftragsverarbeitern bestehen Verträge gemäß Art. 28 DSGVO.
        Eine Weitergabe zu Werbezwecken findet nicht statt. KI-Anbieter erhalten nur die Daten,
        die für die jeweilige Anfrage erforderlich sind.
      </p>

      <h2 id="cookies">6. Cookies und lokale Speicherung</h2>
      <p>
        Festag setzt technisch notwendige Cookies und lokale Speichereinträge ein —
        für Anmeldung, Session-Management und Theme-Einstellungen.
        Tracking- oder Marketing-Cookies werden nur nach deiner Einwilligung gesetzt.
      </p>
      <ul>
        <li><strong>Auth-Session:</strong> Supabase-Token zur sicheren Anmeldung</li>
        <li><strong>Theme und Darstellung:</strong> <code>festag_theme_client</code>, Schrift- und Dichte-Einstellungen</li>
        <li><strong>Analytics (optional):</strong> nur bei aktivierter Einwilligung unter Einstellungen → Datenschutz</li>
      </ul>

      <h2 id="ki-tagro">7. KI-Verarbeitung (Tagro)</h2>
      <p>
        Tagro ist ein Projekt-Interpreter, kein offener Chatbot. Wir senden personenbezogene Daten
        nur dann an KI-Modelle, wenn du eine Funktion aktiv nutzt und dies für die Antwort nötig ist.
        Du bist verantwortlich dafür, keine unnötigen personenbezogenen Daten Dritter in Prompts einzugeben.
      </p>
      <p>
        Wenn du eine Textverbesserung übernimmst, kann Festag Original und Ergebnis speichern,
        um deinen Schreibstil zu personalisieren. Das lässt sich in den Einstellungen steuern
        oder durch Löschen deines Accounts beenden.
      </p>

      <h2 id="erweiterung">8. Browser-Erweiterung</h2>
      <p>Die Tagro-Erweiterung verarbeitet folgende Daten — jeweils nur bei deiner Aktion:</p>
      <ul>
        <li>Text aus Eingabefeldern oder Markierungen zur KI-Verbesserung</li>
        <li>Seiten-URL und -Titel als Domain-Kontext (kein dauerhaftes Seiten-Tracking)</li>
        <li>Festag-Session-Cookie bei API-Aufrufen zur Authentifizierung</li>
        <li>Lokale Einstellungen in <code>chrome.storage</code> bzw. Safari Extension Storage</li>
      </ul>
      <p>
        Eine Deinstallation der Erweiterung entfernt lokale Einstellungen auf deinem Gerät.
        Account-Daten verwaltest du unter{' '}
        <Link href="/settings/privacy">Einstellungen → Datenschutz</Link>.
      </p>

      <h2 id="speicherdauer">9. Speicherdauer</h2>
      <ul>
        <li>Account- und Projektdaten: solange dein Account aktiv ist</li>
        <li>Nach Kontolöschung: Löschung oder Anonymisierung innerhalb von 30 Tagen, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen</li>
        <li>Rechnungs- und Vertragsdaten: gemäß gesetzlicher Fristen (in der Regel 6–10 Jahre)</li>
        <li>Server-Logs: typischerweise 30–90 Tage zur Sicherheit und Fehleranalyse</li>
      </ul>

      <h2 id="rechte">10. Deine Rechte</h2>
      <p>Du hast gegenüber dem Verantwortlichen folgende Rechte:</p>
      <ul>
        <li>Auskunft (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch (Art. 21 DSGVO)</li>
        <li>Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)</li>
        <li>Beschwerde bei einer Aufsichtsbehörde</li>
      </ul>
      <p>
        Datenexport, Analytics-Opt-out und Kontolöschung findest du direkt in der App unter{' '}
        <Link href="/settings/privacy">Einstellungen → Datenschutz</Link>.
      </p>

      <h2 id="sicherheit">11. Sicherheit</h2>
      <p>
        Wir setzen technische und organisatorische Maßnahmen ein: verschlüsselte Verbindungen (TLS),
        rollenbasierte Zugriffskontrolle, Row-Level Security in der Datenbank und regelmäßige
        Sicherheitsüberprüfungen. Kein System ist zu 100 % sicher — melde verdächtige Aktivitäten
        umgehend an <a href="mailto:hello@festag.app">hello@festag.app</a>.
      </p>

      <h2 id="aenderungen">12. Änderungen</h2>
      <p>
        Wir passen diese Erklärung an, wenn sich Rechtslage, Produkt oder Datenverarbeitung ändern.
        Wesentliche Änderungen kündigen wir per E-Mail oder Hinweis in der App an.
      </p>

      <h2 id="kontakt">13. Kontakt</h2>
      <p>
        Fragen zum Datenschutz: <a href="mailto:hello@festag.app">hello@festag.app</a>
      </p>
    </LegalDoc>
  )
}
