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
| Domain | `lib/overview/decision-canvas.ts` |
| Overview API | `GET /api/workspaces/overview` — rich `decisions[]` with options, reasons, explainSteps |
| Accept | `POST /api/decisions/:id/decide` via `acceptDecisionRecommendation` |
| UI | `components/app-shell/WorkspaceOverviewLive.tsx` |

## Mobile

Designed separately: path ~upper 40%, decision center, recommendation as **bottom sheet**. Not a scaled desktop layout.

## Architecture Memory

`overview-tagro-core-interface` · v4.2
