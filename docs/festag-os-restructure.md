# Festag OS Restructure

This document turns the current Festag product direction into an implementation reference inside the repo. It is intentionally additive: existing routes and features stay in place and are progressively reconnected into one operating system.

## Core product definition

Festag is one AI-native software production operating system.

- Festwerk defines what is being built.
- Teams defines who is working on it.
- Relations keeps communication simple for clients.
- Tagro AI provides planning, context translation, and progress intelligence.
- Workspaces hold the system together.

The product must not feel like three separate apps.

## Non-goals

- Do not turn Festag into a freelance marketplace.
- Do not delete existing features just because they sit in the wrong place today.
- Do not treat Tagro AI as a global random chatbot.
- Do not keep billing as a primary daily-work navigation item.

## Navigation target

Festag moves from a top toggle model to a workspace model.

- One sidebar
- One footer/account menu
- One workspace switcher
- Role-based visibility
- Workspace-based visibility

### Primary navigation

- Workspace switcher
- Projects
- Messages
- Tasks
- Teams
- Documents
- Notes
- Tagro AI
- Tools

### Footer / account navigation

- Settings
- Account history
- Billing & plan
- Download app
- Support
- Connectors
- Add-ons
- Upgrade plan
- Updates / latest activity
- Theme
- Logout

## Workspace model

```ts
type WorkspaceType =
  | "personal_workspace"
  | "founder_team"
  | "developer_team"
  | "agency_workspace"
  | "agency_client_workspace"
  | "enterprise_workspace";
```

Each workspace can own:

- members
- projects
- tasks
- messages
- notes
- documents
- AI context
- invitations
- seats
- optional parent workspace

## Roles model

```ts
type WorkspaceRole =
  | "owner"
  | "admin"
  | "founder"
  | "cofounder"
  | "developer"
  | "lead_developer"
  | "agency_admin"
  | "agency_developer"
  | "client_member"
  | "enterprise_member"
  | "viewer";
```

Visibility must ultimately resolve from:

`workspaceType + userRole + seatStatus + projectAssignment`

## Current codebase realities

These are the main mismatches we are actively reducing:

- `components/ViewSwitch.tsx` still represented three separate modes.
- `app/relations/layout.tsx` and `app/(app)/layout.tsx` still present two different shells.
- `app/dev/layout.tsx` still behaves like an isolated product instead of a workspace surface.
- billing still exists in old primary-nav structures and must keep moving into footer/settings ownership.

## Implementation sequence

### Phase 1

- Replace the old toggle UI with a workspace switcher.
- Keep existing routes alive.
- Move billing and account management into footer/settings ownership.
- Create shared workspace/role types in code.

### Phase 2

- Introduce role-aware sidebar sections and hide/show logic.
- Normalize relations, festwerk, and teams into the same shell patterns.
- Reduce duplication between sidebars.

### Phase 3

- Implement workspace types and member-role data flow.
- Add invitation and PIN entry flow.
- Add seat-state checks for active participation.

### Phase 4

- Add agency parent workspace and isolated client workspaces.
- Restrict developer visibility to assigned client workspaces and projects.
- Keep AI context segmented per client workspace and project.

### Phase 5

- Make global search truly workspace-wide across projects, tasks, docs, notes, reports, messages, settings, connectors, and add-ons.
- Finish responsive cleanup so the system feels like one product on desktop and mobile.
