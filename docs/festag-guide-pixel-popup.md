# Festag Guide — animated pixel popup ("So funktioniert Festag")

NEXT BUILD (Stefan, spec captured). A small, premium product-guide popup
bottom-left with a modular pixel animation (the `festag` wordmark / a brand
core assembling from pixels). Must work in **Light / Dark / Read** mode. Replaces
/upgrades the current `So funktioniert Festag` teaser (the existing pixel
wordmark looked half-assembled/buggy — this is the clean spec).

In-app target: it lives in the sidebar footer area (`SidebarProfileFooter` /
the existing guide teaser). The standalone `index.html` below is the reference
prototype to nail the motion before porting into the React app + theme tokens.

## Placement
- `position: fixed; bottom: 24px; left: 24px; z-index` high.
- Mobile: `left/right/bottom: 16px; width: auto`.

## Copy
- Title: **„So funktioniert Festag"**
- Optional subtitle (only if not cluttered): „Projektstatus, Entscheidungen und
  Updates klar erklärt." / „Klare Projektübersicht in wenigen Schritten."

## Layout
- Desktop: width 320–380px, min-height ~86px, padding 16px, radius 18px.
- Left: small pixel animation/icon ~44×44px. Right: title + optional subtitle.
  Optional far-right: a small `→` or „Öffnen" — only if it stays clean.

## Pixel animation
- Pixels are **DOM or SVG squares** (no canvas unless needed), ~4–5px, gap 2px,
  radius 1px. Colours via `--pixel-primary` / `--pixel-accent` (accent very
  sparse).
- Generated from a **matrix** (not hand-written HTML). A 7×7/8×8 abstract
  F/network core — modular brand-marker, not retro/Minecraft. Example:
  ```
  1111000
  1000100
  1000000
  1110100
  1000000
  1000100
  1001000
  ```
- Mount: popup slides up-left, `opacity 0→1`, `translateY(12px) scale(.98)→0/1`,
  520ms `cubic-bezier(.16,1,.3,1)`.
- Each pixel: starts `opacity 0; translate(start-x,start-y) scale(.3);
  blur(2px)` → `opacity 1; translate(0,0) scale(1); blur(0)`, 700–1200ms,
  stagger 0–450ms, same easing. Final: very subtle pulse (scale 1→1.05→1) on a
  few accent pixels only; re-pulse subtly every 6–8s. Calm, never hectic, never
  a game-loader.

## Modes (CSS variables + body class)
`:root` vars: `--bg-page --popup-bg --popup-border --text-primary
--text-secondary --pixel-primary --pixel-accent --shadow --accent`.
Body classes `.theme-light .theme-dark .theme-read` (demo toggles Light/Dark/
Read in the prototype).

- **Light:** page `#F7F8FA`, popup `rgba(255,255,255,.82)`, border
  `rgba(15,23,42,.08)`, text `#111827`/`#6B7280`, pixel `#111827`/accent
  `#6a738c`, shadow `0 18px 50px rgba(15,23,42,.10)`. Apple/Linear/Vercel-clean.
- **Dark:** page `#070B12`, popup `rgba(11,17,24,.82)`, border
  `rgba(255,255,255,.08)`, text `#E8EDF4`/`#9AA4B2`, pixel `#E8EDF4`/`#6a738c`,
  shadow `0 20px 60px rgba(0,0,0,.35)`. Calm, no neon.
- **Read:** page `#F4F1EA`, popup `rgba(255,252,245,.86)`, border
  `rgba(70,60,45,.10)`, text `#2A2520`/`#756C60`, pixel `#2A2520`/accent very
  reduced, shadow `0 18px 45px rgba(70,60,45,.10)`. Premium reading mode, not
  cheap-yellow.

## Interaction
- Whole popup is a `button`/`role="button"`, `aria-label="So funktioniert
  Festag öffnen"`, visible keyboard focus.
- Hover: lift `translateY(-2px)`, border slightly more visible, `→` moves +2px,
  pixel icon pulses once.
- Click: opens the guide (in-app: the existing 15s explainer). Optional
  `expanded` state — a *small* upward expansion showing 3 steps (1 Projekt
  verbinden · 2 Fortschritt verstehen · 3 Entscheidungen klären). Default stays
  small. Escape closes expanded.

## A11y / motion
`prefers-reduced-motion: reduce` → strongly reduce/disable animations.

## Quality bar
Good: feels like a real Festag UI element; clean in Light/Dark/Read; small
bottom-left popup; calm high-end pixel motion; „So funktioniert Festag" clearly
legible; responsive; minimal text; not retro/game-y. Bad: too colourful/hectic,
loader-like, Minecraft, broken theming, too big/intrusive, too much text, normal
font used as the animation.

## Prototype deliverable
A single self-contained `index.html` (HTML+CSS+vanilla JS, no libraries) with:
`createPixelIcon()` (from matrix), `animatePixels()`, `handleThemeSwitch()`,
`handlePopupClick()`, optional expanded state. Then port into the React app
(sidebar guide teaser) using the app's theme tokens.
