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

## Logo (Fluid Mark)
- `/brand/festag-mark-fluid.png` — Fluid-„F“ Mark (Auth, Onboarding).
- `/brand/festag-mark.png` — legacy Split-Mark (CSS-Masken wo noch referenziert).
- `/brand/logo-mark.png` — schwarze Silhouette auf transparent (Sidebars; Dark via `--logo-filter`).
- `/brand/logo.svg` — Mark als SVG-Wrapper.
- `/brand/auth-logo-light.png` / `auth-logo-dark.png` — Auth-Brand mit Soft-3D.
- `/brand/app-icon.png` — rundes App-Icon (weißes Fluid-F auf schwarzem Kreis).
- `/brand/favicon.svg` — Favicon mit `prefers-color-scheme`: Light = schwarzes F auf weißem Kreis, Dark = weißes F auf schwarzem Kreis.
- `/brand/favicon-circle-light.png` / `favicon-circle-dark.png` — 1024px Master der Kreisfavicons.
- `/brand/favicon-{16,32,48,64}.png` — Light-Kreisfavicons für Tabs.

## Provider-Logos
- `github.svg`, `gmail.svg`, `notion.svg`, `slack.svg`, `zapier.svg`
  — Connector-Icons für die Connectors-Seite.
