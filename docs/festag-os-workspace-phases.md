# Festag OS · Workspace Phases

**Rule:** `.cursor/rules/festag-os-workspace-phases.mdc`  
**Code:** `components/app-shell/` · `app/(pre-workspace)/overview/`

## Intent

Without a workspace, Festag is an **operating system entry** — not a half-empty dashboard.

With a workspace, Festag becomes the **workspace OS** for projects, Tagro, and delivery.

## Phase 1 (frozen)

Authentication → Onboarding → Overview (shell + empty states + Create Workspace).

Success criterion: the user understands Festag and knows the next step is creating a workspace.

## Phase 2 (locked) — Workspace Creation + First Project Setup

Not a folder form. The user creates their **digital operating environment** via a calm full-screen flow on Festag OS Overview.

```
Create Workspace
→ Workspace Name (+ live subdomain)
→ How will you use this? (action cards)
→ Creating…
→ Your workspace is ready. (short success)
→ Create your first project. (required — no skip)
→ Invite your team. (@username or email + project role)
→ Overview (Pending Invitations + notifications)
```

**Use cases (jobs, not category labels):**

| Card | Meaning | Template type |
|---|---|---|
| Build for Clients | Software for clients with a team | `personal` / delivery |
| Run an Agency | Multiple clients and projects | `agency` |
| Build a Product | Own product | `startup` |
| Internal Team | Internal digital products | `company` |

**Do not** show module checkboxes, GitHub/CRM/Billing pickers, or €19 pricing on the first workspace.

**Pricing:** first owned workspace is free. Creating an additional workspace surfaces the Workspace Plan (€19/month).

**Invite roles** are project roles (`project_owner` · `developer` · `designer` · `client` · `viewer`) — never permanent account labels. Workspace Owner is not an invite chip.

Code: `lib/platform/workspace-creation.ts` · `lib/platform/workspace-setup.ts` · `WorkspaceCreateWizardModal` · `WorkspaceSetupSteps` · `OverviewPendingInvites` · `POST /api/workspaces/first-project` · `POST /api/invites/project` · `GET /api/invites/pending` · `POST /api/invites/respond`.  
Legacy `/create-workspace` redirects to `/overview?create=1`.

## Overview

Canonical path: `/overview`. Legacy `/home` → `/overview`.

The label **Overview** stays when workspace dashboards arrive later — no menu rename.

Pending invitations render as a dedicated Overview section (not only in the bell). Notifications for invite sent / accepted / joined appear in the shell bell.
