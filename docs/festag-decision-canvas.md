# Workspace Board (Overview)

Festag Overview is a **Software Production Operating System** surface — not a dashboard.

## Law

1. Show me only what deserves my attention.
2. Level 1 answers **WHERE ARE WE?** (knowledge constellation).
3. Level 2 answers **WHY ARE WE HERE?** (project decision path).
4. Navigation is a **camera**, not page switches.
5. Tagro is never the hero — the decision is.
6. Primary `#5B647D` only for focus / active path / recommendation.
7. Paper `#F8F6F2`. Aeonik. Whitespace first.

## Levels

```
Workspace Board (constellation)
  → click project / decision node
  → camera flies in
  → Project View (path + one focus + inspector)
  → accept recommendation
  → path continues / back to board
```

## Backend

| Piece | Location |
|---|---|
| Board model | `lib/overview/workspace-board.ts` |
| Decision domain | `lib/overview/decision-canvas.ts` |
| Overview API | `GET /api/workspaces/overview` |
| Suggest / Accept | `/api/decisions/:id/suggest` · `/decide` |
| UI | `components/app-shell/WorkspaceBoard.tsx` |

## Mobile

Designed independently: gesture canvas, vertical path, recommendation as bottom sheet.

## Architecture Memory

`overview-tagro-core-interface` · v5.0
