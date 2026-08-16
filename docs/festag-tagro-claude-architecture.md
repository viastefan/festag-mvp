# Festag · Tagro · Claude — Architecture Master Prompt

**Status:** locked layer law. Read before touching anything under `lib/tagro/`, `app/api/ai/`,
`app/api/tagro/`, or any code that calls a model provider.

Subordinate to `docs/festag-os-constitution-v1.md` and `docs/festag-product-constitution.md`.
Where an older doc implies "Festag is Claude with a dashboard", **this document wins**.

## 1. The layer law

```
Customer
  ↓
Festag App            product, surfaces, persistence, permissions
  ↓
Tagro                 intelligence & orchestration layer
  ↓
Claude API            reasoning model (replaceable)
  ↓
Festag Project Context + Tools + Data
  ↓
Decision / Structure / Communication / Action
```

| Layer | Role | Owns |
|---|---|---|
| **Festag** | Product / Platform | Workspaces, projects, roles, UI, DB writes, billing |
| **Tagro** | Intelligence / Orchestration | Context assembly, run registry, prompts, normalization, fallbacks, audit |
| **Claude** | Reasoning model | Interpretation of assembled context into a typed intent |
| **Supabase** | Persistent project memory | Project graph, OKM / Operational DNA, `tagro_runs` |
| **GitHub** | Execution evidence | Commits, PRs, activity signals |
| **Developers** | Human execution layer | The actual building |

**Claude is an infrastructure dependency of Tagro — not the product.**
Tagro is the product intelligence. Festag is the product.

## 2. Branding law (non-negotiable)

- The user interacts with **Tagro**. Never with "Claude".
- Never expose "Claude", "Anthropic", "Sonnet", "GPT", or "Gemini" as brand, label,
  badge, tooltip, empty state, loading copy, or user-facing error text.
- Model identifiers may appear only in: env vars, server logs, the `tagro_runs.model`
  audit column, and internal admin/debug surfaces.
- No "Powered by AI" marketing inside the product (see
  `docs/festag-tagro-invisible-intelligence.md`).

## 3. Claude never gets "a chat". It gets assembled context.

Tagro assembles the run context before any provider call. What Claude may receive,
subject to the purpose gate in `lib/tagro/context-builder.ts`:

project · prior communication · decisions · tasks · status · developer activity ·
GitHub signals · deadlines · rules/policies · user role · current phase ·
OKM / Operational DNA (privacy-gated, `lib/tagro/okm-context.ts`)

Rules:

- **Purpose-gated.** Every run declares a `purpose`; context is built for that purpose only.
  Never pass the whole project graph "just in case".
- **Never re-ask known context.** If it is in the graph, inject it — do not prompt the user.
- **Client-safe on the way out.** Anything rendered to a client passes
  `lib/tagro/client-safe-transformer.ts`. No raw model prose to a customer surface.

## 4. The response contract: intent, not opinion

Claude does not answer. It returns a typed Tagro action that Festag executes.

Wrong (prose, unusable):

> "I think the next step would be authentication."

Right (typed intent):

```yaml
intent: create_task
project: X
reason: authentication decision approved
priority: high
task:
  title: Implement Google authentication
  acceptance_criteria:
    - Google OAuth works
    - user session persists
    - logout works
```

In this codebase that contract is expressed as JSON and enforced by the model spine:

| Concern | Anchor |
|---|---|
| Envelopes / contracts | `lib/tagro/model/schemas.ts` |
| Run registry (`runType → prompt, fallback, normalize, okm`) | `lib/tagro/model/runs.ts` |
| Shared preamble + response contract | `lib/tagro/model/prompts/base.ts` |
| Runtime coercion of model output | `lib/tagro/model/normalize.ts` |
| Orchestrator (context → prompt → provider → normalize → audit) | `lib/tagro/run.ts` |
| Vocabulary (task sources, types, group keys) | `lib/tagro/rules.ts` |

Hard rules:

1. **Every run has a deterministic fallback.** No provider, no key, a timeout, or malformed
   JSON must still produce a valid, shippable output. Festag never shows "the AI failed".
2. **Every output is normalized before it leaves the model layer.** Model output is untrusted
   input — coerce, clamp enums to `lib/tagro/rules.ts`, never write it raw to Postgres.
3. **Festag writes the database, not Claude.** The model proposes; Festag persists.
4. **Never Auto Mode on consequential actions.** Confidence over automation — a human confirms
   decisions, scope, budget, and client-facing communication.
5. **Every run is audit-ready** via `tagro_runs` (`saveTagroRun`), including the model id and
   whether Operational DNA was used.

## 5. Provider neutrality

Tagro runs on Claude today and must stay swappable tomorrow.

- Dispatcher: `lib/tagro/openai.ts` (historical filename — it is the **provider dispatcher**,
  not the OpenAI client). Priority: Claude → Gemini → OpenAI → heuristic fallback.
- Providers: `lib/tagro/claude.ts` · `lib/tagro/gemini.ts` · `lib/tagro/openai.ts`.
- Model ids come from env (`TAGRO_CLAUDE_MODEL` / `ANTHROPIC_MODEL`), never hardcoded in
  feature code.
- **No provider SDK types, no `anthropic`-shaped payloads, and no `fetch` to a model endpoint
  outside `lib/tagro/`.** Feature code, routes, and components call the run layer — never a provider.
- Adding a model later is a provider configuration step, not a product-contract rewrite.
- The Claude system prompt is sent with `cache_control: ephemeral` (stable system instruction,
  prompt-cached across calls). Keep per-run system prompts stable; put the variable part in the
  user message.

## 6. Rules for Claude Code working in this repo

**Before writing model-facing code, ask:**

1. Which layer owns this — Festag, Tagro, or the model? No owner → do not build.
2. Is there an existing `runType` for it? Extend the registry before inventing a new path.
3. What is the deterministic fallback? If you cannot name it, the feature is not ready.
4. Does the output go to a client surface? Then it passes the client-safe transformer.
5. Does this write to the DB? Then Festag code writes it, after normalization.

**Never:**

- Add a route that pipes user text straight to a provider and streams prose back to the UI.
- Bypass `lib/tagro/run.ts` for orchestration work "because it is just a small call".
- Trust model JSON without normalization, or persist model output unvalidated.
- Surface model/provider identity to a user.
- Build a chat product. Chat is one surface of Tagro, never the point of it.
- Add an AI feature that increases manual work — the gate is the opposite.

**Always:**

- New intelligence = new `runType` in `lib/tagro/model/runs.ts` with prompt + fallback +
  normalize + OKM mode.
- Keep prompts in `lib/tagro/model/prompts/`, not inline in routes or components.
- Keep enums in sync with `lib/tagro/rules.ts`.
- Assume the model can be swapped, rate-limited, or absent — the product still works.

## 7. One-line summary for any agent

> Festag is the product. Tagro is the intelligence. Claude is a replaceable reasoning
> dependency of Tagro. The user talks to Tagro; Claude returns typed intents; Festag executes them.
