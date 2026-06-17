# Festag Brand Assets

## Hero-Image
- **Path:** `/public/brand/hero-team.jpg`
- **Verwendung:** Login-Seite (Desktop + Mobile Hero), Onboarding-Welcome.
- **Stil:** kuratiertes Expertenteam-Visual, kein generisches Stockfoto.
  Aktuell vorgesehen: Team-Bild mit Hunden (Symbol für koordiniertes
  Premium-Expertennetzwerk in entspannter, hochwertiger Atmosphäre).
- **Format-Empfehlung:** `1600×900px`, `< 400 KB`, JPEG mit progressivem
  Encoding. `objectPosition: center 35%` ist im Code gesetzt — Bild sollte
  oben Luft lassen.
- **Fallback:** wenn `hero-team.jpg` fehlt, fällt das Login-`<img>` automatisch
  auf `/bg-office.jpg` zurück (per onError-Handler). Es bricht also nichts.

## Logo
- `/brand/logo.svg` — Wordmark "festag", einfarbig.
- Wird per `filter: brightness(0) invert(1)` für dunkle Backgrounds invertiert.

## Provider-Logos
- `github.svg`, `gmail.svg`, `notion.svg`, `slack.svg`, `zapier.svg`
  — Connector-Icons für die Connectors-Seite.
