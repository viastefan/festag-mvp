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

## Logo (Split-Mark)
- `/brand/festag-mark.png` — weiße Silhouette auf transparent (CSS-Masken, Favicons).
- `/brand/logo-mark.png` — schwarze Silhouette auf transparent (Sidebars; Dark via `--logo-filter`).
- `/brand/logo.svg` — Mark als SVG-Wrapper (gleiche Silhouette).
- `/brand/auth-logo-light.png` / `auth-logo-dark.png` — Auth-Brand mit Soft-3D.
- `/brand/app-icon.png` — rundes App-Icon (weiß auf schwarz).

## Provider-Logos
- `github.svg`, `gmail.svg`, `notion.svg`, `slack.svg`, `zapier.svg`
  — Connector-Icons für die Connectors-Seite.
