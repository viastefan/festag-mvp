# Festag Design Constitution

**The visual law of the Software Production Operating System.**

This document defines how Festag *feels* — not individual components. Every screen, animation, and surface must pass the gate at the end of this document.

Related: `docs/festag-experience-constitution.md` · `lib/design-tokens/festag-canvas.ts`

---

## Core philosophy

Design silence. Design clarity. Design confidence. Never design complexity.

Festag is not an AI chat, not a project management tool, not another SaaS application. It is a **Software Production Operating System**.

Every screen answers one question: **What deserves my attention right now?**

If the user has to think about how the interface works, the interface failed.

---

## Read Mode (default identity)

Every page begins in Read Mode.

| Token | Value |
|---|---|
| Paper | `#F8F6F2` |
| Primary (attention only) | `#5B647D` |
| Ink | `#1A1917` |
| Muted | `#8A8680` |

**Never:** pure white canvas, gray dashboards, colorful gradients, glassmorphism, futuristic effects.

**Always:** soft natural light, intentional whitespace, warm paper tone.

Code: `lib/design-tokens/festag-canvas.ts`

---

## Typography

Aeonik only. Typography creates hierarchy — not borders, not colors, not cards.

Prefer huge headings, editorial spacing, comfortable line height, minimal labels. The interface should almost read like a magazine.

---

## Spacing & surfaces

Whitespace is part of the product. Never fill empty space. Large margins, large vertical rhythm, very few components.

Panels = floating paper: almost invisible borders, very soft shadows, rounded corners. Nothing heavy. No dashboard feeling.

---

## The Festag Canvas

Every page has **one living canvas** — not widgets, not statistics, not cards. The canvas visualizes context. Nothing more.

---

## Knowledge vs Flow

Two visual languages. One transition between them is the soul of Festag.

### Knowledge (default)

- Small dots, extremely subtle
- Not connected, no labels, no noise
- Feels alive but calm — like stars, like project knowledge sleeping
- User understands: *My project exists* — without seeing complexity

Code: `components/festag-canvas/KnowledgeGrid.tsx` · `lib/design/knowledge-grid.ts`

### Flow (when attention is required)

- **One** organic path appears (Primary Blue `#5B647D`)
- **One** decision appears
- **One** recommendation appears
- After completion, path retracts — interface becomes calm again

**Never:** multiple active paths, arrows, flowcharts, thick glowing lines.

Code: `components/festag-canvas/FestagPath.tsx` · `components/festag-canvas/FestagKnowledgeEdges.tsx` · `components/festag-canvas/festag-canvas-styles.ts`

Voice status on mobile uses `useStatusReportPlayback` (Web Speech API + word-level lyrics sync).

---

## Decisions & Tagro

- Always **one** decision at a time — never lists, never task boards
- Tagro is invisible intelligence — never the center, never AI theater
- Recommendation panels float: pure white, minimal, editorial
- Explanations grow from the path — never a new page

---

## Animation

Animations communicate understanding — never decoration.

Slow. Confident. Elegant. Dots breathe. Paths grow. Panels fade. Popups emerge from paths. Completed paths retract.

---

## Mobile

Mobile is **not** desktop scaled down. Design independently.

Large typography, large touch targets, maximum focus. One important thing visible at a time.

Overview mobile = living story: `components/app-shell/overview/MobileOverviewStory.tsx`

While Tagro speaks or a path is active, chrome fades (focus mode).

---

## Desktop

Desktop has room — do not fill it. Whitespace creates confidence.

Overview desktop = Wissensraum constellation + Entscheidungsfluss: `components/app-shell/WorkspaceBoard.tsx`

---

## Gate (every feature)

Before shipping any UI, ask:

1. **Why is this visible now?** — If no good answer, remove it.
2. Does this reduce cognitive load?
3. Is Read Mode paper the canvas?
4. Is Primary Blue used only for attention?
5. Is there only one active path?
6. Does mobile feel native — not compressed desktop?

If any answer fails → redesign until it aligns.

---

## Reference feeling

> "This feels calm." → after five seconds → "I immediately understand." → after one minute → "This system thinks ahead."

Not Jira. Not ClickUp. Not ChatGPT. Apple Notes × Linear × an operating system that hides complexity until it matters.
