# Festag Browser Extension — Architecture (Slice 4 of the Capture Loop)

This is the deeper experience the in-app recorder hints at. Goal: the
client can be on **any** URL (not just the project's staging), open a
right-side Tagro panel, and **brainstorm with Tagro** by speaking,
writing, **and clicking on actual page elements**. This is not a
website builder — the client never edits the page. Tagro acts as a
senior product partner that asks the right follow-ups.

## Surface

```
┌──────────────────────────────────────────────────────────────┐
│   <client's website>                                         │
│                                                              │
│                                                              │
│                                    ┌─────────────────────┐   │
│                                    │  ●  (orb pulses)    │   │
│                                    │                     │   │
│                                    │  ▼ Transkript       │   │
│                                    │   "Hier würde ich   │   │
│                                    │    gerne ein…"      │   │
│                                    │                     │   │
│                                    │  ─ Sprechen | Tippen │   │
│                                    │                     │   │
│                                    │  ➜ Tagro:            │   │
│                                    │   "Soll der Hero    │   │
│                                    │    auch eine kürzere│   │
│                                    │    Variante haben?" │   │
│                                    │                     │   │
│                                    │  [ + Element markieren] │
│                                    └─────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Right-side panel
* 380px wide, fixed right, full height.
* Top: **animated orb** — reacts to mic amplitude in `recording`, calm
  in `idle`, breath-pulse during `thinking`.
* Below: **transcript stream** — live committed bullets plus the
  uncommitted draft (italic + caret).
* Toggle: **Sprechen** | **Tippen** (each input mode owns the focus).
* Footer: **Tagro reply** — the conversational partner. Tagro asks
  follow-up brainstorming questions ("Soll das auch für die mobile
  Variante gelten?", "Hast du ein Beispiel im Kopf?") instead of just
  transcribing.

### Element marker (the Atlas-style bit)
* `+ Element markieren` engages a hover-overlay. As the cursor moves,
  the page highlights the element under it (CSS selector resolved at
  mousemove via `document.elementFromPoint`).
* Click locks the selector. A **Festag bubble** opens anchored above
  the element with two CTAs:
  - **Ändern wollen** — opens the brainstorm thread, prefilled with
    "Element: `<selector>` auf `<url>`".
  - **Brainstormen** — "Was würdest du dir hier vorstellen?" Tagro
    runs the same conversation but tone shifts to "design partner".
* The selector + a small viewport screenshot ride along with every
  capture POST.

## Brainstorming vs change-script

Two modes the panel can be in:

| Mode             | Tagro behavior                                  |
|------------------|-------------------------------------------------|
| `change_script`  | Listen, extract concrete change requests. Same  |
|                  | system prompt as the current in-app recorder.   |
| `brainstorm`     | Ask 1-3 short follow-ups before deciding what   |
|                  | the change is. Stores the conversation as       |
|                  | `transcript`, with the final agreed change in   |
|                  | `structured_changes[]`. Tone is "senior product |
|                  | partner".                                       |

Modes are switched per-element by the buttons in the marker bubble, or
manually from the panel header.

## Data flow

```
Extension (popup or content script)
   │
   │  POST /api/captures
   │     {
   │       projectId,                ← chosen in extension login
   │       source: "chrome_extension",
   │       pageUrl, pageTitle,
   │       selector,                 ← from element marker
   │       screenshotUrl,            ← chrome.tabs.captureVisibleTab
   │       transcript,
   │       audioUrl,                 ← optional
   │       process: true,
   │       mode: "brainstorm" | "change_script"
   │     }
   │
   ▼
Festag API ── Tagro structuring (prompt branches on `mode`)
   │
   ▼
client_captures row → client review queue → dev inbox (slice 3)
```

A new column `mode` on `client_captures` lets the structuring prompt
branch. To be added in the slice-4 migration alongside the extension.

## Auth

* The user installs the extension, signs in via OAuth from the
  extension popup → sets a `festag_session_token` cookie scoped to
  `*.festag.app` AND a long-lived session in extension storage.
* When sending a capture from a third-party URL (e.g. `client.com`),
  the extension uses the token via `Authorization: Bearer` header
  against `api.festag.app/captures`.
* Token is project-scoped (issued for the chosen project) so a leak on
  the client side does not expose the whole workspace.

## Manifest V3 outline

```
extension/
  manifest.json          { permissions: scripting, activeTab, storage,
                           host_permissions: [http://*/*, https://*/*] }
  background.js          (service worker — token + session)
  content/panel.tsx      (right-side panel, mounted as Shadow DOM)
  content/marker.tsx     (element hover + click marker)
  popup.tsx              (sign-in + project picker)
  lib/api.ts             (POST /api/captures with bearer)
  lib/orb.tsx            (WebGL/Canvas pulsing orb)
  lib/transcript.tsx     (Web Speech API → live bullets)
```

The actual extension build ships as Slice 4 (separate from the web
app to keep CI/CD simple). The in-app recorder remains the day-1
fallback.

## Where this connects to existing Festag work

* `projects.staging_url` (added in slice 3 / this migration) is the
  primary source URL for the in-app recorder. The extension can ride
  on top of any URL but defaults to the project's staging when the
  user picks the project.
* `/api/captures` + `/api/captures/[id]` already accept the
  extension's payload shape — no changes needed beyond `mode`.
* The orb visual reuses the dashboard's waveform language so the
  extension feels native.
