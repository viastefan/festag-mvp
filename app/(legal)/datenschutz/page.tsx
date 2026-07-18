import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDoc from '@/components/legal/LegalDoc'
import LegalPageHead, { LegalStand } from '@/components/legal/LegalPageHead'
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
      <LegalPageHead title="Datenschutzerklärung" />

      <h2 id="verantwortlicher">1. Verantwortlicher</h2>
      <div className="legal-box">
        <p>
          <span className="legal-box-org">
            <strong>Festag</strong>
          </span>
          Stefan Dirnberger
          <br />
          Lindenstraße 15
          <br />
          84036 Kumhausen, Deutschland
          <span className="legal-box-meta">
            Telefon: <a href="tel:+4987653399973">08765 33 999 73</a>
            <br />
            E-Mail: <a href="mailto:hello@festag.app">hello@festag.app</a>
          </span>
        </p>
      </div>
      <p className="legal-note">
        Inhaltlich verantwortlich nach § 18 Abs. 2 MStV: Stefan Dirnberger. Zahlungen werden über
        die Enjyn® Gruppe als technischen Zahlungsdienstleister abgewickelt. Festag speichert keine
        vollständigen Zahlungsinstrumentdaten (z. B. vollständige Kontonummern).
      </p>

      <h2 id="was-festag-ist">2. Was Festag ist</h2>
      <p>
        Festag ist eine Delivery-Intelligence-Plattform. Wir verarbeiten personenbezogene Daten,
        damit Teams und Agenturen Projekte, Portfolios und Delivery-Signale nachvollziehbar machen
        können: Status, Risiken, Entscheidungen, Freigaben, Aktivität und KI-gestützte Unterstützung
        durch Tagro.
      </p>
      <p>
        Festag ist kein generisches Chat-, Social- oder Workspace-Produkt. Wir speichern und
        verarbeiten Daten in dem Umfang, der für Betrieb, Sicherheit, vertragliche Leistung und —
        sofern aktiviert — Produktanalytics erforderlich ist.
      </p>

      <h2 id="welche-daten">3. Welche Daten wir verarbeiten</h2>

      <h3>Account und Profil</h3>
      <ul>
        <li>E-Mail-Adresse, Name, ggf. Profilbild (z. B. bei OAuth über Google)</li>
        <li>Workspace-Zugehörigkeit, Rolle, Sprach-, Theme- und Darstellungspräferenzen</li>
        <li>optionale Profildaten (Position, Telefon, Unternehmensangaben)</li>
        <li>Authentifizierungsmetadaten (z. B. letzte Anmeldung, Passkey-/OAuth-Bezug)</li>
      </ul>

      <h3>Projekt- und Workspace-Inhalte</h3>
      <ul>
        <li>Projekte, Briefings, Statusberichte, Entscheidungen, Freigaben, Kommentare</li>
        <li>Uploads und Dokumente, die du oder dein Team ablegt</li>
        <li>Team-, Kunden- und Lieferantenbeziehungen innerhalb des Workspaces</li>
        <li>Activity-, Issue- und Objective-bezogene Einträge, soweit Funktionen genutzt werden</li>
      </ul>

      <h3>Tagro und KI-Funktionen</h3>
      <ul>
        <li>Prompts und Kontext, die du Tagro bewusst übergibst</li>
        <li>optional Tagro-Memory und Schreibstil-Präferenzen, wenn aktiviert oder übernommen</li>
        <li>
          technische Metadaten zu KI-Anfragen (Zeitpunkt, Modellbezug, Erfolg/Fehler) — ohne
          dauerhaftes Mitschneiden kompletter Fremdseiten ohne deine Aktion
        </li>
      </ul>

      <h3>Integrationen</h3>
      <ul>
        <li>Verbindungsstatus und Metadaten angebundener Tools (z. B. GitHub, Slack, Linear)</li>
        <li>
          Signale und Ereignisse aus verbundenen Systemen, soweit du Integrationen aktivierst und
          der Anbieter Daten liefert
        </li>
        <li>Tokens oder Verbindungsreferenzen, die für den Abruf technisch nötig sind</li>
      </ul>

      <h3>Zahlung und Vertrag</h3>
      <ul>
        <li>Rechnungsadresse, Plan/Paket, SEPA-Referenzen, Zahlungsstatus</li>
        <li>Abwicklung über Enjyn® — keine vollständigen Kontodaten bei Festag</li>
      </ul>

      <h3>Technische Daten</h3>
      <ul>
        <li>IP-Adresse, Browser, Betriebssystem, Gerätetyp, Zeitstempel</li>
        <li>Sitzungs- und Auth-Tokens zur sicheren Anmeldung</li>
        <li>Server- und Sicherheitslogs in üblichem Betriebsumfang</li>
        <li>
          optionale Produkt-Analytics — nur mit Einwilligung bzw. den Einstellungen entsprechend
        </li>
      </ul>

      <h3>Browser-Erweiterung Tagro</h3>
      <p>
        Die optionale Chrome- und Safari-Erweiterung verarbeitet Text nur, wenn du eine Aktion
        startest (z. B. Text verbessern oder Markierung analysieren). Dabei können Seiten-URL und
        -Titel als Domain-Kontext übermittelt werden — kein dauerhaftes Pfad-Tracking. Lokale
        Einstellungen der Erweiterung liegen auf deinem Gerät. Details:{' '}
        <Link href="#erweiterung">Abschnitt 10</Link>.
      </p>

      <h2 id="zwecke">4. Zwecke der Verarbeitung</h2>
      <ul>
        <li>Bereitstellung und Betrieb von Festag (Login, Workspaces, Portal, Sync)</li>
        <li>Erfüllung von Verträgen und Supportanfragen</li>
        <li>Sicherheit, Missbrauchsprevention, Fehler- und Leistungsanalyse</li>
        <li>Abrechnung und gesetzliche Aufbewahrung</li>
        <li>KI-Funktionen auf ausdrückliche Nutzeraktion bzw. Workspace-Konfiguration</li>
        <li>Produktverbesserung auf Basis anonymisierter oder eingewilligter Analytics</li>
        <li>Erfüllung rechtlicher Pflichten</li>
      </ul>

      <h2 id="rechtsgrundlagen">5. Rechtsgrundlagen</h2>
      <ul>
        <li>
          <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> — Vertragserfüllung und vorvertragliche
          Maßnahmen (Account, Plattform, gebuchte Leistungen)
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> — berechtigtes Interesse an Sicherheit,
          Stabilität, Missbrauchsabwehr und angemessener Produktpflege; Interessenabwägung
          vorausgesetzt
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> — Einwilligung (z. B. optionale Analytics,
          bestimmte Marketing-Cookies, soweit eingesetzt)
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. c DSGVO</strong> — gesetzliche Pflichten (u. a. steuerliche
          Aufbewahrung)
        </li>
      </ul>
      <p>
        Einwilligungen kannst du widerrufen, ohne dass die Rechtmäßigkeit der bis dahin
        erfolgten Verarbeitung berührt wird.
      </p>

      <h2 id="empfaenger">6. Empfänger und Auftragsverarbeiter</h2>
      <p>
        Festag setzt sorgfältig ausgewählte Dienstleister ein. Typische Kategorien und derzeit
        relevante Anbieter:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> (EU-Region, soweit konfiguriert) — Datenbank,
          Authentifizierung, Echtzeit-Sync
        </li>
        <li>
          <strong>Vercel</strong> — Hosting der Web-App und Edge-/Server-Funktionen
        </li>
        <li>
          <strong>Anthropic</strong> (Claude) und ggf. weitere KI-Anbieter — Verarbeitung von
          Tagro-Anfragen im Auftrag, nur im für die Anfrage nötigen Umfang
        </li>
        <li>
          <strong>Google</strong> — OAuth-Anmeldung, sofern du diese Methode wählst
        </li>
        <li>
          <strong>Enjyn® Gruppe</strong> — technischer Zahlungsdienstleister (SEPA)
        </li>
      </ul>
      <p>
        Mit Auftragsverarbeitern bestehen Vereinbarungen nach Art. 28 DSGVO, soweit erforderlich.
        Eine Weitergabe personenbezogener Daten zu eigenständigen Werbezwecken Dritter findet
        nicht statt. Behörden erhalten Daten nur bei gesetzlicher Verpflichtung oder zur
        Rechtsverteidigung.
      </p>
      <p>
        Workspace-Mitglieder und ggf. eingeladene Klienten sehen die Daten, die Rollen und
        Freigaben im jeweiligen Workspace freigeben — das ist kein „Empfänger verkauft Daten“,
        sondern Funktionskern kollaborativer Delivery-Software.
      </p>

      <h2 id="drittland">7. Drittlandübermittlung</h2>
      <p>
        Soweit Anbieter außerhalb des Europäischen Wirtschaftsraums eingesetzt werden (z. B.
        einzelne KI- oder Auth-Dienste in den USA), erfolgt die Übermittlung nur, wenn ein
        angemessenes Schutzniveau besteht — etwa über Angemessenheitsbeschluss, Standardvertragsklauseln
        der EU-Kommission und ergänzende Maßnahmen, soweit vom Anbieter angeboten und vertraglich
        vorgesehen.
      </p>
      <p>
        Festag beansprucht keine zusätzliche „Zertifizierung“ über die genannten Mechanismen hinaus.
        Details zu konkreten Transfergarantien einzelner Anbieter ergeben sich aus deren
        Vertrags- und Datenschutzunterlagen.
      </p>

      <h2 id="cookies">8. Cookies und lokale Speicherung</h2>
      <p>
        Festag setzt technisch notwendige Cookies und lokale Speichereinträge für Anmeldung,
        Session-Management und Darstellung ein. Tracking- oder Marketing-Cookies werden nur nach
        Einwilligung gesetzt, soweit überhaupt eingesetzt.
      </p>
      <ul>
        <li>
          <strong>Auth-Session:</strong> Tokens zur sicheren Anmeldung (u. a. über Supabase)
        </li>
        <li>
          <strong>Theme und Darstellung:</strong> z. B. <code>festag_theme_client</code>, Schrift-
          und Dichte-Einstellungen
        </li>
        <li>
          <strong>Analytics (optional):</strong> nur bei aktivierter Einwilligung unter{' '}
          <Link href="/settings/privacy">Einstellungen → Datenschutz</Link>
        </li>
      </ul>

      <h2 id="ki-tagro">9. KI-Verarbeitung (Tagro)</h2>
      <p>
        Tagro ist ein Projekt-Interpreter. Personenbezogene Daten gehen an KI-Modelle nur, wenn du
        eine Funktion nutzt und die Daten für die Antwort erforderlich sind (oder dein Workspace
        so konfiguriert ist). Du bist verantwortlich, keine unnötigen personenbezogenen Daten
        Dritter in Prompts zu geben.
      </p>
      <p>
        Übernimmst du Textverbesserungen, kann Festag Original und Ergebnis speichern, um deinen
        Schreibstil zu personalisieren — steuerbar in den Einstellungen und beendbar durch
        Löschen bzw. Deaktivieren. Festag trainiert keine öffentlichen Modelle „mit deinem
        Workspace“ außerhalb der dokumentierten Produktfunktionen; Anfragen an KI-Anbieter
        erfolgen im Rahmen der jeweiligen Auftragsverarbeitung.
      </p>

      <h2 id="erweiterung">10. Browser-Erweiterung</h2>
      <p>Die Tagro-Erweiterung verarbeitet Daten nur bei deiner Aktion, insbesondere:</p>
      <ul>
        <li>Text aus Eingabefeldern oder Markierungen zur KI-Unterstützung</li>
        <li>Seiten-URL und -Titel als Domain-Kontext (kein dauerhaftes Seiten-Tracking)</li>
        <li>Festag-Session zur Authentifizierung von API-Aufrufen</li>
        <li>lokale Einstellungen in Extension Storage</li>
      </ul>
      <p>
        Deinstallation entfernt lokale Einstellungen auf dem Gerät. Account- und Workspace-Daten
        verwaltest du unter{' '}
        <Link href="/settings/privacy">Einstellungen → Datenschutz</Link>.
      </p>

      <h2 id="speicherdauer">11. Speicherdauer</h2>
      <ul>
        <li>Account- und Projektdaten: solange der Account bzw. Workspace aktiv ist</li>
        <li>
          nach Kontolöschung: Löschung oder Anonymisierung innerhalb von 30 Tagen, soweit keine
          gesetzlichen Aufbewahrungspflichten entgegenstehen
        </li>
        <li>Rechnungs- und Vertragsdaten: nach gesetzlichen Fristen (häufig 6–10 Jahre)</li>
        <li>Server- und Sicherheitslogs: typischerweise 30–90 Tage</li>
        <li>widerrufene Einwilligungsdaten: danach nicht mehr für den eingewilligten Zweck</li>
      </ul>

      <h2 id="rechte">12. Deine Rechte</h2>
      <p>Gegenüber dem Verantwortlichen hast du insbesondere:</p>
      <ul>
        <li>Auskunft (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch gegen Verarbeitungen auf Basis berechtigter Interessen (Art. 21 DSGVO)</li>
        <li>Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)</li>
        <li>Beschwerde bei einer Aufsichtsbehörde</li>
      </ul>
      <p>
        Datenexport, Analytics-Opt-out und Kontolöschung findest du in der App unter{' '}
        <Link href="/settings/privacy">Einstellungen → Datenschutz</Link>. Für weitergehende
        Anfragen: <a href="mailto:hello@festag.app">hello@festag.app</a>.
      </p>
      <p>
        Zuständige Aufsichtsbehörde richtet sich nach dem Sitz des Verantwortlichen bzw. deinem
        Aufenthaltsort; in Bayern typischerweise das Bayerische Landesamt für Datenschutzaufsicht
        (BayLDA).
      </p>

      <h2 id="sicherheit">13. Sicherheit</h2>
      <p>
        Wir setzen technische und organisatorische Maßnahmen ein: Transportverschlüsselung (TLS),
        rollenbasierte Zugriffskontrolle, Row-Level Security in der Datenbank und übliche
        Betriebsabsicherung. Kein System ist absolut sicher. Verdächtige Aktivitäten bitte an{' '}
        <a href="mailto:hello@festag.app">hello@festag.app</a> melden.
      </p>

      <h2 id="minderjaehrige">14. Minderjährige</h2>
      <p>
        Festag richtet sich an berufliche Nutzer und Unternehmen. Die Nutzung durch Personen unter
        16 Jahren ist nicht vorgesehen. Sollten wir feststellen, dass entsprechende Daten ohne
        erforderliche Einwilligung erfasst wurden, löschen wir sie.
      </p>

      <h2 id="aenderungen">15. Änderungen</h2>
      <p>
        Wir passen diese Erklärung an, wenn sich Rechtslage, Produkt oder Verarbeitung ändern.
        Wesentliche Änderungen kündigen wir per E-Mail oder Hinweis in der App an. Die jeweils
        aktuelle Fassung gilt für die Zukunft; der Stand steht am Ende dieses Dokuments.
      </p>

      <h2 id="kontakt">16. Kontakt</h2>
      <p>
        Fragen zum Datenschutz: <a href="mailto:hello@festag.app">hello@festag.app</a>
      </p>
      <p>
        Anbieterkennzeichnung: <Link href="/impressum">Impressum</Link>. Ergänzend:{' '}
        <Link href="/agb">AGB</Link>,{' '}
        <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link>.
      </p>

      <LegalStand>Stand: 19. Juli 2026, Version 3.0. Gültig ab diesem Datum.</LegalStand>
    </LegalDoc>
  )
}
