# Tagro Capture Loop

The capture loop turns messy client-while-they-browse feedback into clean,
structured change-scripts the developer can act on without reading a single
PDF. Same pipeline whether the feedback comes from the in-app recorder, the
Chrome extension, or the mobile app.

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │  CLIENT side                                                         │
   │                                                                      │
   │  1. Client opens the staging URL of the project                      │
   │     (sent by the dev as a Tagro link).                               │
   │                                                                      │
   │  2. Client activates Tagro                                           │
   │     • Chrome extension overlay (any URL), OR                         │
   │     • In-app recorder under the project page                         │
   │                                                                      │
   │  3. Client speaks or types feedback while browsing.                  │
   │     Each "capture" = one POST to /api/captures                       │
   │       page_url, page_title, selector?, screenshot_url?,              │
   │       transcript, audio_url?                                         │
   │                                                                      │
   │  4. Tagro structures the transcript                                  │
   │     → tagro_summary + structured_changes[ {title, description,       │
   │       affected, suggested} ]                                         │
   │                                                                      │
   │  5. Client reviews + approves (or edits) in Festag.                  │
   │     status: ready_review → approved                                  │
   └─────────────┬────────────────────────────────────────────────────────┘
                 │  approved (sent_to_dev_at = now)
                 ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │  DEV side                                                            │
   │                                                                      │
   │  6. The capture lands in the dev's Capture Inbox at /dev/captures.   │
   │     Three actions per capture:                                       │
   │       • Accept   → status in_dev (optionally creates a task)         │
   │       • Ask the client a clarifying question                         │
   │           → creates a Decision linked to the capture                 │
   │           → status needs_decision (back to client)                   │
   │       • Reject with a reason                                         │
   │                                                                      │
   │  7. After the dev implements:                                        │
   │       • Mark applied → status applied (audit closed)                 │
   └──────────────────────────────────────────────────────────────────────┘
```

## Data model

`public.client_captures`:

| column              | type        | notes                              |
|---------------------|-------------|------------------------------------|
| id                  | uuid        | pk                                 |
| workspace_id        | uuid        | denormalised from project          |
| project_id          | uuid        |                                    |
| created_by          | uuid        | auth.users(id)                     |
| source              | text enum   | in_app · chrome_extension · mobile |
| page_url            | text        |                                    |
| page_title          | text        |                                    |
| selector            | text        | optional DOM target                |
| screenshot_url      | text        | optional                           |
| transcript          | text        | raw                                |
| audio_url           | text        | optional                           |
| structured_changes  | jsonb       | array, max 6                       |
| tagro_summary       | text        | 1-2 sentences                      |
| warnings            | text[]      | 0-3                                |
| status              | text enum   | see lifecycle below                |
| decision_id         | uuid?       | when dev asks a question           |
| task_id             | uuid?       | when accepted into a task          |
| approved_at         | timestamptz |                                    |
| sent_to_dev_at      | timestamptz |                                    |
| applied_at          | timestamptz |                                    |
| rejection_reason    | text        |                                    |
| created_at          | timestamptz |                                    |
| updated_at          | timestamptz | trigger                            |

Status lifecycle:

```
draft → processing → ready_review → approved → in_dev → applied
                                            ↘ needs_decision ↘
                                                            in_dev
                                            ↘ rejected
```

RLS:
* `read`   — any workspace member
* `insert` — auth.uid() = created_by AND is workspace member
* `update` — any workspace member (workflow transitions need both sides)
* `delete` — only the recorder, only while status='draft'

## API

### `POST /api/captures`
Create a capture. Body:
```json
{
  "projectId": "uuid",
  "pageUrl": "https://staging.example.com/...",
  "pageTitle": "Startseite",
  "selector": "main > section.hero > h1",
  "screenshotUrl": "https://...",
  "transcript": "Mach das Hero-Headline kürzer und tausch das Foto.",
  "audioUrl": "https://...",
  "source": "in_app",
  "process": true
}
```
If `process=true` and transcript present, Tagro is invoked inline and the
returned row already has `structured_changes` filled in.

### `GET /api/captures?projectId=...&status=...`
List captures the caller can see (RLS gates).

### `PATCH /api/captures/[id]`
Body `{ action, ...payload }`. Actions: `approve`, `accept`, `reject`,
`ask_decision`, `apply`, `edit`. See `app/api/captures/[id]/route.ts`.

## UI surfaces

| Surface                          | Status     |
|----------------------------------|------------|
| In-app client recorder           | next slice |
| Client review queue              | next slice |
| Dev Panel inbox (`/dev/captures`)| next slice |
| Chrome extension shell           | later      |
| Mobile recorder                  | later      |

## Chrome extension (later)

Manifest V3 in `/extension/`. Content-script overlays a Tagro mic + chat
button on any URL. On send: capture the active tab URL, `document.title`,
optional `getSelection()` selector, optional `chrome.tabs.captureVisibleTab`
screenshot, and POST to `/api/captures` using a short-lived per-project
token issued by Festag (separate API to ship with the extension).
