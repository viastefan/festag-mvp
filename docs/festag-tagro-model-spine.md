# Festag Tagro Model Spine

This document describes the API-ready model layer for Tagro / Adaptive Intelligence.

## Purpose

Festag does not use a generic chatbot contract. The model spine turns workspace context,
Operational DNA and user input into typed operational outputs.

The code is intentionally offline-first:

- every registered run has a deterministic fallback
- the output shape is normalized before it leaves the model layer
- OKM / Operational DNA is loaded through the privacy-gated Tagro context path
- runs are audit-ready through `tagro_runs`
- connecting a language model later is a provider configuration step, not a product-contract rewrite

## Core files

| File | Purpose |
|---|---|
| `lib/tagro/model/schemas.ts` | Shared model contracts and envelopes |
| `lib/tagro/model/runs.ts` | Run registry (`runType -> prompt, fallback, normalize, OKM mode`) |
| `lib/tagro/model/normalize.ts` | Runtime coercion for model output |
| `lib/tagro/model/prompts/base.ts` | Shared Tagro preamble and intelligence response contract |
| `lib/tagro/model/prompts/real-world.ts` | Client ↔ Developer operating contract (injected into preamble) |
| `docs/festag-tagro-client-developer-scenarios.md` | Full real-world scenario master prompt (18 scenarios) |
| `lib/tagro/run.ts` | Orchestrator: context -> prompt -> provider/fallback -> normalize -> audit |
| `app/api/tagro/run/route.ts` | Internal generic run endpoint |

## Current registered run

### `task_proposal`

Input:

```json
{
  "title": "Optional short title",
  "description": "Client request or work signal"
}
```

Output:

```json
{
  "client_summary": "",
  "suggested_title": "",
  "suggested_description": "",
  "task_type": "tagro_structured_client_task",
  "priority": "medium",
  "possible_dev_interpretation": "",
  "risks": [],
  "open_questions": [],
  "needs_decision": false,
  "confidence_score": 0.64
}
```

The existing `/api/tagro/task-proposal` route now uses this model spine.

## Generic endpoint

`POST /api/tagro/run`

```json
{
  "runType": "task_proposal",
  "projectId": "project-id",
  "input": {
    "title": "Checkout Text",
    "description": "Bitte im Checkout den Buttontext ändern."
  }
}
```

Response:

```json
{
  "ok": true,
  "runType": "task_proposal",
  "output": {},
  "model": "heuristic",
  "status": "completed",
  "usedOperationalDna": true,
  "operationalDna": []
}
```

## Connecting a language model

The model spine already calls `runOpenAIJson()`, which dispatches through the existing provider chain:

1. `ANTHROPIC_API_KEY`
2. `GEMINI_API_KEY`
3. `OPENAI_API_KEY`
4. deterministic fallback

When no provider key is present, the run still returns a valid typed output with `model: "heuristic"`.

## Adding a new run

1. Add input/output types in `lib/tagro/model/schemas.ts`.
2. Add a fallback and run definition in `lib/tagro/model/runs.ts`.
3. Normalize the output in `lib/tagro/model/normalize.ts`.
4. Register the run in `TAGRO_RUN_REGISTRY`.
5. Use `runTagroModel()` or `POST /api/tagro/run`.

Every run must keep these invariants:

- no project-bound run without access checks
- no output without deterministic fallback
- no raw internal data in client-facing output
- OKM only through the privacy-gated context loader
- model output must be normalized before API response
