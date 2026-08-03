# Festag OS · Workspace Phases

**Rule:** `.cursor/rules/festag-os-workspace-phases.mdc`  
**Code:** `components/app-shell/` · `app/(pre-workspace)/overview/`

## Intent

Without a workspace, Festag is an **operating system entry** — not a half-empty dashboard.

With a workspace, Festag becomes the **workspace OS** for projects, Tagro, and delivery.

## Phase 1 (frozen)

Authentication → Onboarding → Overview (shell + empty states + Create Workspace).

Success criterion: the user understands Festag and knows the next step is creating a workspace.

## Phase 2 (locked) — Workspace Creation

Not a folder form. The user creates their **digital operating environment** via a **sequential popup slider** on Festag OS Overview.

```
Create Workspace (popup)
→ Workspace Name (+ live subdomain: name.festag.app)
→ How will this workspace be used? (action cards)
→ Creating your workspace… (calm assemble)
→ Welcome to {Name}.
→ Overview stays open (dashboard next in Phase 3)
```

**Use cases (jobs, not category labels):**

| Card | Meaning | Template type |
|---|---|---|
| Build for Clients | Software for clients with a team | `personal` / delivery |
| Run an Agency | Multiple clients and projects | `agency` |
| Build a Product | Own product | `startup` |
| Internal Team | Internal digital products | `company` |

Footnote on use step: *Templates only configure your workspace. Everything can be changed later.*

**Do not** show module checkboxes, GitHub/CRM/Billing pickers, or €19 pricing on the first workspace.

**Pricing:** first owned workspace is free. Creating an additional workspace surfaces: *Additional workspaces are available with the Workspace Plan (€19/month).*

Code: `lib/platform/workspace-creation.ts` · `WorkspaceCreateWizardModal` · `openWorkspaceCreateWizard()` · `POST /api/workspaces/bootstrap`.  
Legacy `/create-workspace` redirects to `/overview?create=1`.

## Overview

Canonical path: `/overview`. Legacy `/home` → `/overview`.

The label **Overview** stays when workspace dashboards arrive later — no menu rename.
