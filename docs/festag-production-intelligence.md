# Festag Production Intelligence

**Architecture milestone — reserved, not implemented.**

**Code:** `lib/intelligence/production/`  
**Module id:** `production` (`lib/platform/workspace-personalization.ts`)  
**Cursor rule:** `.cursor/rules/festag-production-intelligence.mdc`

Supreme with: Product Constitution · Adaptive Intelligence · Architecture Memory · Tagro Real-World Scenarios.

---

## Positioning

Production Intelligence is **not**:

- another AI chatbot  
- another dashboard  
- token tracking as the product  

Production Intelligence **is** the operational intelligence layer for **digital production**.

It observes, connects, and optimizes the complete production workflow across tools — without replacing those tools.

```text
Cursor · Claude · OpenAI · Gemini · GitHub · GitLab · Supabase · Postgres
Vercel · Cloudflare · Docker · Stripe · Linear · Jira · Slack · Discord
Figma · Google Workspace · Notion · Analytics · Monitoring · Deploy · Hosting
→ unified production intelligence graph
```

Festag never becomes those tools. It understands **relationships** between them.

## Tagro Superintelligence (equal pillars)

Production Intelligence is **one** layer of Tagro Superintelligence. None dominates.

**Supreme blueprint:** `docs/festag-tagro-superintelligence.md`

| Layer | Responsibility |
|---|---|
| Workspace Intelligence | How this workspace works · adaptive modules · context |
| Project Intelligence | Delivery graph · tasks · decisions · status · risks |
| Communication Intelligence | Tone · audiences · reporting · client ↔ developer mediation |
| Knowledge Intelligence | Company Brain · docs · memory · retrieval |
| Business Intelligence | Plans · budgets · seats · commercial health |
| **Production Intelligence** | Digital production workflow · efficiency · bottlenecks · score |

Superintelligence coordinates relationships between layers — it does not replace them.
Together: **Festag Operating Intelligence Layer**.

## Human decides — never Auto Mode

Tagro may **recommend**. Humans always decide.

Festag must **never** become Cursor-style Auto Mode.

| Cursor | Festag |
|---|---|
| Optimizes prompts | Optimizes **production** |
| Agent may act in the IDE | Tagro surfaces calm recommendations |

No automatic one-way-door decisions (budget cuts, model switches, deploys, scope drops) without human confirmation.

## Questions it should answer (eventually)

Operational recommendations — never silent actions:

- Is the project healthy?  
- Will it stay within budget?  
- Which AI model is currently most efficient *for this workspace*?  
- Which workflow causes unnecessary costs?  
- Where is delivery slowing down?  
- Which developer workflow could improve?  
- Which AI conversations generate the highest value?  
- Where are repetitive prompts appearing?  
- Which integrations are unused?  
- Which production bottlenecks exist?  

## Production Score (future)

One overall score from **multiple signals**, always with **why it changed**:

- AI Efficiency  
- Developer Efficiency  
- Budget Health  
- Delivery Health  
- Code Quality  
- Review Quality  
- Automation  
- Communication  
- Project Health  
- Infrastructure Health  

Never a meaningless number. Every delta needs an explainable cause chain.

## Modularity (hard rule)

- Workspaces **without** digital production **must not** load this module.  
- Activation is dynamic via workspace personalization (`production` module id).  
- No route, nav item, or dashboard chrome ships until the implementation phase.  
- Interfaces and schema live in `lib/intelligence/production/` so future work has a clear foundation.

Eligibility (reserved logic): digital product signals — software/agency/startup product delivery, developer-heavy context, or production integrations (GitHub, GitLab, Vercel, …). Marketing-only / non-software workspaces stay inactive.

## Event model (reserved)

Integrations emit **production events** into a workspace/project-scoped graph. Tagro classifies meaning; Production Intelligence aggregates patterns.

Canonical event families (see `lib/intelligence/production/events.ts`):

| Family | Example sources |
|---|---|
| `ai_usage` | OpenAI, Claude, Gemini, Cursor |
| `scm` | GitHub, GitLab (PR, commit, review, CI) |
| `deploy` | Vercel, Cloudflare, Docker |
| `data` | Supabase, Postgres |
| `design` | Figma |
| `tracker` | Linear, Jira |
| `comms` | Slack, Discord |
| `billing` | Stripe |
| `knowledge` | Notion, Google Workspace |
| `observability` | Analytics, monitoring |

These complement — do not replace — `work_signals` (project delivery signals). Production events are the **cost / efficiency / toolchain** twin.

## Database relationships (reserved — not migrated)

Proposed tables (design only; **do not apply** until implementation):

| Table | Role |
|---|---|
| `production_sources` | Connected production systems per workspace |
| `production_events` | Append-only events from sources |
| `production_snapshots` | Periodic aggregates per project/workspace |
| `production_scores` | Score + factor breakdown + explainability |
| `production_recommendations` | Tagro recommendations awaiting human decision |

Relationships:

```text
workspaces 1—* production_sources
workspaces 1—* production_events (* optionally project_id)
projects 1—* production_snapshots
workspaces|projects 1—* production_scores
production_scores 1—* explanation factors
production_recommendations → optional event/score refs
```

RLS: workspace-scoped; never cross-tenant. Respect `adaptive_intelligence_enabled`.

Detail: `lib/intelligence/production/schema.ts`.

## Implementation gate

Before any UI, metering, or analytics ship:

1. Is this **operational production intelligence** — or token vanity / another dashboard?  
2. Does activation stay modular (eligible workspaces only)?  
3. Does Tagro only **recommend** (human decides)?  
4. Does Production Score explain **why**?  
5. Is it one equal Superintelligence layer — not the center of Festag?  
6. Are events/schema using the reserved interfaces?  
7. Does `docs/festag-tagro-superintelligence.md` still hold (owner layer clear)?

If “chatbot dashboard for tokens” — stop and redesign against this doc.
