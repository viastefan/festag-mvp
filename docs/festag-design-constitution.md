# Festag Design Constitution

**The visual law of the Software Production Operating System.**

This document defines how Festag *looks and behaves* — not individual components.
Every screen, animation and surface must pass the gate at the end.

Related: `docs/festag-experience-constitution.md` · `app/globals.css` (token block) ·
`components/festag/festag-rows.ts` (the one list form)

> **Revision, 2026-08-22.** This replaces the "Read Mode / warm paper" constitution.
> That law asked every surface to whisper, and the product paid for it: body copy sat
> near 2.4:1 against its own background, primary actions were transparent while a
> third-party OAuth button carried the accent fill, and "never fill empty space"
> produced screens you had to hunt through. The new law keeps the *product* rules —
> one decision at a time, Tagro invisible, ask why a thing is on screen — and
> replaces the *visual* ones. Calm is still the goal. Calm is not the same as faint.

---

## Core philosophy

Design clarity. Design confidence. Design silence where silence helps — never quietness
as a costume.

Festag is a **Software Production Operating System**. Every screen answers one question:
**What deserves my attention right now?** The difference from the old law is how the
answer is delivered: the thing that deserves attention is now allowed to *look* like it.

If the user has to hunt for the primary action, the interface failed.

---

## Ground and surfaces

Neutral, not warm. Light mode is a soft neutral ground with true-white cards lifted off
it; dark mode is near-black with raised panels. Depth comes from **elevation**, not from
borders.

| Token | Light | Dark |
|---|---|---|
| `--surface-0` ground | `#F7F7F8` | `#0B0B0D` |
| `--surface-1` card | `#FFFFFF` | `#141416` |
| `--surface-2` raised / hover | `#F1F1F3` | `#1C1C20` |
| `--surface-3` sunken / track | `#E9E9EC` | `#232328` |
| `--hairline` | `rgba(15,15,20,0.07)` | `rgba(255,255,255,0.08)` |

Rules:

- A card is **fill + radius + shadow**. A hairline is optional and never the only
  separation. Never a border as the primary edge.
- One elevation step per layer. A card on a card is a design smell; a sheet over a page
  is fine.
- **Never:** gradient fills as decoration, glassmorphism as a surface, more than two
  elevation levels visible at once.

---

## Colour

Ink carries hierarchy. Colour carries state, never decoration.

| Role | Light | Dark | Minimum contrast |
|---|---|---|---|
| `--text` primary | `#0F0F14` | `#F4F4F6` | 12:1 |
| `--text-2` secondary | `#5B5B66` | `#A6A6B2` | **4.5:1** |
| `--text-3` tertiary / meta | `#7C7C88` | `#8A8A96` | **4.5:1** |
| `--accent` | `#2E6BFF` | `#5B8CFF` | 4.5:1 on ground |

- **4.5:1 is a floor, not a target.** The old palette shipped 2.4:1 secondary text. Any
  new token pair must be checked before it lands.
- Accent is for **state and focus**: active nav, focus ring, selected, link. Never as a
  fill for a provider button, never as decoration.
- State colours (`--green`, `--amber`, `--red`) mark *what a thing needs*, never a brand
  mood. They keep the semantic names already in `festag-rows.ts` (`--fst-tone`:
  wait · watch · good · quiet).

---

## Primary action

Exactly **one** filled action per surface, and it is the thing the screen is for.

- Primary: solid `--text` fill, inverted label, pill or `--radius-md`.
- Secondary: `--surface-2` fill, no border.
- Tertiary: text only.
- A provider button (Google, Apple, SSO) is **secondary**. It is never the loudest
  element on a sign-in screen.

If two things on a screen look equally clickable, one of them is wrong.

---

## Radius

| Token | Value | Used for |
|---|---|---|
| `--radius-sm` | 8px | inputs, chips, small controls |
| `--radius-md` | 12px | buttons, list rows |
| `--radius-lg` | 20px | cards, popovers |
| `--radius-xl` | 28px | sheets, feature cards, modals |
| pill | 999px | avatars, badges, primary CTA when it stands alone |

One family per surface. A 6px control inside a 28px card is a mismatch — step, don't jump.

---

## Elevation

| Token | Value (light) |
|---|---|
| `--shadow-sm` | `0 1px 2px rgba(15,15,20,.05)` |
| `--shadow-md` | `0 4px 16px rgba(15,15,20,.07)` |
| `--shadow-lg` | `0 12px 32px rgba(15,15,20,.10)` |
| `--shadow-xl` | `0 24px 64px rgba(15,15,20,.14)` |

Shadows are for things that genuinely float: cards, sheets, popovers, the open sidebar
panel. A permanently visible rail does not cast one — a shadow with nothing casting it
is a smudge.

---

## Typography

Hierarchy comes from **size and colour**, not weight.

| Role | Face | Weight | Size |
|---|---|---|---|
| Editorial display | Editors Note | Medium 500 | `clamp(28px, 3.2vw, 40px)` |
| Page title | Editors Note | Medium 500 | 27–33px (`FESTAG_CONTENT_HEAD_CSS`) |
| Section heading | Aeonik | Regular 400 | 17–19px |
| Body / rows | Aeonik | Regular 400 | 15–16px |
| Meta / labels | Aeonik | Regular 400 | 13px, `--text-3` |

- Aeonik Regular is the default. Medium is opt-in for a single emphasised element.
- **Aeonik Bold stays forbidden** — the `@font-face` for 600+ maps to Medium.
- Desktop and mobile share one type scale. Not two products.

---

## Motion

Motion confirms an action. It never performs.

| Interaction | Duration |
|---|---|
| Press | 70ms |
| Hover, colour, focus ring | 130ms |
| Panel / sheet open | 180–240ms |
| Step or route change | 200ms |

- Micro-interactions are **faster** than layout changes, never slower. A hover that
  takes 300ms reads as lag.
- A surface that covers content must be opaque **before** it covers it.
- Everything above collapses under `prefers-reduced-motion: reduce`.

---

## Component patterns

- **Lists** are `festag-rows.ts` — group heading, then rows. Not cards in a grid.
- **People** are the person card: avatar, name, role, one real action. Roles come from
  `lib/platform/roles.ts` — `client`, `developer`, `designer` are real project roles.
  Do not invent parallel role systems.
- **Empty states** say what is missing and offer the action that fills it.
- **Every action has a consequence.** No button that only looks like one.

---

## Mobile

Mobile is **not** desktop scaled down.

- Chrome is fixed and documented: `.cursor/rules/festag-mobile-ui.mdc`. Search + menu
  together, top right, navigation in a sheet.
- Touch targets ≥ 44px. Rows ≥ 48px.
- A horizontal strip that scrolls must **show** that it scrolls — soft edge, snap.
  Invisibly scrollable is the same as unreachable.
- Never a desktop nav rail laid on its side.

---

## Gate (every feature)

1. **Why is this visible now?** — no good answer, remove it.
2. Is there exactly one filled primary action?
3. Does every text pair clear 4.5:1?
4. Is depth carried by elevation rather than borders?
5. Are micro-interactions faster than layout changes?
6. Does mobile feel native — not a compressed desktop?
7. Does every action change something real in the backend?

If any answer fails → redesign until it aligns.

---

## Reference feeling

> "This is obvious." → after five seconds → "I know what to do next." → after a minute →
> "This system thinks ahead."

Confident, current, quiet where quiet earns its place. Not Jira. Not ClickUp. Not a
whisper you have to lean into.
