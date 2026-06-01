# Email Integration & Workspace Model

Implementation reference for two product directions discussed on 2026-06-01.
Additive: nothing here removes existing routes. Email is a **forward-looking
spec** (not yet built); the workspace section documents the model the current
schema already supports and how the surfaces should reflect it.

---

## 1. Email integration (spec — not yet built)

### Vision
Every client or developer can connect their own email so Festag becomes a
**triage inbox**, not a full mail client. The point is not "read all mail in
Festag" — it is that **Tagro reads inbound mail, understands it, and routes the
relevant ones** to the right project / task / client, and can spin up new
projects, tasks, decisions or status points from them.

### Two variants under consideration

**A) Connect existing accounts (BYO email) — preferred first step**
- The user links their existing mailbox (Gmail / Outlook / IMAP) via OAuth.
- Festag pulls inbound mail through the provider API.
- Tagro classifies each message: which project / task / client it belongs to,
  whether it is an update, a question, a decision trigger, or noise.
- Only **relevant** mail (Tagro-matched or rule-matched) surfaces in Festag —
  the rest stays in the user's normal inbox. No attempt to be the primary inbox.
- Pros: low backend cost, no deliverability/domain burden, fast to ship,
  meets users where they already are.
- Cons: per-provider OAuth + token refresh; provider rate limits; sync lag.

**B) Festag-issued mailboxes (`name@festag.app` or per-workspace domain)**
- Festag provisions a real address per user/workspace.
- Pros: fully owned pipeline, clean threading, inbound webhooks, can be the
  canonical project address (`project-x@client.festag.app`).
- Cons: heavier backend — inbound MX/webhook (e.g. Postmark/SES inbound),
  outbound deliverability (SPF/DKIM/DMARC), spam handling, storage, cost.
- Treat as a **later** layer, likely white-label only (agency's own domain).

**Decision: start with (A).** Ship BYO connection + Tagro triage first; revisit
(B) when white-label demand justifies the inbound-mail infrastructure.

### Tagro routing pipeline (both variants)
1. Inbound message arrives (provider API poll/webhook, or Festag MX).
2. Tagro classifies: `{ project_id?, task_id?, client_id?, intent }`
   where `intent ∈ update | question | decision | new_project | task | noise`.
3. Rules layer (user-defined) can force-route or suppress before Tagro.
4. Relevant messages become inbox items; from one the user (or Tagro) can
   **create** a project, task, decision, or status point in one action.
5. Audit: every auto-created entity links back to the source message.

### Schema sketch (when built)
- `email_connections` — `{ user_id, provider, oauth_tokens, address, status }`
- `inbound_messages` — `{ connection_id, from, subject, body, received_at,
  tagro_classification jsonb, project_id?, task_id?, client_id?, intent,
  handled_at }`
- `email_rules` — `{ user_id, match jsonb, action jsonb }`
- Reuse the **Decision Engine** audit pattern (`decision_events`) for traceable
  message → entity creation.

### Guardrails
- Never auto-send on the user's behalf without explicit confirmation.
- Connecting a mailbox + ingesting its content is sending data to an external
  service — surface that clearly at connect time; store the minimum.
- "Only relevant mail enters Festag" is a **promise**: default to suppress, not
  surface, when Tagro is unsure.

---

## 2. Workspace model (documents existing architecture)

The schema already carries this (`workspaces`, `workspace_members`,
`projects.workspace_id`, `agency_clients`). This section pins down the intended
shape so the surfaces stay consistent.

### Relationships
- A **workspace** can host **multiple clients** collaborating on shared projects.
- A **user can belong to multiple workspaces** (works with several agencies /
  companies) — workspace membership is many-to-many via `workspace_members`.
- A workspace is composed of **clients + Festag developers** once a matching dev
  is assigned to a project. Alternatively, a client's **own developers** can be
  brought into the workspace (white-label / agency-owned dev).
- A **project belongs to exactly one workspace** (`projects.workspace_id`), but
  the responsible developer is visible **regardless of which workspace** the
  viewer is in (read via `project_assignments` — see the projects table + the
  project "Verantwortlich" row, shipped 2026-06-01).

### Where this must show up
- **Projects table & project header**: responsible dev avatar(s),
  workspace-independent. ✅ shipped.
- **Task detail**: who is responsible, which project, **which workspace**, and
  Tagro's classification. ✅ shipped (workspace row added 2026-06-01).
- **Decisions**: can be delegated to a specific teammate (e.g. a co-founder in
  the client portal) when a team exists. ✅ shipped (`/api/decisions/:id/assign`).
- **Dev panel**: mirrors this model — the project pool cards and the project
  detail header show which **workspace** and **client** each project belongs to,
  and "mine" lists the projects the dev is the responsible dev on. ✅ shipped
  2026-06-01 (`/api/dev/projects/available` resolves workspace + client names).

### Invariants
- `project_assignments` is the single source of truth for "who builds this".
- Workspace membership gates visibility (RLS), but responsibility (the dev) is
  surfaced across workspace boundaries to whoever can see the project.

---

## 3. Festag as an embeddable API / platform (direction — AFTER the portal)

Not now — **finish the portal first**. Captured so the architecture trends in
the right direction.

### Goal
Let other apps embed Festag: create projects, push updates, read status /
decisions / reports, and surface Tagro intelligence — so Festag becomes a
**delivery-intelligence layer other products build on**, not only a portal.

### Shape (when we get there)
- **Public REST API** over the same surfaces the portal uses (projects, tasks,
  decisions, status reports, briefings). Reuse existing route handlers where
  possible; keep one domain layer, two callers (portal UI + API).
- **API keys / OAuth scopes** per workspace; every call is workspace-scoped and
  RLS-gated exactly like the portal. No new trust boundary.
- **Webhooks** for outbound events (status changed, decision needed, report
  ready) — mirrors the inbound email pipeline in reverse.
- **Embeddable widgets / SDK**: a drop-in client status panel + Tagro briefing
  another app can render (iframe or React component) without rebuilding the UI.
- **Idempotency + versioning** from day one (`/v1`, idempotency keys on writes).

### Prereqs the portal should already satisfy (so this stays cheap later)
- Keep business logic in `lib/` + API route handlers, not in page components,
  so the same logic backs both portal and public API.
- Stable workspace scoping + RLS on every table (already the pattern).
- Consistent entity shapes (the typed rows the portal already uses).

This is a **post-portal** track. Do not start it until the portal is feature-
complete and stable.
