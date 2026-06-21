# Tagro → Cursor Cloud Agent Worker

Festag strukturiert Arbeit mit **Tagro** (Claude/Gemini). Für **Code-Umsetzung** sendet der Dev-Worker Tasks an **Cursor Cloud Agents** — getrennte Schichten, ein Flow.

```text
Tagro (Interpretation)  →  Task in Festag  →  Cursor Agent (Implementation)
        ↑                                              ↓
   Client sieht                              PR / Branch / Activity-Log
   Übersetzung
```

## Setup

### 1. Cursor API Key

1. [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations) → API Key erstellen
2. Lokal in `.env.local`, Production in **Vercel Environment Variables**:

```bash
CURSOR_API_KEY=cursor_...
CURSOR_AGENT_MODEL=composer-2.5   # optional
```

### 2. Repository

Pro Projekt: GitHub-Repo unter `/dev/github` verknüpfen.

Oder globaler Fallback:

```bash
FESTAG_CURSOR_DEFAULT_REPO_URL=https://github.com/org/repo
FESTAG_CURSOR_DEFAULT_REPO_REF=main
```

### 3. Migration

```bash
npm run db:push
```

Tabelle: `cursor_agent_jobs`

### 4. Health Check

```bash
curl -s http://localhost:3000/api/cursor/health
```

## Nutzung (Dev Panel)

1. `/dev/tasks` → Task öffnen
2. Abschnitt **Cursor Execution** → **An Cursor Agent senden**
3. Festag baut Prompt aus Task + Tagro-Kontext, startet Cloud Agent, optional PR
4. Link **Agent in Cursor öffnen** → Live-Status in Cursor

## API

| Route | Zweck |
|-------|--------|
| `POST /api/cursor/enqueue` | `{ taskId, autoCreatePR?, dispatch? }` |
| `POST /api/cursor/dispatch` | `{ jobId }` — queued starten oder running pollen |
| `GET /api/cursor/jobs?taskId=` | Jobs für Task |
| `GET /api/cursor/health` | Key konfiguriert? |
| `GET /api/cron/cursor-worker` | Cron: queued dispatchen + running pollen |

## Cron (Vercel)

`vercel.json` — **täglich** um 16:00 UTC `/api/cron/cursor-worker` (Hobby erlaubt kein `*/10`). Sofort-Dispatch passiert ohnehin bei `POST /api/cursor/enqueue`.

## Architektur-Regel

> Tagro erklärt **warum** der Task existiert.  
> Cursor führt **was im Code** geändert werden muss aus.  
> Festag verbindet beides über `cursor_agent_jobs` + `task_activity_logs`.

## Tagro AI (Chat) vs Cursor Worker

| | Tagro (`ANTHROPIC_API_KEY`) | Cursor Worker (`CURSOR_API_KEY`) |
|---|---|---|
| Zweck | Interpretation, Briefings, Struktur | Repo-Implementation, PRs |
| Endpoint | `/api/ai/chat`, `/api/tagro/*` | `/api/cursor/*` |
| Laufzeit | Sekunden | Minuten (Cloud VM) |

Beide Keys unabhängig setzen.
