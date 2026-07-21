# Festag Adaptive Intelligence

**Self-learning Operational Intelligence System** — product & architecture north star for Festag’s next evolution.

This document is the durable source for the Cursor master architect context
(`.cursor/rules/festag-adaptive-intelligence.mdc`). Read it together with:

- `docs/festag-product-north-star.md` — Delivery Intelligence Platform category
- `docs/leqra-festag-operating-architecture.md` — Leqra intelligence + Festag execution
- `docs/festag-v2-operating-model.md` — V2 operating model

---

## Mission

Festag is not another AI assistant, chatbot, project manager, or automation tool.

Festag is a new category: a **self-learning Operational Intelligence System** for modern organizations.

The system must not only manage work. It must **understand how a company works**, learn the operational DNA of teams, developers, customers, and organizations, and continuously improve execution.

- Every interaction should make Festag smarter.
- Every project should improve the system.
- Every decision should strengthen the company intelligence model.

Long-term: Festag becomes the digital operating system of an organization — understanding how decisions are made, projects are executed, teams communicate, quality is defined, software is produced, and processes improve over time.

Inspiration bar: Apple product philosophy, OpenAI intelligence systems, Anthropic safety/reasoning, Linear product excellence, Cursor DX, Stripe infrastructure, Palantir operational intelligence.

---

## 1. Core product principle

Design Festag as a **living intelligence layer**.

Progression:

```text
Data → Information → Understanding → Prediction → Optimization
```

| Do not only… | Instead… |
|---|---|
| Store events | Extract meaning |
| Record actions | Understand patterns |
| Show status | Predict outcomes |

---

## 2. Operational Knowledge Model (OKM)

The foundation of Festag Adaptive Intelligence.

A continuously evolving representation of:

```text
Company
|
├── People Intelligence
├── Decision Intelligence
├── Communication Intelligence
├── Project Intelligence
├── Workflow Intelligence
├── Technical Intelligence
├── Quality Intelligence
└── Process Intelligence
```

The model is not static. It evolves. Every interaction can create new knowledge.

---

## 3. Company Operational DNA

Every organization has unique patterns. Festag must learn and store them as organizational intelligence.

### Decision DNA

Who decides, decision speed, risk tolerance, prioritization logic, preferred tradeoffs, approval patterns.

Example: “The company usually prefers speed over perfection for MVP products.”

### Communication DNA

Preferred length, technical vs business language, internal vs customer style, preferred reporting format.

Example: CEO prefers short executive summaries; developers prefer technical detail — Tagro adapts automatically.

### Quality DNA

What “finished” means, acceptance criteria, review standards, common rejection reasons, quality expectations.

### Delivery DNA

How projects are built, successful sequences, bottlenecks, dependencies, team structures.

---

## 4. Personal intelligence profiles

AI profiles for important actors — **collaboration intelligence, not surveillance**.

### Customer Intelligence Profile

Communication style, priorities, budget sensitivity, preferred solutions, design preferences, feedback behavior, decision patterns.

Example: prefers minimal design, fast MVP launches, fewer meetings, direct communication → Tagro adapts.

### Developer Intelligence Profile

Technical expertise, preferred technologies, coding patterns, speed, quality, review behavior, documentation habits, strengths and gaps.

Use for intelligent task assignment and context depth — not for punitive scoring.

---

## 5. Self-learning workflow engine

Discover workflows from reality. Do not require users to manually configure everything.

Analyze completed projects, task sequences, delays, approvals, communication, dependencies, and mistakes — then generate improved workflows and default plans.

Example after many SaaS projects: Discovery → Architecture → Backend → API → Frontend → Testing → Deployment.

---

## 6. Adaptive project creation

Replace generic AI planning.

```text
User input
  → Company understanding
  → Historical learning
  → Team capabilities
  → Operational DNA
  → Personalized project system
```

Every project should feel custom-built for that company.

---

## 7. Predictive intelligence

Move from reactive to predictive.

Detect: potential delays, risks, communication problems, scope expansion, resource conflicts, quality issues.

Examples:

- “High delay probability because design approval is missing.”
- “This customer frequently expands scope after first delivery.”
- “This developer needs more context before implementation.”
- “This architecture decision conflicts with previous company standards.”

---

## 8. Continuous improvement loop

```text
Project created
  → Team executes
  → Festag observes
  → AI extracts patterns
  → Knowledge model updates
  → Workflow improves
  → Future projects become better
```

Intelligence compounds over time.

---

## 9. Company Brain

Festag should become the memory and intelligence layer of an organization.

Understands: documents, conversations, decisions, code, tasks, designs, standards, processes, history.

New employees should not start from zero — they inherit organizational intelligence.

---

## 10. Technical architecture requirements

Design for scale:

- Modular architecture
- Event-driven intelligence pipeline
- Knowledge graph architecture
- Embeddings / vector search
- Structured company memory
- AI reasoning layer
- Permission-aware data access

Core components:

```text
Frontend
  → AI Interaction Layer
  → Knowledge Extraction Engine
  → Operational Knowledge Database
  → Prediction Engine
  → Workflow Optimization Engine
  → Company Intelligence Layer
```

---

## 11. AI behavior rules (Tagro)

Tagro must:

- never behave like a generic assistant
- never provide shallow answers
- always consider organizational context
- always explain reasoning
- always search existing company knowledge first
- always improve future decisions when possible

Preferred response structure:

1. Summary  
2. Understanding of context  
3. Organizational impact  
4. Recommendation  
5. Next best action  

---

## 12. Product experience principle

Feel like: *an employee who has worked inside this company for years.*

Not: *a chatbot you ask questions.*

Interface: calm, intelligent, minimal, trustworthy, professional (Apple / Linear / OpenAI bar).

---

## 13. Strategic product positioning

**Never** describe Festag as:

- AI assistant
- chatbot
- project management software
- automation tool

**Describe** Festag as:

- Operational Intelligence Platform
- Company Intelligence Layer
- Self-learning Operating System
- Infrastructure for modern organizations

---

## Final mission

Build Festag into the first system that understands how organizations operate — a system that learns, adapts, improves, and becomes more valuable every day it is used.

The future of enterprise software is not software that people operate.

The future is software that understands operations and continuously improves them.

Build Festag toward that future.

---

## 14. Privacy & Datenschutz (Adaptive Intelligence)

Adaptive Intelligence is **collaboration intelligence inside a workspace**, not employee or customer surveillance.

### Hard rules

1. **Workspace scope** — Operational DNA and OKM facts never leak across unrelated customer workspaces.
2. **No public training** — Festag does not train public foundation models “on your workspace” outside documented processors (see `/datenschutz`).
3. **Personal profiles are opt-in** — Customer/Developer collaboration profiles default **off** (`adaptive_personal_profiles`).
4. **Aggregates first** — Prefer patterns and summaries over raw private message dumps.
5. **User control** — Master switch and sub-toggles live under Settings → Tagro & Klarheit / Datenschutz; export and deletion remain available.
6. **Legal transparency** — Product claims must match `/datenschutz` § Adaptive Intelligence.

### Default settings (product)

| Setting | Default | Notes |
|---|---|---|
| `adaptive_intelligence_enabled` | on | Workspace may use OKM / DNA for Tagro |
| `adaptive_cross_project_patterns` | on | Learn delivery patterns within workspace |
| `adaptive_personal_profiles` | **off** | Explicit opt-in |
| `adaptive_predictions` | on | Predictive hints when master is on |

Implementation reference: `lib/intelligence/okm.ts`, `lib/intelligence/okm-store.ts`,
`lib/intelligence/extract-decision-patterns.ts`.

### Persistence (shipped)

| Piece | Location |
|---|---|
| Table | `okm_facts` (workspace-scoped, RLS via `is_workspace_member`) |
| Upsert / list | `lib/intelligence/okm-store.ts` |
| First extractor | Decisions → Decision / Quality / Delivery DNA on `/decide`, `/delegate`, `/apply` |
| Read API | `GET /api/intelligence/okm?workspaceId=` |
| Tagro read path | `lib/tagro/okm-context.ts` → `buildTagroContext` / Context Sheet / AI chat |

Writes require `adaptive_intelligence_enabled` and `adaptive_cross_project_patterns`.
Claims are aggregated patterns only (type, authority, binary bias, reversibility, resolve volume) —
no free-text answers, names, or emails. Personal `subject_user_id` facts are not written in v1.

Tagro injects up to ~10 highest-confidence facts when Adaptive Intelligence is on
(and skips people/personal facts unless `adaptive_personal_profiles` is opted in).
Context Sheet and task proposals surface a calm UI note when `usedOperationalDna` is true.

Settings → Tagro & Klarheit / Datenschutz list stored claims (`OkmFactsPanel`) and
allow clearing via `DELETE /api/intelligence/okm`. Transparency listing works even
when Workspace-Lernen is off (`includeWhenDisabled=1`).
