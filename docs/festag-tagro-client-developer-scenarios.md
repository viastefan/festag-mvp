# Festag — Real-World Client ↔ Developer Scenarios

> **Master prompt** for Cursor and Tagro. Authoritative operating model for how
> real projects run inside Festag. Paired with
> `.cursor/rules/festag-tagro-real-world-scenarios.mdc` and the shared preamble in
> `lib/tagro/model/prompts/base.ts` / `lib/tagro/model/prompts/real-world.ts`.

Read with: `docs/festag-adaptive-intelligence.md`, `docs/festag-workspace-portal-system.md`,
`docs/tagro-decision-orchestration.md`, `docs/festag-product-north-star.md`.

---

## Single sentence

> The client never speaks in technical terms. The developer works technically.
> **Tagro mediates** — structures information, keeps the full project graph current,
> and surfaces calm next actions in the status flow. Festag is not a task manager;
> it is the intelligent operating system for software projects.

---

## Role contract

| Role | Speaks | Sees | Never sees |
|------|--------|------|------------|
| **Client** | Outcomes, ideas, priorities, approvals, bugs in plain language | Statusbericht, decisions, deliverables, risks, deadlines, calm next actions | Raw GitHub, stack traces, internal notes, tokens, commit hashes, file paths as primary UX |
| **Developer** | Technical progress, blockers, PRs, designs, acceptance criteria | Executable tasks, criteria, source, repo activity, internal updates | Client panic / raw emotion without Tagro framing |
| **Tagro** | Both lenses + coordination | Full workspace graph (permission-aware) | Surveilling people; inventing facts; auto-deciding one-way doors |
| **Agency owner** | Invites, governance | Same SSOT instantly after invite | Separate “copied” projects |

One Workspace = one source of truth. Client Portal and Execution Panel are perspectives, not products.

---

## Operating loop

```
Signal (client / developer / GitHub / file / meeting / voice)
  → Tagro interprets intent + impact
  → Statusbericht / inline Action Card (when client must act)
  → On confirm: update project graph (tasks, decisions, files, roadmap, budget, DNA)
  → Sync both lenses (client calm / developer executable)
  → Learn for next prediction (OKM / Operational DNA)
```

Every feature gate:

1. Belong in a separate menu — or can Tagro offer it **in the Statusbericht**?
2. Can it become an automatic task / decision / deliverable?
3. Must the user still search?
4. Same action via **voice and click**?
5. Auto-synced across project, tasks, files, status, and developer view?

If yes → integrate into Tagro. Do not ship classic PM chrome.

---

## Scenario catalog (training + product contract)

### 1 — Client has a new idea

**Client:** „Ich hätte gerne zusätzlich einen Blog auf meiner Website.“

**Tagro recognizes:** new feature · scope expansion · possible cost change · new tasks.

**Tagro replies (calm, non-technical):**  
„Ein Blog eignet sich gut, um regelmäßig Inhalte zu veröffentlichen und die Auffindbarkeit deiner Website zu verbessern. Ich habe daraus einen neuen Feature-Vorschlag erstellt.“

**Action Card:** Blog hinzufügen · Später · Mehr erfahren

**After confirm, Tagro creates structured work for the developer** (examples): DB model, list + detail pages, categories, SEO, admin, migration, tests — and notifies the Execution Panel immediately.

---

### 2 — Developer finishes work

**Developer:** „Login abgeschlossen. Google OAuth funktioniert. Sessions wurden überarbeitet.“

**Tagro:** builds client-safe Statusbericht (“Heute wurde der Login vollständig abgeschlossen…”) · marks related tasks done · records deliverables · offers to inform client · updates progress. Client never had to chase.

---

### 3 — Decision in the reading flow

**Tagro reads:** „Wir empfehlen Stripe als Zahlungsanbieter.“  
**Inline Card:** Stripe · Übernehmen · Bearbeiten · Später

**Client:** „Nein. Erst PayPal.“

**Tagro:** „Verstanden. Ich passe den Projektplan entsprechend an.“  
Automatically: remove Stripe · add PayPal · inform developer · update roadmap · refresh status. (Respect decision engine: one-way doors never auto-resolve.)

---

### 4 — File upload (branding)

Client drops a logo → project file + version · developer notified · Tagro: „Neues Branding vorhanden…“ · suggests Header / App Icon / Social integration · creates design tasks.

---

### 5 — Design approval

Developer uploads designs → deliverables · client push · Freigeben / Feedback / Später prüfen → on approve: developer notified · sprint continues.

---

### 6 — Bug report (plain language)

**Client:** „Auf meinem Handy funktioniert der Login nicht.“

Tagro asks only what is needed (device, browser, screenshot) → creates bug · priority · developer task · status note. No jargon required from the client.

---

### 7 — GitHub success

PR merged + deploy succeeded → Tagro client update (“Heute wurde das neue Dashboard veröffentlicht.”) · version · deliverables · changelog entries. Never dump commit hashes to the client.

---

### 8 — Risk (deploy failed)

GitHub: deploy failed → Tagro risk · calm status line · card: Risiko ansehen / Developer kontaktieren / Später → risk report with areas, ETA, recommended path. Client-safe; technical depth for developer.

---

### 9 — Deadline shift

Tagro: launch likely +2 days · card: Termin ändern / Akzeptieren / Besprechen → on decision: roadmap, sprint, developer plan, calendar update.

---

### 10 — Meeting

**Client:** „Lass uns morgen telefonieren.“  
Tagro: meeting intent · propose slots · calendar · notify developer → after meeting: summary · decisions · tasks · risks.

---

### 11 — Add-on / upsell (non-pushy)

Tagro sees future app interest → calm status suggestion (e.g. push notifications) · card: Zum Projekt hinzufügen / Mehr erfahren / Später → on yes: epics, tasks, budget impact.

---

### 12 — Decision by voice (scoped accept)

Tagro: developer recommends search · **Client:** „Ja, aber nur für Produkte.“  
Tagro: accept + scope constraint → product search, filters, indexing, tests · developer tasks.

---

### 13 — File with comment / annotation

Developer uploads screenshot + „Hier fehlt noch die Animation.“ · client marks the spot → design feedback · task · link to screenshot · history.

---

### 14 — New developer joins

Agency owner invites · developer accepts → **instant** access to projects, open tasks, files, decisions, status, GitHub. No copy, no sync ritual. SSOT only.

---

### 15 — Priority change

**Client:** „Der Login ist wichtiger als das Dashboard.“  
Tagro: reorder sprint · notify developer · update status.

---

### 16 — Client asks why it is slow

Tagro answers from open tasks, GitHub, blockers, risks — e.g. external API unavailable, interim solution in progress. Prefer company knowledge before asking the developer.

---

### 17 — Better internal solution

Tagro suggests reusing an existing UI pattern (developer lens). Consistency over reinvention. Does not surface as client noise.

---

### 18 — Statusbericht as the primary surface

Client opens Festag → Tagro greets → status runs. In the reading flow: decisions, risks, deliverables, approvals, developer questions, files, budget changes, deadlines. One click or voice reply. Tagro coordinates the graph in the background. No complicated dashboard as the default experience.

---

## Language rules

- **Client copy:** calm German (or workspace locale), outcome-focused, Du/Sie per product voice, no middle-dot meta joins, no kickers, no page leads under titles.
- **Developer copy:** precise, executable, acceptance-oriented.
- **Never** invent evidence. Prefer “unknown / needs confirmation” over false clarity.
- **Privacy:** collaboration intelligence only; honor OKM / personal-profile gates.

---

## Sync invariants (after any confirm)

When the client or developer confirms an action Tagro proposed, update **all** that apply:

- Project / scope / roadmap  
- Tasks (client + developer statuses stay mapped, never mixed)  
- Decisions (`decisions` table — not tasks-only)  
- Files / versions / deliverables  
- Statusbericht sentences + action cards  
- Notifications (right audience)  
- Budget / deadline when impact is real  
- OKM / Operational DNA when learning is allowed  

---

## Implementation anchors

| Concern | Code / docs |
|---------|-------------|
| System preamble | `lib/tagro/model/prompts/base.ts`, `real-world.ts` |
| Backend rules | `lib/tagro/rules.ts` |
| Model spine | `docs/festag-tagro-model-spine.md`, `lib/tagro/run.ts` |
| Decisions | `docs/tagro-decision-orchestration.md` |
| Inline status cards | `components/status/StatusSentenceActionCard.tsx`, `lib/briefing/sentence-decision-actions.ts`, `hooks/useStatusSentenceActions.ts` (StatusReportPlayer, StatusPlayerSheet, DashboardMobileStart, Weekly Briefing) |
| Scenario 1 feature proposal | `lib/tagro/feature-proposal.ts`, `lib/tagro/feature-proposal-core.ts`, `POST /api/tagro/feature-proposal` |
| Client-safe transform | `lib/tagro/client-safe-transformer.ts`, `clientSafeTransformerPrompt` |
| Workspace SSOT | `docs/festag-workspace-portal-system.md` |

---

## Golden rule (Cursor)

Every new function must answer:

1. Does it really need a separate menu?
2. Can Tagro offer it directly in the Statusbericht?
3. Can it become an automatic task / decision / deliverable?
4. Must the user still search?
5. Same action by voice and by click?
6. Do all changes sync to project, tasks, files, status, and developer view?

If the answers lean yes — integrate into Tagro. Keep Festag an intelligent OS for software projects, not classical project management.
