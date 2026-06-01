# CMS Content Intake (website projects)

Forward-looking spec — not yet built. Captures the "structured content handoff"
feature so the architecture trends the right way. Ties into work types
(`work_type='software'` / website), the project surfaces (tabs + AssetsPanel),
the sync bus (`lib/sync/bus.ts`) + notifications, and Tagro.

---

## The idea (in one line)

For a website project, the **dev** sets up a structured **content intake** (a
calm, guided "CMS" — like a much nicer Google-Sheet) that the **client fills in
their portal**; every edit notifies the dev, who transfers the content into the
real site/CMS. Festag replaces the "dev chases the client for texts/images over
email + a messy Google Doc" loop with one polished, shared surface.

### Why
- Devs lose days collecting copy, images, opening hours, services, legal text.
- Clients don't know what to send. A guided intake tells them exactly what's
  needed, section by section, and looks premium (not a raw spreadsheet).
- Everything lives on the project — always accessible in the client portal's
  **Anlagen**, never lost in email threads.

---

## Where it lives

- **Project → new "Inhalte" tab** (alongside Übersicht / Tasks / Meilensteine),
  surfaced in both the client portal and the dev panel.
- Also reachable from the project's **Anlagen / Assets** area (`AssetsPanel`),
  since the client thinks of it as "the content for my site".
- Dev side = *define + review*; client side = *fill in*.

Only appears for projects whose `work_type` is website/software (or when the dev
enables it) — driven by the existing work-type classification, so it doesn't
clutter non-website projects.

---

## Structure

A project's intake (= the "CMS") is a set of **sections**, each with **fields**:

- **Section** — e.g. „Startseite", „Über uns", „Leistungen", „Kontakt &
  Öffnungszeiten", „Rechtliches (Impressum/Datenschutz)". Has a status:
  `offen → ausgefüllt → übernommen`.
- **Field** — typed inputs: `text`, `longtext`, `image`/`file` (upload), `list`
  (repeater, e.g. services / team members), `link`, `date`, `hours`
  (opening-hours grid). Each field has label, help text, required flag.

### Templates (so the dev never starts from scratch)
Ship ready intake templates per website type — „Praxis-Website",
„Restaurant", „Beratung/Coaching", „Local Business", „Portfolio". The dev picks
one (or Tagro pre-generates the structure from the project brief), then tweaks.
This is the same „Vorlagen" philosophy as the Documents feature.

---

## Flow

1. Dev opens the project → **Inhalte** → picks a template (or Tagro generates
   one from the brief) → adjusts sections/fields → publishes the intake.
2. Client opens **their portal → project → Anlagen/Inhalte** → sees a calm,
   guided form with progress („3 von 6 Bereichen ausgefüllt"). Autosaves.
3. On each client edit: **autosave** + a **dev notification** via the sync bus
   („Kunde X hat den Bereich ‚Leistungen' ausgefüllt"). Granular per section.
4. Dev reviews filled content, **copies/exports** it into the real site/CMS
   (Webflow / WordPress / Google Docs), then marks the section **„Übernommen"**.
5. Tagro can **summarize** the intake, flag missing required fields, and turn
   „Bereich ausgefüllt" into a status point / next action.

### Export / handoff (so the dev doesn't rebuild a Google Sheet)
- „Inhalte exportieren" → **Markdown / Google-Docs-ready / CSV**, plus
  per-field **copy** buttons. Images downloadable as a zip.
- Later: direct push integrations (Webflow CMS API, WordPress REST, Google
  Docs/Sheets) so content lands in the dev's tool automatically.

---

## Schema sketch (when built)

- `project_cms` — `{ id, project_id, template_key, title, status, created_by }`
- `cms_sections` — `{ id, project_cms_id, key, title, order, status
  (offen|ausgefuellt|uebernommen) }`
- `cms_fields` — `{ id, section_id, key, label, type, help, required, order,
  config jsonb (e.g. list item schema) }`
- `cms_values` — `{ id, field_id, value jsonb, updated_by, updated_at }`
- Files reuse the existing assets/upload storage; a value references the asset.

RLS: scoped by project membership (client fills their project; dev/owner read +
define), mirroring the existing project tables.

## Realtime + notifications
- Reuse `lib/sync/bus.ts` to fan a `cms_section_filled` / `cms_completed` event
  to the dev's Execution Inbox (`notifications`) and the project activity feed.
- Section status flips drive Tagro status points (same pattern as task updates).

## Looks-great bar (non-negotiable)
- Client side: a premium, friendly **guided intake** — one section at a time,
  progress, calm Festag styling (Aeonik, slate primary, 8px radii, no raw
  table). Mobile-first, no horizontal scroll.
- Dev side: a clean editor for sections/fields + a review panel with copy/export
  and „Übernommen" toggles.

## Guardrails
- Autosave must never lose client input; show „gespeichert" affordance.
- Required-field validation before a section counts as „ausgefüllt".
- Don't notify on every keystroke — debounce to section-level / on blur.

---

## Build slices (it's big)

1. **Schema + dev editor** — define sections/fields, one built-in template.
2. **Client intake UI** — guided fill + autosave in the portal.
3. **Notifications + status** — sync-bus events, section status, Tagro points.
4. **Export** — Markdown/CSV/copy + image zip.
5. **Templates library** — per website type + Tagro auto-generation.
6. **Direct integrations** — Webflow / WordPress / Google later.

Recommended first slice: 1 + 2 (define + fill, autosave) with one „Praxis-
Website"-style template, then notifications.

Related: [Documents/Vorlagen + Kunden model](documents-and-clients-model.md),
work types / Execution Panel, Tagro task-flow.
