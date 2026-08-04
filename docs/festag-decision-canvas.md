# Decision Canvas (Overview)

Festag Overview is not a dashboard. It is a **Decision Canvas**.

## Law

1. The center shows **exactly one** focus — never more.
2. Never more than **one main ink path** at a time.
3. Primary `#5B647D` only for focus, path, selection, status dot.
4. Progress is the path animation — no spinner, no percentage.
5. Accept writes through `POST /api/decisions/:id/decide`.

## Flow

```
Calm (greeting + status + waiting pill)
  → organic ink path grows
  → focus question + options
  → Apple recommendation sheet
  → Explain popup on the path (optional)
  → Accept / Review / later
  → path retracts → calm
```

## Backend

| Piece | Location |
|---|---|
| Domain | `lib/overview/decision-canvas.ts` — match id/label, rank urgency, enrich reasons |
| Overview API | `GET /api/workspaces/overview` — ranked `decisions[]` with options, reasons, explainSteps, needsSuggestion |
| Suggest | `POST /api/decisions/:id/suggest` — recommends; generates + persists options when empty |
| Accept | `POST /api/decisions/:id/decide` via `acceptDecisionRecommendation` (resolves external_id / label) |
| UI | `components/app-shell/WorkspaceOverviewLive.tsx` — calls suggest on activate when needed |

## Matching quirk

`decisions.recommended_option` may be a **client label**, while options use `external_id` (`opt-1`). Matching tries external_id · uuid · client_label · label.

## Mobile

Designed separately: path ~upper 40%, decision center, recommendation as **bottom sheet**. Not a scaled desktop layout.

## Architecture Memory

`overview-tagro-core-interface` · v4.3
