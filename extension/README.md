# Festag Chrome Extension — Tagro Live-Feedback

Slice 4 of the Capture Loop. The client records feedback **directly on
the website** (any URL): right-side panel with orb, live transcript,
Sprechen/Tippen toggle, and an element marker that pins feedback to a
specific spot on the page. Posts to the same `/api/captures` the in-app
recorder uses.

## Installieren

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
