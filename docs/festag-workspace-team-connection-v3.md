# Festag — Workspace, Team & Connection System V3

Version 3.0

Canonical product architecture for **one shared work system** with role-based
perspectives. Supersedes older mode language where they conflict; does **not**
replace the dual-portal principle in `docs/festag-workspace-portal-system.md`.

Read with:

- `docs/festag-workspace-portal-system.md` — Client Portal ↔ Execution Panel
- `docs/leqra-festag-operating-architecture.md` — Leqra + Festag layers
- `docs/festag-adaptive-intelligence.md` — OKM / Operational DNA
- `docs/festag-product-north-star.md` — delivery intelligence north star

---

## Mission

Festag must not feel like separate dashboards.

It is **one shared workroom**. Roles see the same projects from their
perspective. Everyone works on the same data. Nobody works on copies.

**One truth. Four operating postures. Multiple role lenses.**

---

## Core principle

There are no separate projects, tasks, files, status reports, decisions, or
chats per portal or per role.

Everything belongs to **one project** inside **one workspace**.

The surface changes only by:

1. **Workspace mode** (operating posture of the org)
2. **Role** (what this person may see and do)
3. **Perspective** (Client Portal vs Execution Panel)

Never by duplicating entities.

---

## The four workspace modes

| V3 mode | Intent | Who |
|---------|--------|-----|
| **Solo** | Founder / single operator; Tagro steers most of the project | One user, no agency team |
| **Developer** | One developer serving multiple clients | Freelancer / solo engineer |
| **Agency** | Multiple developers, clients, projects, teams, roles | Agency |
| **Enterprise** | Departments, internal + external builders, SSO, audit | Company |

### Mapping to current repo (`workspaces.mode`)

Today the DB enum is `delivery | team | agency`
(`supabase/migrations/20260515_workspaces_foundation.sql`).

| V3 | Current enum (interim) | Notes |
|----|------------------------|-------|
| Solo | `delivery` + ≤1 member (or personal workspace) | Product posture, not a new enum yet |
| Developer | `team` (Execution-first) | Multi-client via shared project membership, not copies |
| Agency | `agency` | Already present (`/clients`, agency nav) |
| Enterprise | *not in enum yet* | Future: SSO, departments, audit — extend enum carefully |

Do **not** invent parallel mode systems. Prefer extending `workspace_mode` once
Enterprise is shipped. Until then, treat Solo/Developer as **postures** on top
of `delivery` / `team`.

Local UX flag `client_delivery | internal_company` in `lib/workspace-mode.ts`
stays a language/posture overlay — not a second source of truth for data.

---

## One project

A project exists exactly once. It owns:

Description · Roadmap · Epics · Tasks · Files · Documents · Designs ·
Comments · Decisions · Status reports · Risks · Deliverables · GitHub ·
Deployments · Releases · Timeline · Tagro context

All modules read/write the same project row and child tables.

---

## Roles change only the lens

| Role | Sees |
|------|------|
| **Client** | Status, decisions, files, status reports, invoices, approvals, communication |
| **Developer** | Own tasks, commits, branches, PRs, reviews, builds, open questions, tech risks |
| **Agency owner** | All clients, developers, load, revenue, capacity, quality |
| **Enterprise admin** | Departments, budgets, compliance, audits, teams |

Same entities. Different fields, density, and permissions.

---

## No duplicated data

```text
Client creates Project A
        ↓
Developer accepts invite
        ↓
Project A appears (same id)
```

No copy. No sync job. No export/import. Live on one database.

Invites add **membership** (`workspace_members` / project membership), never a
second project.

---

## Invitation system

Entry points (all resolve to the same accept path):

Search · Name · Email · PIN · Festag username · QR · Link

After accept, the developer immediately sees the shared project graph
(roadmap, files, status reports, decisions, open questions, GitHub, tasks,
timeline) — no second setup.

**Invite relationship (rule A):** `developer_invites.relationship_kind` +
`workspace_mode` snapshot. Values:
`festag_internal` · `agency_member` · `freelancer` · `client_company_dev`.
Copied to `workspace_members.relationship_kind` and `profiles.dev_relationship`
on accept. Defaults from workspace mode when the inviter leaves “Auto”.
Drives Execution Panel nav modules (`lib/dev/relationship.ts`).

**Dev onboarding verbinden (B):** redeem invite link/code **or** “Später
verbinden”. Fallback posture picker (C) only when there is no invite yet —
invite always wins later.

**Dev profile facts (Tagro personalization):** Onboarding field „Über dich“
stores freeform notes in `profiles.dev_profile_facts`. Tagro Field Assist
rewrites in-place. Later pipeline (OKM): extract short `position`,
`dev_profile_summary`, and Execution Panel module hints from facts —
never a second PM surface; feed Company Brain / DNA only with consent.

Existing anchors:

- `team_invites`, `/api/invites/*`, `/invite/[token]`
- Developer: `/api/projects/invite-dev`, `/api/dev/accept-invite`,
  `components/dev/InviteDevModal.tsx`
- Migration: `supabase/migrations/20260727_developer_invites.sql`,
  `20260731_dev_relationship_kind.sql`

Extend these flows; do not fork a second invite product.

---

## Connections

Every project surfaces a calm **Connected with** strip:

Client · Developer · Agency · Enterprise · GitHub · Supabase · Tagro ·
Design · Documents

Minimal status indicators — not colorful, not loud.

Live presence examples:

- Client: „Leon arbeitet gerade am Login.“
- Developer: „Neue Entscheidung eingegangen.“
- All: „Deployment abgeschlossen.“ after GitHub merge

Prefer Supabase Realtime + optimistic UI. No polling loops for core presence.

---

## Files & documents

**Files belong to the project**, never to a user as the source of truth.

Each file: version · history · author · comments · approvals.

Upload once → visible in Execution Panel, status reports, Tagro context,
deliverables — same row.

Tagro may auto-create documents (status reports, meeting notes, decision
protocols, tech docs, sprint/project summaries) as project-scoped artifacts.

---

## Decisions & status reports

Decisions and status reports are **project property**, not private drafts by
default (drafts may exist transiently before publish).

Decision fields: status · author · time · project · impact · linked tasks /
files / risks · history · comments · Tagro recommendation.

Status reports: Client reads · Developer amends · Tagro analyzes · Agency
oversees · Enterprise documents — one source.

---

## Tagro as mediator

Users should not ask „whom do I send this to?“

Artifacts go to Tagro / the project. Tagro routes attention to developer,
project lead, agency, enterprise, or all — using workspace context and OKM.

Tagro never owns a portal; it owns workspace + project context.

---

## GitHub

One repository connection per project (or explicit multi-repo later — still
project-scoped). Branches, PRs, commits, releases, issues, deployments appear
**inside the project**, Execution Panel primary; Client gets calm summaries only.

Developer OAuth link (onboarding „Quellen“ / settings): Supabase GitHub
provider + `linkIdentity` → `/auth/callback` → `POST /api/github/persist-session`
writes `profiles.github_*` / `dev_github_linked` and
`github_connections.access_token_encrypted`. Sync APIs prefer that token,
then fall back to `GITHUB_PAT`. Mid-flow `next=/dev/onboarding?step=…` must
survive post-auth routing (see `isDevMidFlowNext`).

---

## Rights

RBAC on shared rows — not copied datasets.

| Lens | Emphasis |
|------|----------|
| Developer | Code / execution |
| Client | Business / trust |
| Agency | Organization |
| Enterprise | Governance |

Privacy: Adaptive Intelligence remains collaboration intelligence, not
surveillance (`docs/festag-adaptive-intelligence.md`).

---

## UI & performance targets

Feel: Apple · Linear · OpenAI · Notion · Vercel — whitespace, typography,
minimal chrome. Prefer Festag design tokens; no heavy sidebars or competing nav.

Runtime: optimistic updates · Supabase Realtime · no forced refresh · streaming
where useful · edge where already used · local caches. Offline-first is a
direction, not a claim that the app is fully offline today.

---

## Data model (single source of truth)

```text
Workspace
  ├── Members (role, permissions, connections)
  └── Projects
        ├── Tasks
        ├── Files
        ├── Decisions
        ├── Status reports
        ├── Chats / activity (project-scoped)
        ├── Deliverables
        └── GitHub repository (project-scoped)
```

Never create parallel project objects for Client vs Developer.

### Implementation gate

Before shipping related work:

1. Which tables / policies / APIs / components already exist?
2. Can we extend instead of inventing a twin?
3. Does this create a second project/task/file copy? → redesign.
4. Does the role only change presentation + RLS, not the entity?
5. Does Tagro still see one project graph?
6. Does the UX stay one system with perspectives, not two apps?

### Code anchors (today)

| Concept | Anchor |
|---------|--------|
| Workspace resolve | `lib/workspace/resolve.ts` |
| Portal modes | `lib/portal-nav.ts` (`delivery` / `team` / `agency`) |
| Operating posture UX | `lib/workspace-mode.ts` |
| Execution access | `lib/execution-panel/access.ts` |
| Delivery bridge | `lib/projects/delivery-bridge.ts` |
| Task dual view | `lib/tasks/client-view.ts`, `lib/tasks/perspective.ts` |
| Invites | `lib/invites/*`, `/api/invites/*`, `/api/projects/invite-dev` |
| Client portal | portal shell, `/dashboard`, `/projects` |
| Execution Panel | `/dev/*`, `DevAppShell` |
| Tagro | `lib/tagro/*` |

---

## Philosophy

Festag does not connect people primarily through chat.

Festag connects everyone through **one shared project model**.

- Client → clarity  
- Developer → execution  
- Agency → organization  
- Enterprise → governance  
- Tagro → consistency across perspectives  

**One project. One database. Four postures. One operating system.**
