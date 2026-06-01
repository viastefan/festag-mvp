# Documents (Vorlagen) & the Kunden model

Two related, agency-facing topics, captured as an implementation reference.
The **Kunden** section explains the existing concept; the **Documents** section
is a forward-looking spec (placement + plan), not yet built.

---

## 1. The Kunden (clients) model — what it is

A **Kunde** (client) is a *container/identity* inside an **Agency-Workspace**
that bundles everything belonging to one of your customers — their projects,
briefings, files, contacts and (optionally) their own branding.

It is **not** a login by itself. It is the agency's internal grouping so a
studio that serves many customers keeps each customer's work, communication and
documents cleanly separated under one roof.

### Where it lives in the data
- `agency_clients` (one row per Kunde) — name, slug, industry, contact,
  `brand_color`, `logo_url`, belongs to a `workspace_id`.
- A project is linked to a Kunde (or left "Noch keinem Kunden zugeordnet").
- The Kunde can later get its **own people** via the link/PIN invite
  (`kind='client'` → Client-Panel) — those are the customer's seats into a
  calm, read-only-ish client view (status reports + decisions, no raw work).

### The three roles around a Kunde
1. **Agency owner / team** — creates the Kunde, runs the projects, sends
   briefings, offers, invoices.
2. **The Kunde's people** (e.g. the customer + their co-founder) — join via a
   client link, see ruhige geprüfte Statusberichte & Entscheidungen for *their*
   projects only.
3. **The Dev** (Festag dev or the agency's own dev) — builds the projects; sees
   which workspace/client a project belongs to (already shipped in the dev
   panel).

### Why it matters (the point of the feature)
- One agency, many customers, each customer isolated and (optionally)
  white-labelled under the agency's brand.
- The same project data drives three views (agency / client / dev) — nobody
  re-enters anything.
- It is the foundation for **White Label**: in Agency mode the agency can
  switch on White Label and every customer touchpoint (briefings, mails, PDFs)
  carries the agency's brand instead of Festag's.

### What's shipped vs open
- Shipped: Kunden list + empty state, create-client, link invite (client kind),
  brand-colour picker, dev-panel workspace/client visibility.
- Open: assigning existing projects to a Kunde from the client detail; the
  customer's client-panel polish; per-client document delivery (below).

---

## 2. Documents / Vorlagen (spec — not yet built)

### The idea
Festag ships ready-made **document templates** — **Angebot** (offer/quote),
**Vertrag / Dienstleistungsvertrag** (contract), **Rechnung** (invoice), and
more (Auftragsbestätigung, Mahnung, Storno, Leistungsnachweis). They work in
**every workspace mode**:
- **Festag Delivery / Team** → Festag-branded (or neutral) templates.
- **White Label** → the agency's own brand (name, logo, colour, domain) is
  applied automatically, pulled from `workspace_branding` / the Kunde's brand.

From a template you produce a real **PDF** that can be:
- **downloaded**,
- **sent to the customer** (the Kunde's people inside Festag — lands in their
  client panel / inbox),
- **emailed** (via the Festag mail layer, White-Label sender when active),
- and the **Dev can create the same documents** from their dev account (e.g. an
  offer to the client) — both sides share the same template engine, so an
  agency and its dev produce consistent paperwork.

### Where it lives (recommendation)
Add a **top-level "Dokumente"** section (sidebar), parallel to Projekte / Tasks
/ Kunden — present in both the client/agency app and the dev panel. Inside:
- **Vorlagen** — the template gallery (Angebot, Vertrag, Rechnung, …).
- **Erstellt** — documents already generated, with status (Entwurf / Gesendet /
  Bezahlt for invoices), filterable by Kunde and project.

Scoping rule: a document always belongs to a `workspace_id` and optionally a
`client_id` + `project_id`, mirroring the Kunden model. Branding resolves in
this order: Kunde brand → workspace White-Label brand → Festag default.

### Schema sketch (when built)
- `document_templates` — `{ id, kind (angebot|vertrag|rechnung|…), name,
  body_schema jsonb, is_system bool, workspace_id? (null = Festag-provided) }`
- `documents` — `{ id, workspace_id, client_id?, project_id?, template_id,
  kind, number (e.g. invoice no.), data jsonb, brand_snapshot jsonb,
  status, pdf_url?, sent_at?, created_by }`
- Numbering: per-workspace running counters for invoices (`#0000038` style,
  as in the user's examples).

### Generation + delivery
- Render template + `data` + resolved branding → HTML → PDF (server-side).
- Reuse the email layer (`lib/email/*`) for sending; White-Label sender/footer
  when the plan is active.
- Every generated document links back to its Kunde/project for the audit trail.

### Guardrails
- Invoices/contracts are legal documents — never auto-send without explicit
  confirmation; keep an immutable `brand_snapshot` + `data` per document so a
  later branding change doesn't rewrite issued paperwork.
- Numbers must be gap-free and unique per workspace.

This is a **multi-step build** (template engine → PDF → delivery → numbering).
Recommended first slice: the "Dokumente" section + the three core templates
(Angebot, Vertrag, Rechnung) with download-only PDF, then add sending.
