# Festag OS — Product Constitution v1.0

**Version:** 1.0  
**Status:** Locked foundation for 5–10 years of product evolution  
**Date:** 2026-08-01

This is **not** a feature list.  
This is **not** a sprint.  
This is **not** a 200-page prompt.

This is the document against which **every** Cursor change, database table, integration, and AI capability is judged.

**Stop thinking in features. Think in platform pillars.**

**Code SSOT:** `lib/intelligence/os-constitution.ts`  
**Cursor rule:** `.cursor/rules/festag-os-constitution-v1.mdc`

Supporting law (still binding):

| Doc | Role |
|---|---|
| `docs/festag-product-constitution.md` | One platform · roles · onboarding |
| `docs/festag-architecture-confirmation.md` | Workspace-primary · no dual apps |
| `docs/festag-tagro-superintelligence.md` | Constitution I — layer ownership |
| `docs/festag-tagro-invisible-intelligence.md` | Constitution II — invisible OS feel |
| `docs/festag-production-intelligence.md` | Production pillar reserved |
| `docs/festag-architecture-memory.md` | Why decisions exist |
| Experience / Identity / Auth / Integrations constitutions | Domain detail |

When documents conflict on **OS pillars / intelligence architecture**, **this v1.0 wins**.  
When they conflict on **auth / roles / one-platform product law**, the Product Constitution + Architecture Confirmation win.

---

## 1. Vision

Festag is the **Operating Intelligence System for digital production**.

Not project management software.  
Not an AI chatbot.  
Not an agency tool.  
Not a developer IDE.

Tagro is not a feature.  
Tagro is the intelligence that connects the OS.

**Goal:** Make every connected tool more valuable by understanding relationships between them — without replacing the tools people already love.

---

## 2. Principles

1. **Pillars over features** — If it is not owned by a pillar, do not build it.  
2. **One platform** — Roles and permissions create experiences; never dual products.  
3. **Project is permanent** — Knowledge attaches to projects (under workspaces), not people as SSOT.  
4. **Tagro is invisible** — Users feel understanding, not “AI.”  
5. **Chat is one surface** — Never the product.  
6. **Human decides** — Explain · recommend · confirm. Never Auto Mode. Never silent irreversible acts.  
7. **Never re-ask known context** — The OS remembers.  
8. **No marketing AI** — Intelligence only when it removes complexity or improves decisions.  
9. **Event-driven** — Actions become shared knowledge across pillars.  
10. **Modular activation** — Pillars load only when the workspace needs them (e.g. Production for digital builders).

---

## 3. Architecture — eight platform pillars

These are **not** 30 features. They are the Festag OS.

### Layer 1 — Workspace OS

Accounts · teams · contributors · roles · permissions · workspaces · agencies · companies · clients · developers · modules · invitations · navigation.

**Goal:** The right operating environment, automatically.

### Layer 2 — Project Intelligence

The brain of every project: projects · decisions · architecture · roadmap · goals · documentation · risks · priorities · automatic tasks · analysis · delivery · project state · timeline · dependencies.

**Goal:** Tagro understands the complete project — why it exists and where it goes.

### Layer 3 — Communication Intelligence

Not chat. **Communication.**

Interpretation · language understanding · AI reports · summaries · meeting notes · inbox · client / developer communication · structured auto messages · auto status / daily / weekly / monthly reports.

**Goal:** The user communicates. Tagro structures. Same truth, right language and depth.

### Layer 4 — Production Intelligence

Not Cursor. Not Claude. Not GPT. **Production.**

AI budget · token management · AI / delivery / quality / cost scores · forecast · infrastructure · GitHub · Cursor · Vercel · Supabase · CI/CD · bugs · PRs · reviews · hosting · APIs.

**Goal:** Continuously optimize digital production collaboration. Architecture reserved until implementation phase.

### Layer 5 — Business Intelligence

Quotes · invoices · contracts · PDFs · documents · archive · customers · CRM · capacity · revenue · forecast · profit · AI-assisted office work (offers, invoices, contracts).

**Goal:** Sustainable business. Tagro takes repetitive office work — humans approve.

### Layer 6 — Knowledge Intelligence

Decisions · history · documentation · APIs · components · database · Product Constitution · architecture · memory.

**Goal:** Nothing important is ever forgotten.

### Layer 7 — Tagro Intelligence

Not chat. Not assistant. Not a feature.

**The brain.** Connects every pillar. Orchestrates one event across many systems. Never replaces a pillar.

### Layer 8 — Experience Intelligence

How each person works: timing · language · density · voice · preferences.

Examples: night developer → shift reports; morning CEO → 08:00 briefings; client who skips long text → always short; developer English / CEO German → same information, different presentation.

**Voice Intelligence** lives here (not in chat): voice in/out · audio briefings · meetings · dictate · read-aloud · spoken summaries.

**Goal:** Same information. Differently experienced. Collaboration intelligence — never surveillance. Honor Adaptive Intelligence privacy.

---

## 4. Cross-cutting capabilities (not pillars)

Owned by pillars; never become parallel products.

| Capability | Owner pillar(s) | Rule |
|---|---|---|
| **Smart Writing** (✨ inline everywhere) | Experience + Communication + Business (by surface) | Not a chat. Inline assist for invoices, offers, reports, replies, sprint plans, release notes, contracts, email, meeting notes. |
| **Decision Intelligence** | Project + Knowledge | Every decision: why · alternatives · impact · date · author · AI recommendation. Later: “Why did we build X?” — Tagro knows. |
| **AI Token / Cost Intelligence** | Production | Not a vanity € meter. Project → budget → developer → Cursor/Claude/GitHub → output → quality → delivery → profit → forecast → recommendation. |
| **Digital twin** | Tagro Intelligence (coordinates) | Understanding who/what/why/risks/production/tools/business — not monitoring theater. |

---

## 5. Data model (OS-level)

Conceptual SSOT — tables evolve; ownership does not.

```text
Account
 └── Workspace(s)          ← Workspace OS
      ├── Members / Roles / Modules
      ├── Experience profiles (opt-in personal)
      ├── Knowledge / Memory / Constitutions
      ├── Business objects (quotes, invoices, …)
      ├── Production sources / events / scores
      └── Project(s)       ← Project Intelligence
           ├── Decisions (+ Decision Intelligence)
           ├── Tasks / Risks / Roadmap / Docs
           ├── Communication artifacts
           └── Delivery / integrations (project-scoped)
```

Rules:

- Workspace owns operating context.  
- Project owns delivery knowledge.  
- No duplicate graphs per “portal.”  
- OKM / Architecture Memory feed Knowledge + Tagro Intelligence.  
- Production schema reserved in `lib/intelligence/production/schema.ts`.

---

## 6. Event model

Every meaningful action publishes an event. Pillars react. Tagro Intelligence connects.

Examples: Project Created · Task Completed · Commit Pushed · Deployment Failed · Budget Updated · Invoice Paid · Developer Assigned · Client Commented · Meeting Scheduled · Recommendation Accepted · Decision Recorded · Voice Briefing Played.

Contracts for production toolchain events: `lib/intelligence/production/events.ts`.  
Delivery signals: `work_signals`.

---

## 7. Design rules

- Calm · confident · invisible intelligence (Experience Constitution).  
- No kickers, no page leads under `h1`, no middle-dot meta joins.  
- One design system; tokens only.  
- Intelligence surfaces: inline · summary · risk · forecast · setup — chat optional.  
- Users notice ease, not AI chrome.

---

## 8. AI rules

1. Infer first. Ask second.  
2. Never ask for known OS context.  
3. Recommend with reason · confidence · impact.  
4. Human confirms irreversible actions.  
5. No Auto Mode.  
6. No competing with ChatGPT/Cursor as a chat/IDE product.  
7. Privacy: collaboration intelligence; personal profiles opt-in.  
8. Smart Writing is assistive and inline — not a second Tagro chat app.

---

## 9. Business rules

- Plans, seats, limits, AI budget → Business + Production (budget signals).  
- Office artifacts (quotes, invoices, contracts) → Business Intelligence.  
- Tagro may draft; humans send / sign / charge.  
- Sustainable margins matter — Production Score / forecasts explain **why**.

---

## 10. Extension rules

Before adding anything:

1. **Which pillar owns this?** (exactly one primary)  
2. Does it strengthen the OS — or add a disconnected feature?  
3. Does it duplicate another pillar’s job?  
4. Is activation modular?  
5. Does Constitution II (invisible) still hold?  
6. Update Architecture Memory when the **why** changes.  
7. Prefer extending events + knowledge over new chrome.

If the answer is “cool AI feature without a pillar” — **do not build it.**

---

## 11. What v1.0 deliberately does not schedule

No dates for shipping Production dashboards, Voice productization, Token Management UI, or Smart Writing rollout.

Those are **pillar evolutions**, opened as milestones when ready — always under this constitution.

---

## Final line

Festag becomes a **platform** when every change strengthens these pillars.

Not when it ships another feature.
