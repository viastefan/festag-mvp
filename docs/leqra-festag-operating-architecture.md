# Leqra + Festag Operating Architecture

Leqra and Festag are **not two separate products**. They are **two layers of the
same operating logic**:

| Layer | Role | One-liner |
|-------|------|-----------|
| **Leqra** | Intelligence Layer (brain / system of truth) | Thinks, models, decides |
| **Festag** | Execution Layer (delivery / control / output) | Acts, steers, delivers |

> **Leqra denkt – Festag handelt.**

Leqra builds structure from data, context, knowledge, and processes.
Festag turns that structure into operational reality — teams, clients, agency
products, and client-facing clarity.

---

## Architecture (top level)

```text
              LEQRA
      (Intelligence Core)
              │
    ┌─────────┼─────────┐
    │         │         │
 Delivery   Teams    Agency
 (Festag Runtime Layer)
```

Festag’s three workspace modes are **go-to-market surfaces** on top of Leqra
data and logic — not three different brains.

---

## 1. Leqra — Operating Intelligence

Leqra is the central intelligence engine:

- Knowledge base + decision logic
- Process understanding (what happens when, why, dependencies)
- Organizational context (hotels, SaaS, agencies, portfolios)
- **Single source of operational truth**

Everything operational gets modeled here: prices, guests, projects, leads, tasks,
systems, risks, decisions, and outcomes.

In the Festag codebase today, this layer is **partially embodied** as:

- **Tagro** — interpretation, briefings, executive summaries, decision support
- **Signal ingestion** — connectors, activity, issues, objectives linkage
- **Decision + objective models** — structured truth, not chat history

Leqra is the **engine**. End users should rarely see the name “Leqra” — they see
Festag surfaces that consume Leqra-grade intelligence.

---

## 2. Festag — Execution Layer

Festag consumes Leqra intelligence and produces **output** in three modes.

### Mode 1: Delivery (`workspace.mode = 'delivery'`)

Automated and semi-automated execution of operational work:

- Reports and status artifacts
- Actions (pricing, alerts, notifications, client updates)
- AI briefings (Tagro → text / voice)

**Leqra says what is true. Festag makes what happens.**

Primary surfaces: client portal, `/dashboard`, reports, deliverables, Tagro
actions that write back to project state.

### Mode 2: Teams (`workspace.mode = 'team'`)

Human operations — priorities, roles, accountability:

| Leqra supplies | Festag supplies |
|--------------|-----------------|
| Priorities | Task assignment |
| Context per unit of work | Live operations views |
| Decisions + recommendations | Feedback loop (done / not done) |

**AI operations manager for real teams.**

Primary surfaces: `/teams`, tasks, dev panel, activity, meetings.

### Mode 3: Agency / Whitelabel (`workspace.mode = 'agency'`)

Festag becomes a **product others sell**. Leqra stays in the backend as the
brain engine.

- Agencies ship branded delivery intelligence
- Hotels and enterprises get their own Festag system
- All modes share Leqra logic; UI and brand differ

This is the **scale and revenue multiplier** — platform business, not single-tenant SaaS only.

---

## 3. Mapping to Festag repo concepts

| Concept | Layer | Repo anchor |
|---------|-------|-------------|
| Tagro | Leqra → Festag bridge | `lib/tagro/*`, `/api/ai/chat`, Tagro overlay |
| Veyra | Client interpreter (Festag-facing) | Project/client clarity, not raw ops |
| Dev Panel | Festag execution (Teams) | `/dev/*`, tasks, issues, GitHub |
| Client Portal | Festag execution (Delivery) | `/dashboard`, reports, approvals |
| Executive | Festag output (Delivery + leadership) | `/executive`, portfolio signals |
| Cursor worker | External execution hook | Tagro/dev tasks → Cursor Cloud Agent |
| Workspace modes | GTM runtime selector | `delivery` / `team` / `agency` in portal |

Festag **does not** replace Jira, Linear, GitHub, Slack, or Notion. It sits
above them. Leqra models what those systems mean; Festag presents and acts on
that meaning for the right audience.

---

## 4. Positioning

**English (product / investor):**

> Leqra is the intelligence layer for operational systems.
> Festag is the execution layer that turns intelligence into action across
> teams, delivery, and white-label platforms.

**German (internal):**

> Leqra ist die unsichtbare Engine. Festag ist das sichtbare Produkt.
> Der Agency-Modus macht daraus ein Plattformgeschäft.

You are not building two products. You are building **one system with three
monetization surfaces**.

---

## 5. Design rules when extending the stack

Before adding a feature, ask:

1. Does this belong in **Leqra** (model, interpret, decide) or **Festag**
   (surface, assign, deliver, brand)?
2. Which **mode** is the primary buyer/user — Delivery, Teams, or Agency?
3. Does this reduce manual status work and increase client trust?
4. Does this avoid becoming a generic PM tool, wiki, or chat playground?

See also:

- `docs/festag-product-north-star.md` — product promise and anti-patterns
- `docs/festag-v2-operating-model.md` — organization model, roles, Tagro principles
- `docs/cursor-tagro-worker.md` — Tagro → Cursor execution bridge

---

## 6. Future implementation notes (not yet in repo)

These are architectural targets, not current code:

- Explicit **Leqra API** boundary (context graph, decision graph, process templates)
- Shared **workspace intelligence profile** consumed by all three Festag modes
- Agency **tenant isolation** with one Leqra core per org cluster
- End-customer UI never exposes “Leqra” — only Festag (or white-label name)

Until that boundary exists in code, treat **Tagro + structured entities**
(decisions, objectives, issues, activity) as the practical intelligence core
inside Festag.
