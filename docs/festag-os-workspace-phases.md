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

Not a folder form. The user creates their **digital operating environment** via a calm **popup with horizontal slides** on Festag OS Overview.

```
Create Workspace (popup + slides)
→ Workspace Name (+ live subdomain)
→ How will you use this?
→ Creating…
→ Your workspace is ready. (short success)
→ Overview
```

**First project is not part of workspace create.**  
„Neues Projekt“ opens later as a **darkened popup** (`NewProjectModal`): Tagro reads name/description, chats, suggests collaborators, invites, and helps formulate — same flow as the classic backend.

**Use cases (jobs, not category labels):**

| Card | Meaning | Template type |
|---|---|---|
| Build for Clients | Software for clients with a team | `personal` / delivery |
| Run an Agency | Multiple clients and projects | `agency` |
| Build a Product | Own product | `startup` |
| Internal Team | Internal digital products | `company` |

**Do not** show module checkboxes, GitHub/CRM/Billing pickers, or €19 pricing on the first workspace.

**Pricing:** first owned workspace is free (Hobby). Creating an additional workspace surfaces the Workspace Plan (€19/month).

Code: `lib/platform/workspace-creation.ts` · `lib/new-project-open.ts` · `WorkspaceCreateWizardModal` · `AppShellNewProjectHost` · `NewProjectModal` · `OverviewPendingInvites`.  
Legacy `/create-workspace` redirects to `/overview?create=1`.

## Overview

Canonical path: `/overview`. Legacy `/home` → `/overview`.

The label **Overview** stays when workspace dashboards arrive later — no menu rename.

Pending invitations render as a dedicated Overview section (not only in the bell). Notifications for invite sent / accepted / joined appear in the shell bell.
