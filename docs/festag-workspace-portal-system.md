# Festag — Workspace, Client Portal & Developer Portal System

Version 1.1

This document defines how the entire Festag ecosystem works.

This is not only a UI specification.

This is the operational logic behind the entire platform.

For **Workspace modes (Solo / Developer / Agency / Enterprise), invites,
connections, and the V3 single-source-of-truth model**, see the superseding
doc: `docs/festag-workspace-team-connection-v3.md`.

The Client Portal and the Developer Portal are **not** separate products.

They are two different perspectives of the same Workspace.

Everything inside Festag revolves around Workspaces.

---

## Core Philosophy

Every company has one or more Workspaces.

A Workspace is the central operating environment.

Everything belongs to a Workspace.

- Projects
- Tasks
- Files
- Meetings
- Developers
- Clients
- Invoices
- Status Reports
- GitHub Repositories
- Deployments
- Automations
- Tagro Memory
- Notifications

Nothing exists outside of a Workspace.

---

## One Workspace

A Workspace always contains one shared source of truth.

There are never duplicate projects.

There are never duplicate tasks.

There are never duplicate files.

The Client Portal and Developer Portal simply display different information from the same Workspace.

Everyone works on the same data.

Everyone sees different information depending on their role.

---

## Roles

Festag is role-driven.

Permissions are determined by the active role.

Examples:

- Workspace Owner
- Admin
- Project Manager
- Developer
- Designer
- Client
- Guest
- Observer
- AI Agent (future)

Every role has different permissions.

Never duplicate pages for different users.

Adapt the experience.

---

## Client Portal

The Client Portal is designed for clarity.

Clients should never see technical complexity.

Clients do not need GitHub.

Clients do not need deployments.

Clients do not need database structures.

Clients need confidence.

The Client Portal answers:

- What is happening?
- What changed?
- What comes next?
- How is my project progressing?

Every page should communicate trust.

The Client Portal should feel calm, minimal and reassuring.

---

## Developer Portal

The Developer Portal is designed for execution.

Developers require context.

Developers require speed.

Developers require technical information.

Developers should have access to:

- Tasks
- GitHub
- Branches
- Commits
- Pull Requests
- Deployments
- Files
- Architecture
- Technical Documentation
- AI Reviews
- Developer Notes

The Developer Portal should maximize focus and productivity.

In the product UI this surface is labeled **Execution Panel** (`/dev/*`) — same system, execution perspective.

---

## Same Workspace

Example:

1. Client uploads a new PDF.
2. The PDF appears inside the Workspace.
3. Developers immediately receive the file.
4. Tagro analyzes it.
5. Relevant Tasks are suggested.
6. Status Reports update automatically.

Nothing needs to be copied.

Everything stays synchronized.

---

## Projects

Every Project belongs to exactly one Workspace.

A Project contains:

- Timeline
- Tasks
- Meetings
- Files
- Team
- Activity
- Status Reports
- GitHub Connections
- Documentation
- Design Assets
- Tagro Context

Every module automatically shares information.

---

## Tasks

Tasks belong to Projects.

Tasks are visible differently depending on role.

**Client**

- Simple view
- Progress
- Status
- Comments
- Completion

**Developer**

- Technical Details
- Priority
- Dependencies
- GitHub Branch
- Commits
- PR
- Estimate
- Internal Notes

Same Task.

Different presentation.

Never duplicate data.

---

## Meetings

Meetings automatically belong to:

- Workspace
- Project
- Participants
- Tasks
- Files
- Status Reports
- Tagro

Every meeting becomes searchable.

Every decision becomes connected.

Nothing gets lost.

---

## Files

Files never exist alone.

Every uploaded file automatically belongs to:

- Workspace
- Project
- Task
- Meeting
- Client
- Developer

Everything remains connected.

---

## Notifications

Notifications are contextual.

- Clients receive business notifications.
- Developers receive technical notifications.
- Admins receive operational notifications.

Everyone receives only what matters.

Never spam users.

---

## Status Reports

Status Reports belong to Projects.

- Clients receive executive summaries.
- Developers receive technical summaries.
- Managers receive operational summaries.

The same data.

Different presentation.

---

## GitHub

GitHub only exists inside the Developer Portal.

Clients never interact directly with GitHub.

Instead GitHub activity automatically updates:

- Tasks
- Progress
- Status Reports
- Timeline
- Tagro

Clients receive understandable summaries.

Not technical details.

---

## Tagro

Tagro is shared across the entire Workspace.

Tagro never belongs to one portal.

Tagro belongs to the Workspace itself.

Tagro understands:

- Projects
- Tasks
- Meetings
- Files
- Repositories
- Conversations
- Developers
- Clients
- Deadlines
- Architecture
- Status Reports

Tagro always knows the complete context.

---

## Switching Portals

Users should never feel they are opening another application.

Switching between Client Portal and Developer Portal should feel like changing perspective.

Not changing software.

The visual language remains identical.

Only information density changes.

---

## Synchronization

Everything updates automatically.

When a Developer completes a Task:

1. Client Progress updates.
2. Status Report updates.
3. Timeline updates.
4. Notifications update.
5. Tagro updates.
6. Dashboard updates.

No manual synchronization.

Everything is connected.

---

## AI Native

Every action inside Festag should become AI-aware.

- Uploading a file
- Creating a task
- Scheduling a meeting
- Writing a comment
- Connecting GitHub

Everything automatically enriches Workspace Intelligence.

Tagro continuously learns the Workspace.

---

## Product Goal

The Client Portal creates trust.

The Developer Portal creates productivity.

Tagro creates intelligence.

The Workspace connects everything.

Users should never think about portals.

They should think about their Workspace.

The Workspace becomes the operating system of their company.

Every decision inside Festag should strengthen this philosophy.

Never build isolated features.

Always build connected systems.

---

## Implementation anchors (repo)

| Concept | Code / surface |
|---|---|
| Workspace truth | `workspaces`, `workspace_members`, project + task tables |
| Workspace resolve | `lib/workspace/resolve.ts` |
| Client Portal | `/dashboard`, `/projects`, `/project/[id]`, portal shell |
| Developer Portal (Execution Panel) | `/dev/*`, `DevAppShell`, `lib/execution-panel/access.ts` |
| Role gates | `profiles.role`, `approval_status`, `lib/role.ts`, middleware `/dev` |
| Perspective switch | `AuthPanelSwitchModal`, portal workspace menu → `/dev` |
| Delivery bridge (same project, different surface) | `lib/projects/delivery-bridge.ts` |
| Workspace-scoped pool | `lib/sync/project-created.ts`, `/api/dev/projects/available`, `/api/dev/projects/join` |
| Task dual-view (one row) | `lib/tasks/client-view.ts`, `lib/tasks/perspective.ts` |
| Tagro (workspace-scoped) | `lib/tagro/*`, Tagro overlay |

Read with:

- `docs/festag-adaptive-intelligence.md`
- `docs/festag-product-north-star.md`
- `docs/leqra-festag-operating-architecture.md`
