# Festag — Tagro Superintelligence

**Product constitution.** Strategic blueprint for the Operating Intelligence System.

This is **not** a feature request, sprint, or UI task.

Every future feature, component, table, integration, and AI capability must follow this document. If it violates it — stop and redesign.

**Companion:** Constitution II — how Tagro feels and interacts → `docs/festag-tagro-invisible-intelligence.md`

**Code SSOT:** `lib/intelligence/superintelligence.ts`  
**Cursor rule:** `.cursor/rules/festag-tagro-superintelligence.mdc`

Supreme with: Product Constitution · Architecture Confirmation · Adaptive Intelligence · Experience · Identity · Architecture Memory.

Pillar reservations (architecture only until each milestone opens):

- Production → `docs/festag-production-intelligence.md`

---

## Core philosophy

Festag is **not**:

- a project management tool  
- an AI chatbot  
- an agency platform  
- another developer tool  

Festag **is** an Operating System for digital production.

Tagro is **not** one feature inside Festag.  
Tagro **is** the intelligence layer connecting everything.

## The Tagro model

Tagro should never be viewed as a chatbot.  
Tagro should never compete with ChatGPT, Cursor, or Claude.

Instead, Tagro:

- understands  
- connects  
- remembers  
- predicts  
- explains  
- recommends  
- orchestrates  

**Humans always remain in control.**

## Intelligence layers

Tagro consists of multiple **independent** intelligence systems.  
Each solves one problem. **No system overlaps another.**

### 1. Workspace Intelligence

Understands: users, permissions, teams, workspaces, roles, navigation, modules, invitations, workspace evolution.

**Goal:** Create the right workspace automatically.

### 2. Project Intelligence

Understands: requirements, ideas, architecture, roadmaps, milestones, dependencies, risks, decisions, project history.

**Goal:** Understand why projects exist and where they are going.

### 3. Communication Intelligence

Understands: languages, context, tone, stakeholders, technical / business / client language.

**Goal:** Every participant understands the same information in their own language and level of expertise.

Not translation. **Interpretation.**

### 4. Production Intelligence

Understands: development, AI, infrastructure, delivery, costs, deployments, automation, code, reviews, quality, hosting, budgets.

**Goal:** Continuously optimize digital production.

Never replace developers. Never replace AI. Optimize the **collaboration**.

### 5. Business Intelligence

Understands: revenue, invoices, margins, subscriptions, customers, forecasts, capacity, growth.

**Goal:** Help companies build sustainable businesses.

### 6. Knowledge Intelligence

Understands: architecture, documentation, decisions, database, API structure, business rules, vision, history.

**Goal:** Nothing important is ever forgotten.

## Tagro Superintelligence

Tagro Superintelligence sits **above** all intelligence layers.

It never replaces them. It **coordinates** them. It understands relationships between them.

Example — a deployment fails:

| Layer | Role |
|---|---|
| Production Intelligence | Detects the issue |
| Project Intelligence | Knows which milestone is affected |
| Communication Intelligence | Creates a customer-friendly explanation |
| Business Intelligence | Calculates financial impact |
| Knowledge Intelligence | Stores the decision |
| Workspace Intelligence | Notifies the correct people |

One event. Many intelligence systems. Superintelligence connects the graph.

## Event-driven architecture

Every connected system should publish events into one unified stream. Tagro listens, understands, connects.

Examples:

| System | Events |
|---|---|
| GitHub | Commit, PR opened, review approved, deployment failed |
| Stripe | Invoice paid, subscription changed |
| Cursor | AI session, agent run, suggestion accepted, prompt created |
| Supabase | Migration, new user, database error |
| Vercel | Deployment, rollback, build failure |
| Slack | Message, mention, channel created |

Production event contracts live in `lib/intelligence/production/events.ts` (reserved). Delivery signals remain in `work_signals`. Superintelligence owns the **orchestration** across both.

## No Auto Mode

Never build Tagro as “Auto Mode.”

Tagro does not silently take over work.

Tagro explains. Tagro predicts. Tagro recommends.  
Humans approve. Humans remain responsible.

## Production health (insight shape)

Production Intelligence should not display raw numbers as the product.

It should answer questions:

- Is the project healthy?  
- Will the budget be exceeded?  
- Which workflow is inefficient?  
- Where are AI costs increasing?  
- Which deployment introduced instability?  
- Which project has the highest delivery risk?  

Every insight includes:

1. **Reason**  
2. **Confidence**  
3. **Recommendation**  
4. **Potential impact**  

## Long-term product rule

Whenever a new feature is proposed, ask:

> **Which intelligence layer owns this?**

If no clear owner exists — **do not build it.**

Avoid duplicated logic, duplicated AI, and duplicated recommendations.

## Design principle

Intelligence should feel **invisible**.

Users should feel: “This platform understands my work.”  
Not: “This platform is showing me AI.”

AI is infrastructure. Not the product.

**Full interaction law:** `docs/festag-tagro-invisible-intelligence.md` (Constitution II).

## Final vision

The goal is not to build the smartest AI.  
The goal is to build the **smartest production system**.

Every connected tool becomes more valuable because Tagro understands relationships between them.  
Every project more predictable. Every team more coordinated. Every customer more transparent. Every developer more focused.

Festag becomes the operating intelligence layer above the modern software stack — not replacing the tools people love, making them work together as one intelligent system.

## Implementation gate

Before shipping any intelligence-related work:

1. Which layer owns this? (must be exactly one)  
2. Does Superintelligence only coordinate — not swallow the layer?  
3. Event in / event out clear?  
4. Human decides — no Auto Mode?  
5. Insight has reason · confidence · recommendation · impact (when surfacing intelligence)?  
6. Feels invisible — not “AI theater”?  

If “generic AI feature with no owner layer” — redesign against this constitution.
