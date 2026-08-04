# Festag — Create Project Flow (locked)

**Architecture version:** 3.7  
**Memory:** `create-project-core-flow` · `entry-intent-landing` · revised `workspace-creation-as-os`  
**Code (current / target):** `lib/tagro/intent-intake.ts` · `components/NewProjectModal.tsx` · `lib/new-project-open.ts` · `lib/platform/workspace-creation.ts`

Supreme with: Product · Experience · Identity · Invisible Tagro · OS Workspace Phases · Architecture Memory.

---

## Why this exists

Festag sells a process, not a dashboard:

```text
Idee → Workspace → Projekt → Tagro-Struktur → Einladung → Zusammenarbeit → Lieferung
```

Overview is aggregation. Without projects there is nothing honest to aggregate.  
Create Project is the core of the platform — build it before Workspace Overview polish.

---

## Domain (Phase 1 — Core Objects)

```text
User
  └── Account Profile

Workspace
  ├── Workspace Profile (context, modules, settings, DNA)
  ├── Memberships (User ↔ Workspace ↔ Role)
  ├── Projects
  └── Tagro (workspace brain — not a chat product)

Project                    ← knowledge SSOT
  ├── Memberships (User ↔ Project ↔ ProjectRole)
  ├── Tasks · Documents · Decisions · Activity · Status
  └── Tagro project context

Invitation                 ← carries Entry Intent → landing
Notification
```

Invitation is not accessory. It stores **why** someone arrived.

---

## Entry Intent (landing law)

**First landing follows invitation / registration intention — not role.**

| Intention | Land here |
|---|---|
| Own registration / create workspace | Festag OS Overview → Create Workspace |
| Workspace created, **no projects yet** | Create first project (not empty Overview) |
| Project created (owner path) | That project |
| Project invitation | Invited project (`joinCompletionRedirect`) |
| Workspace membership invitation | Workspace Overview |
| Return visit | Last meaningful context; if one clear primary project → project |

Role controls **visibility and permissions**.  
Intention controls **the first room**.

Same platform. Progressive disclosure. Capacity ≠ day-one surface.

---

## Flow 01 — Build order (one complete flow)

```text
Create Workspace
  → Create Project
  → Tagro structures (draft, human confirms)
  → Invite (optional, prompted)
  → Open Project
```

When this works end-to-end, Festag is already usable.  
Workspace Overview comes **after** real project data exists.

---

## Sprint sequence (product, not pages)

| Sprint | Focus | Status |
|---|---|---|
| 1 | Auth · Onboarding · Festag OS Home | ✅ foundation |
| 2 | Create Workspace | ✅ / harden |
| 3 | Create Project | ⭐ next |
| 4 | Tagro analyzes / drafts structure | ⭐ |
| 5 | Invite members | ⭐ |
| 6 | Project view (role lens) | ⭐ |
| 7 | Workspace Overview (aggregation) | later |

---

## Create Project — pixel-precise flow

### Trigger A — First project (after Workspace Ready)

Workspace wizard ends. **Do not** dump into empty Overview as the primary next step.

```text
Workspace Ready (short)
  → Create your first project
```

Not a step *inside* the workspace wizard (no module picker, no invite gate in Phase 2).  
Immediate **follow-on** surface after Ready — same continuous OS feel.

### Trigger B — Later projects

```text
„Neues Projekt“ → same Create Project surface (openNewProject)
```

### Fields (minimal)

| Field | Required | Notes |
|---|---|---|
| Project name | Yes | e.g. `Airport Website` |
| Description | No | Natural language; Tagro uses it for structure |

CTA: **Create Project** (or Weiter when name ready).

Not a classical multi-step PM wizard. Not a module picker. Not pricing.

This is still **Tagro Intent Intake** in first-project mode:

- Name + optional description = structured intent  
- Later: freestyle one-liner / voice / files remain valid for returning creators  

### After confirm — Tagro prepare (real work only)

Short prepare sequence while **real** draft generation runs (intent-intake).  
No fake multi-second spinner theater.

Honest labels, e.g.:

```text
Understanding your project…
Preparing milestones…
Drafting first tasks…
```

Duration follows work (typically short). Wow = **editable draft**, not animation length.

### Draft (human confirms — always)

Tagro proposes:

- Project summary  
- Milestones (few)  
- First tasks (few — not “23 silent tasks”)  
- Optional next invite prompt  

Human: confirm / edit / discard.  
Nothing durable beyond the empty project shell until confirm (or explicit “create empty”).

### Optional invite step

```text
Invite your client
Invite your team
```

Username or email + role (Client · Developer · …).  
Skippable. Mail hierarchy:

```text
{Name} invited you to collaborate on
{Project}
inside
{Workspace}.
```

Invitee lands in **project**, not Overview.

### Land

Owner path after create (+ optional invite): **open the project**.  
Not Workspace Overview. Not Dashboard.

---

## What the first project view shows (owner vs client)

**Shared graph.** Different lens.

| Surface | Owner / Builder | Client (invitee) |
|---|---|---|
| Status / next steps | Full | Calm, non-technical |
| Decisions | Full | Their decisions |
| Documents | Full | Shared deliverables |
| Tasks | Executable depth | Outcome-safe summary |
| Timeline / roadmap | Yes | Milestone-level only |
| Workspace Overview / Team / Activity | Available | Progressive — not forced on entry |

Tagro greeting (client example):

```text
Welcome Lynn.
Airport Website is currently in Planning.
The next milestone is Homepage Design.
```

---

## Explicit non-goals (for this flow)

- Empty Workspace Overview as post-create destination  
- Fake Tagro loading without draft work  
- Auto-writing dozens of tasks without confirmation  
- Dual Client App / Developer App  
- Module checkboxes in create  
- Building Overview polish before Create Project + Invite + Project view  

---

## Revision of prior decisions (v3.7)

| Prior (v3.6) | Now |
|---|---|
| Workspace Ready → Overview | Ready → Create first project when zero projects |
| First project “opens later” only from Overview CTA | Immediate follow-on after Ready; later via Neues Projekt |
| Overview as day-one workspace home | Overview = aggregation after projects exist; Festag OS Overview remains for **no workspace** |
| Intent Intake = freestyle-only | First-project mode = name + optional description; freestyle remains for later |

Workspace wizard itself still has **no** first-project / invite / module steps inside the slides.

---

## Gate before coding Create Project

1. Domäne: Project on Workspace, knowledge SSOT on Project?  
2. Human confirms Tagro structure?  
3. Land in project after create?  
4. Empty Overview avoided when zero projects?  
5. Invite carries Entry Intent?  
6. Still one platform (role lens, not second product)?  

If “dashboard first” — stop. Build the process.
