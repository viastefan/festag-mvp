import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDoc from '@/components/legal/LegalDoc'
import LegalPageHead, { LegalStand } from '@/components/legal/LegalPageHead'
import { legalMetadata } from '@/lib/legal-metadata'
import { NUTZUNG_TOC } from '@/lib/legal-toc'

export const metadata: Metadata = legalMetadata(
  'Nutzungsbedingungen',
  'Regeln für die Nutzung der Festag-Plattform, Tagro und des Kundenportals.',
  '/nutzungsbedingungen',
)

export default function NutzungPage() {
  return (
    <LegalDoc toc={NUTZUNG_TOC}>
      <LegalPageHead title="Nutzungsbedingungen" />

      <h2 id="was-festag-ist">1. Was Festag ist</h2>
      <p>
        Festag ist ein AI-natives Software-Produktionssystem für Unternehmer, Founder,
        Agenturen und interne Teams. Wir orchestrieren die Software-Entwicklung über
        ein kuratiertes Entwicklernetzwerk, Tagro (unsere KI-Logik) und ein Dashboard,
        das den gesamten Produktionsprozess transparent macht.
      </p>

      <h2 id="zugang">2. Zugang und Konto</h2>
      <p>
        Für die Nutzung benötigst du einen Account. Du registrierst dich mit deiner
        E-Mail-Adresse oder einem unterstützten OAuth-Provider (Google, SAM SSO,
        Passkey). Du bist verantwortlich für die Sicherheit deiner Zugangsdaten und
        verpflichtest dich, deine Daten wahrheitsgemäß anzugeben.
      </p>
      <p>
        Pro Person darf nur ein Account angelegt werden, außer du nutzt Festag im
        White-Label-Modus für Klienten — dann gelten separate Vereinbarungen.
      </p>

      <h2 id="erlaubt">3. Erlaubte Nutzung</h2>
      <ul>
        <li>
          Du nutzt Festag, um eigene oder beauftragte Software-Projekte zu planen, zu produzieren
          und zu deployen.
        </li>
        <li>
          Inhalte, die du in Festwerk, Relations oder Teams einstellst, müssen frei von Rechten
          Dritter sein oder du musst die Rechte besitzen.
        </li>
        <li>
          Die KI-gestützten Outputs (Code, Dokumente, Pläne) sind Ausgangspunkt — du bist für die
          finale Prüfung und Verwendung verantwortlich.
        </li>
      </ul>

      <h2 id="verboten">4. Was nicht erlaubt ist</h2>
      <ul>
        <li>
          Reverse-Engineering, Scraping oder automatisierte Massenabfragen der Plattform ohne
          schriftliche Zustimmung.
        </li>
        <li>
          Hochladen von Schadsoftware, illegalen Inhalten, urheberrechtlich geschütztem Material
          ohne Lizenz.
        </li>
        <li>Umgehung von Sicherheits-, Zahlungs- oder Rate-Limit-Mechanismen.</li>
        <li>
          Weitergabe deiner Zugangsdaten an Dritte (außer deinem eigenen Team innerhalb deines
          Workspaces).
        </li>
      </ul>

      <h2 id="inhalte">5. Inhalte und Eigentum</h2>
      <p>
        Du behältst alle Rechte an deinen eigenen Inhalten und am gelieferten
        Software-Code (vorbehaltlich der Zahlung gem. <Link href="/agb">AGB</Link>). Festag erhält
        eine nicht-exklusive Lizenz, deine Inhalte ausschließlich für die Bereitstellung
        und Verbesserung des Dienstes zu verarbeiten.
      </p>

      <h2 id="tagro">6. KI-Outputs (Tagro)</h2>
      <p>
        Tagro generiert Vorschläge, Code-Strukturen, Zeitpläne und Decomposition.
        Diese Outputs sind <strong>Werkzeuge</strong>, keine garantierten Endprodukte.
        Du bist verpflichtet, sie vor produktivem Einsatz inhaltlich zu prüfen.
        Wir übernehmen keine Garantie für die Korrektheit, Vollständigkeit oder
        Eignung der KI-generierten Inhalte für deinen spezifischen Zweck.
      </p>

      <h2 id="verfuegbarkeit">7. Verfügbarkeit</h2>
      <p>
        Wir betreiben Festag mit hoher Sorgfalt, garantieren aber keine 100&nbsp;%
        Verfügbarkeit. Wartungsfenster werden – soweit planbar – im Voraus angekündigt.
        Vereinbarte Lieferfristen aus aktiven Projekten bleiben davon unberührt
        (siehe Festag Garantie in den <Link href="/agb">AGB</Link>).
      </p>

      <h2 id="beendigung">8. Beendigung</h2>
      <p>
        Du kannst deinen Account jederzeit über die Account-Einstellungen löschen.
        Aktive, bezahlte Projekte werden bis zum vereinbarten Milestone fortgeführt
        (Milestone-Lock). Wir behalten uns vor, Accounts bei wiederholter oder
        schwerer Verletzung dieser Bedingungen oder der AGB ohne Vorankündigung
        zu sperren.
      </p>

      <h2 id="haftung">9. Haftung</h2>
      <p>
        Festag haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit. Für leichte
        Fahrlässigkeit nur bei Verletzung wesentlicher Vertragspflichten
        (Kardinalpflichten), und der Höhe nach begrenzt auf den typischerweise
        vorhersehbaren Schaden. Eine Haftung für mittelbare Schäden, entgangenen
        Gewinn oder Datenverlust ist – soweit gesetzlich zulässig — ausgeschlossen.
      </p>

      <h2 id="aenderungen">10. Änderungen</h2>
      <p>
        Wir können diese Nutzungsbedingungen anpassen, wenn dies aus rechtlichen,
        sicherheitsrelevanten oder produktbezogenen Gründen nötig ist. Änderungen
        werden mindestens 14 Tage vorher per E-Mail an deine hinterlegte Adresse
        angekündigt. Widersprichst du nicht innerhalb dieser Frist, gilt deine
        Zustimmung als erteilt.
      </p>

      <h2 id="schluss">11. Schlussbestimmungen</h2>
      <p>
        Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Ist eine
        Bestimmung unwirksam, bleibt der Rest dieser Bedingungen wirksam.
        Gerichtsstand für Kaufleute ist der Sitz des Anbieters.
      </p>

      <hr />

      <h2 id="kontakt">Kontakt</h2>
      <p>
        Stefan Dirnberger
        <br />
        Lindenstraße 15, 84036 Kumhausen
        <br />
        E-Mail: <a href="mailto:hello@festag.app">hello@festag.app</a>
      </p>

      <LegalStand>Stand: 29. Juni 2026, Version 1.1</LegalStand>
    </LegalDoc>
  )
}
