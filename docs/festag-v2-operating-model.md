# Festag V2 Operating Model

Festag is an **AI-native Operational Intelligence Platform** — not a project tool,
not a chatbot, not a workspace clone. It is the central truth layer for how an
organization actually runs work.

> Festag connects projects, teams, tasks, communication, decisions, and real
> work activity into a single source of truth, providing leaders, clients, and
> teams with complete visibility, accountability, and understanding of what is
> happening across their organization.

Long-term positioning: what Salesforce became for sales, Festag becomes for
**operational delivery intelligence**.

---

## Organization Model

Every organization in Festag owns:

```text
Organization
├── Teams
├── Members
├── Projects
├── Objectives
├── Tasks
├── Issues
├── Meetings
├── Reports
├── Decisions
├── Activity Feed
├── Connectors
└── AI Intelligence (Tagro)
```

Festag does not replace GitHub, Jira, Linear, Slack, or Notion. It sits above
them and interprets their output into clarity for the right audience.

---

## Role Model & Portals

Each role sees a different surface. Same data, different translation.

| Role | Portal | Sees | Never sees |
|------|--------|------|------------|
| **CEO / Founder** | `/executive` | Progress, risks, objectives at risk, forecast, Tagro executive summary | Tickets, PRs, commit noise |
| **Client** | `/dashboard` (Client Panel) | Status, phase, ETA, deliverables, approvals, calm updates | Technical complexity |
| **Developer** | `/dev/*` | Tasks, issues, PRs, blockers, daily briefing | Client-facing polish layer |
| **Project Owner** | Portal + project controls | All projects, risks, client satisfaction, quality gates | Raw connector internals |
| **Team Lead** | `/teams` | Capacity, workload, velocity, team risks | Unnecessary executive detail |
| **Agency** | White-label client experience | Professional delivery surface under their brand | Competitor tooling |

### CEO Portal (`/executive`)

Dashboard signals:

- Projects active, portfolio health
- Progress %, open issues, open decisions
- **Objectives** active + at risk
- Velocity (7d), delivery forecast
- Tagro AI executive summary (daily report)

### Client Panel (`/dashboard`)

- Overview: status, phase, progress, ETA, active team, recent updates
- Timeline: completed / in progress / upcoming
- Messages: Tagro, team, project owner
- Deliverables: designs, docs, builds, releases
- Reports: daily / weekly / monthly in plain language
- Approvals: approve, reject, request changes
- Meetings: stored + Tagro summary, tasks, decisions

### Developer Portal (`/dev`)

- Today's tasks, upcoming, open issues, PRs, blockers
- My Work: todo → in progress → review → done
- Issues by type: bug, feature, improvement, security, debt, blocker
- GitHub integration: open / merged / pending review
- Daily briefing from Tagro
- Activity feed from commits, PRs, issue updates

### Project Owner

Trust layer — especially important for German agency/client relationships:

- Approve tasks, review reports, control quality
- Monitor client communication
- Delivery forecast across owned projects

### Team Panel (`/teams`)

- Members, capacity, workload, velocity
- Tagro detects: team overloaded, developer blocked, sprint behind

---

## Objectives System

Objectives answer **why work is happening** — OKR-style goals linked to projects
and tasks.

```text
Objective: Launch Mobile App
Target: 31 August
Progress: 72%
Linked tasks: auto-calculated
At risk: target within 14d + progress < 70%
```

**Product surfaces:**

- `/objectives` — create and track objectives
- `/executive` — objectives at risk count
- Tagro — uses objectives for context in reports and interpretations

**Implementation:** `objectives` + `objective_task_links` tables,
`/api/objectives/*`, progress derived from linked task completion.

---

## Decision System

Every meaningful choice is stored with reason, owner, and date.

```text
Decision: Use Stripe
Reason: Fastest implementation
Created by: Product Team
```

CEO question *"Why Stripe?"* → instant answer from `/decisions`.

---

## Activity Intelligence

Festag collects activity from:

- GitHub, Linear, Jira (→ `issues`)
- Slack (→ `work_signals`)
- Manual signals, future: browser extension

Pipeline:

```text
Raw Signal → Tagro Classification → Meaning / Impact / Priority / Risk
           → Unified Activity Feed (/activity)
           → Client translation (when client_visible)
```

**Tagro classification** (`lib/tagro/classify-signal.ts`):

- `meaning`: progress, blocker, risk, decision_needed, …
- `impact`: low → critical
- `client_visible` + `client_translation` for Client Panel
- `suggested_actions`: create task, decision, risk

**Unified feed** (`/api/activity/feed`): merges work_signals, issues, legacy
activity_feed.

---

## Meeting Intelligence

Meetings stored as notes (`note_type = meeting`). Tagro extracts:

- Summary, tasks, risks, decisions, follow-ups

(Full meetings table + calendar sync: future phase.)

---

## Approval Layer

Client approvals on deliverables and scope changes. Surfaced in Client Panel;
owners see pending approvals in project controls.

---

## Notification System

Inbox (`/messages`), activity unread markers, executive daily cron reports.
Tagro synthesizes — does not spam raw connector events.

---

## Universal Command Bar

`Cmd+K` / `Ctrl+K` from anywhere:

- Navigate portals
- Create task, issue, project, objective
- Trigger Tagro with `tagro: …`

---

## Browser Extension (Phase 3)

Universal capture on any website:

- Save to Festag → task, issue, idea, requirement, decision, research
- Smart scraping: Jira bug → suggest risk entry
- Research mode → auto research report

---

## Enterprise Layer (Future)

- Multi-organization: departments, teams, projects
- Audit log: who changed what, when, why
- AI compliance layer: missing approvals, deadline risks, project problems

---

## Tagro — Operational Intelligence Engine

Tagro is **not** a chatbot or generic assistant.

Tagro is the interpreter that understands:

- Projects, teams, communication, decisions, risks, objectives, progress

And translates everything into **clarity** for the right role:

| Audience | Tagro output |
|----------|--------------|
| Client | Calm, non-technical, trustworthy |
| CEO | Portfolio health, risks, forecast |
| Developer | Priorities, blockers, dependencies |
| Owner | Quality, approvals, client satisfaction |

Key modules:

- `lib/tagro/classify-signal.ts` — work signal intelligence
- `lib/tagro/issue-intelligence.ts` — issue portfolio interpretation
- `lib/executive/build-daily-report.ts` — executive summaries

---

## Daily Workflows

| Time | Actor | Festag surface |
|------|-------|----------------|
| Morning | Developer | Dev daily briefing, today's tasks |
| Morning | CEO | Executive daily report (cron + Tagro) |
| During day | Team | Execution panel, issues, signals |
| During day | Client | Timeline updates, approvals |
| End of day | Owner | Review reports, decisions, risks |

---

## Accountability Layer

- Decisions logged with reason
- Objectives linked to tasks (why)
- Issues with severity and delivery impact
- Activity feed with meaning, not noise
- Audit trail (enterprise)

---

## Build Checklist (for agents)

Before shipping a feature, verify:

1. Does it help the **client** understand the project?
2. Does it reduce **manual status** work?
3. Does it create **trust** through status, risks, decisions?
4. Does it avoid becoming a generic PM tool?
5. Does it turn work signals into **delivery intelligence**?
6. Which **portal** shows it — and which roles must never see it?

---

## Current Product Map (implemented)

| Feature | Route | Status |
|---------|-------|--------|
| Executive | `/executive` | ✅ |
| Issues | `/issues` | ✅ |
| Objectives | `/objectives` | ✅ |
| Decisions | `/decisions` | ✅ |
| Activity Intelligence | `/activity` + `/api/activity/*` | ✅ |
| Connectors | `/connectors` | ✅ GitHub, Linear, Jira, Slack |
| Client Panel | `/dashboard` | ✅ |
| Dev Portal | `/dev/*` | ✅ |
| Teams | `/teams` | ✅ partial |
| Browser Extension | — | 🔜 Phase 3 |
| Enterprise audit | — | 🔜 |

**DB migrations required:** run `supabase db push` after pull (includes
`20260624_objectives_system.sql`).
