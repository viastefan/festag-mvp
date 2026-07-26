# Festag Chrome Extension — Tagro

Zwei Funktionen in einer Erweiterung:

1. **Schreibhilfe überall** — Tagro-Button in Textfeldern (Gmail, Notion, …)
2. **Live-Feedback** — Feedback auf Projekt-Vorschauen aufnehmen

## Installieren

**In Festag:** [Einstellungen → Apps](https://festag.app/settings/apps) — Setup-Checkliste mit Live-Status

**Download:** [festag.app/download#chrome-extension](https://festag.app/download#chrome-extension)

**ZIP direkt:** [festag-chrome-extension.zip](https://festag.app/downloads/festag-chrome-extension.zip)

### Wichtig

Chrome installiert **keine ZIP-Datei** direkt:

1. ZIP herunterladen und **entpacken**
2. `chrome://extensions` → Entwicklermodus → **Entpackte Erweiterung laden** → Ordner `festag-chrome-extension`
3. Bei festag.app anmelden, **festag.app mit F5 neu laden** — dann steht unter Apps „Tagro installiert“
4. Testseite (z. B. Gmail) mit **F5** neu laden

### Entwicklung (lokal)

1. Chrome → `chrome://extensions`
2. **Entwicklermodus** oben rechts aktivieren
3. **"Entpackte Erweiterung laden"** → diesen Ordner (`extension/`) wählen
4. Bei festag.app im selben Browser **eingeloggt sein**

## Schreibhilfe

1. Extension-Icon → **Schreibhilfe in jedem Eingabefeld** aktiv lassen
2. Beliebiges Textfeld fokussieren (min. 8 Zeichen) oder Text markieren
3. **Tagro**-Chip am Feld, Dock unten rechts, oder **⌘⇧T** / **Strg⇧T**
4. Klarer, Professioneller, Kürzer, Lockerer, **Erklären**, **Übersetzen** — Vorschau → **Übernehmen** (mit Rückgängig)
5. Live-Feedback: Text markieren → **Hören** oder Sofort-Sprechen im Popup

Unterstützt u. a. Gmail (Shadow DOM), WhatsApp Web, Notion, LinkedIn.

API: `GET /api/extension/session`, `POST /api/extension/improve-text`, `…/apply`, `GET /api/extension/stats`

**Prod DB:** wenn `db:push` scheitert → `npm run extension:prod-sql` (siehe `docs/extension-prod-setup.md`)

### Wo die Schreibhilfe läuft

| Umgebung | Inline im Feld | Wie |
|----------|----------------|-----|
| Chrome / Edge / Brave (Mac, Windows) | Ja | Diese Extension |
| WhatsApp Web im Browser | Ja | v0.2.6+, Lexical-Paste |
| WhatsApp Desktop-App (Mac) | Nein | Kein Browser — siehe Festag-Tastatur / Shortcut |
| iPhone WhatsApp-App | Nein | Festag-Tastatur (geplant) oder Zwischenlösung Shortcut |
| Safari (Mac) | Bald | Eigene Safari-Web-Extension nötig |

## Live-Feedback

**In Festag:** [festag.app/download#chrome-extension](https://festag.app/download#chrome-extension)

**ZIP direkt:** [festag-chrome-extension.zip](https://festag.app/downloads/festag-chrome-extension.zip)

### Entwicklung (lokal)

1. Chrome → `chrome://extensions`
2. **Entwicklermodus** oben rechts aktivieren
3. **"Entpackte Erweiterung laden"** → diesen Ordner (`extension/`) wählen
4. Bei festag.app im selben Browser **eingeloggt sein** (die Extension
   nutzt deine bestehende Session — kein zweites Login)

## Benutzen

1. Beliebige Seite öffnen (z. B. die Staging-URL des Projekts)
2. Extension-Icon klicken → **Projekt wählen**
3. Panel öffnet sich rechts → **„● Aufnahme starten"**
4. Sprechen (oder auf **Tippen** wechseln) — jeder Satz erscheint live
5. **„Element markieren"** → Element anklicken → Wunsch/Frage eingeben
   (landet als `[Element: selector]`-Bullet, der Dev sieht exakt wo)
6. **„Neue Seite"** beim Navigieren — gruppiert das Feedback pro Seite
7. **„Stop & senden"** → Tagro strukturiert → Review im Panel →
   **„An Dev senden"**

Der Capture landet danach im Dev Panel unter **Client Captures**.

## Architektur

```
popup.js     Projekt-Picker (GET /api/extension/projects)
background.js  API-Bridge — trägt die festag.app-Cookies
content.js   Panel (Shadow DOM): Orb · Transcript · Marker · Review
```

Alle API-Calls laufen über den Service Worker (`host_permissions`
befreit Extension-Fetches von CORS/SameSite). Auf Dritt-Seiten hat das
Content-Script daher nie direkten API-Kontakt.

## Roadmap

- Brainstorm-Modus (Tagro stellt Rückfragen statt nur zu strukturieren)
- Screenshot des markierten Elements (`chrome.tabs.captureVisibleTab`)
- Projekt-gebundener Kurzzeit-Token statt Cookie-Session
- Icons + Store-Listing
