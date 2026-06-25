# Festag Chrome Extension — Tagro

Zwei Funktionen in einer Erweiterung:

1. **Schreibhilfe überall** — Tagro-Button in Textfeldern (Gmail, Notion, …)
2. **Live-Feedback** — Feedback auf Projekt-Vorschauen aufnehmen

## Installieren

**In Festag:** [festag.app/download#chrome-extension](https://festag.app/download#chrome-extension)

**ZIP direkt:** [festag-chrome-extension.zip](https://festag.app/downloads/festag-chrome-extension.zip)

### Wichtig

Chrome installiert **keine ZIP-Datei** direkt. So geht es:

1. ZIP herunterladen und **entpacken** (Doppelklick)
2. Im Ordner `festag-chrome-extension` die Datei **`INSTALLIEREN.html`** öffnen
3. Den Schritten folgen (oder `chrome://extensions` → Entwicklermodus → **Entpackte Erweiterung laden** → Ordner wählen)

### Entwicklung (lokal)

1. Chrome → `chrome://extensions`
2. **Entwicklermodus** oben rechts aktivieren
3. **"Entpackte Erweiterung laden"** → diesen Ordner (`extension/`) wählen
4. Bei festag.app im selben Browser **eingeloggt sein**

## Schreibhilfe (Slice 1)

1. Extension-Icon → **Schreibhilfe überall** aktiv lassen (Standard)
2. Beliebiges Textfeld fokussieren (min. 10 Zeichen)
3. **Tagro**-Chip unten rechts am Feld → Klarer / Professioneller / Kürzer
4. Vorschau prüfen → **Übernehmen**

API: `POST /api/extension/improve-text` (Session-Cookie via Background-Worker).

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
