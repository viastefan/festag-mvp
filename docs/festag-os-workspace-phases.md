# Festag OS · Workspace Phases

**Rule:** `.cursor/rules/festag-os-workspace-phases.mdc`  
**Code:** `components/app-shell/` · `app/(pre-workspace)/overview/`  
**Create Project law:** `docs/festag-create-project-flow.md` (Architecture v3.7)

## Intent

Without a workspace, Festag is an **operating system entry** — not a half-empty dashboard.

With a workspace and **no projects**, the next honest step is **Create Project** — not empty Overview aggregation.

With projects, Festag becomes the **workspace OS** for delivery, Tagro, and collaboration. Overview then aggregates real state.

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
→ Create your first project   ← not empty Overview
```

**First project is not a slide inside the workspace wizard** (no module picker, no invite gate in the slides).  
It is the **immediate follow-on** after Ready when the workspace has zero projects.

**Use cases (jobs, not category labels):**

| Card | Meaning | Template type |
|---|---|---|
| Build for Clients | Software for clients with a team | `personal` / delivery |
| Run an Agency | Multiple clients and projects | `agency` |
| Build a Product | Own product | `startup` |
| Internal Team | Internal digital products | `company` |

**Do not** show module checkboxes, GitHub/CRM/Billing pickers, or €19 pricing on the first workspace.

**Pricing:** first owned workspace is free (Hobby). Creating an additional workspace surfaces the Workspace Plan (€19/month).

Code: `lib/platform/workspace-creation.ts` · `lib/workspace-create-open.ts` · `WorkspaceCreateWizardModal`.  
Legacy `/create-workspace` redirects to `/overview?create=1`.

## Phase 2b (locked) — Create Project Core Flow

See `docs/festag-create-project-flow.md`.

```
Create Project (name required · description optional)
→ Tagro prepare (real draft work only)
→ Editable structure draft → human confirms
→ Optional invite (client / team)
→ Open project
```

Later „Neues Projekt“ uses the same surface (`openNewProject` / Intent Intake).  
Freestyle one-liner / voice / files remain for returning creators — first project stays minimal.

**Entry Intent:** project invite → land in project; own create → land in project after create; workspace invite → Workspace Overview; Festag OS (no workspace) → Overview.

## Phase 3 — Workspace Overview (after real projects)

Tagro Briefing, projects list, activity, decisions, health, team — only when there is something honest to summarize.

Do **not** polish empty Overview before Create Project + Invite + Project view work.

## Overview

Canonical path: `/overview`. Legacy `/home` → `/overview`.

The label **Overview** stays — no menu rename.

- **No workspace:** Festag OS welcome + Create Workspace.  
- **Workspace, zero projects:** Create Project (not fake aggregation).  
- **Workspace with projects:** pending invitations + Tagro briefing + health + projects + activity.

Pending invitations render as a dedicated Overview section (not only in the bell). Notifications for invite sent / accepted / joined appear in the shell bell.
