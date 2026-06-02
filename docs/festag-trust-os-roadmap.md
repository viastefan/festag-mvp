# Festag — Trust OS roadmap (master addon)

> Festag = **The Trust Operating System for digital project delivery** — the AI
> control layer for client projects. Add, improve, connect — **do not randomly
> rebuild**. Preserve existing correct logic; extend in the existing system
> style; ship in phases; never break working features.

Companion to [festag-product-architecture.md](festag-product-architecture.md)
(north star) and the feature specs (documents/clients, cms, email/workspace).
This file captures the large strategic addon so nothing is lost.

Core loop (every change must strengthen it):
client goal/decision → **Tagro** structures → tasks → **Dev/Execution Panel** →
work done → **Evidence** → **ProofGrid** stores proof → **Nexora** checks
risk/readiness → **Tagro Queue** updates reports → **Client Panel** shows clear
status → client approves → project continues.

Naming: **Tagro** (AI), **ProofGrid** (evidence/proof layer), **Nexora**
(risk/compliance/control), **Work Sessions** (a ProofGrid module).

---

## 1. Trust additions (product logic, not new apps)

- **Project Truth Layer** — curated truth feeding dashboard/reports/client/dev/
  Nexora/ProofGrid/executive. Extend existing activity/audit/evidence; only add
  `ProjectTruthEvent` if truly needed (task_completed, evidence_added,
  work_session_*, decision_*, nexora_flag_*, report_*, deployment_ready, …).
- **Trust Timeline** — curated (not an activity wall): what happened · proven by
  what · internal/client-visible · report impact · Nexora checked · decision
  needed. Compute from existing events first; surface in Project Overview /
  ProofGrid / Client / Executive.
- **Client Confidence / Control status** (extend existing health, don't create a
  2nd score): `Controlled · Needs Attention · Waiting for Approval · Risk
  Detected · Not Ready` — always with a one-line reason.
- **Delivery Readiness** (extend report readiness): can this report/delivery/
  work-session/milestone go to the client? `ready · needs_evidence ·
  needs_approval · nexora_warning · blocked_by_decision · internal_only ·
  client_ready · sent` + checks (evidence? client_visible? internal notes
  removed? Nexora warnings? open decisions? approvals? transcript? client-safe?).
- **Design Integrity QA** — a workflow/script/checklist that prevents pages from
  drifting (wrong colours/radii/spacing, hard borders, default buttons, broken
  mobile, overflow, boxed inputs, oversized headlines, bad empty states,
  light/dark/read issues, off-centre auth, missing mobile Google login, fake
  SSO, sidebar/table messes). `npm run design:audit / ui:check / mobile:check`
  or a markdown checklist if no Playwright. Optional `DesignAuditRun` model.
- **Design QA report after every major UI/logic change**: build ✓ typecheck ✓
  lint ✓ mobile 375 / tablet 768 / desktop 1440 ✓ dark/light/read ✓ auth ✓
  client/dev/dashboard ✓ — list checked routes, found/fixed/open issues. Never
  claim "perfect" without checking.

## 2. Work Sessions (a ProofGrid module — NOT time tracking)

Project-based **proof-of-work moments** (workshop, design review, consulting,
field work, QA, service, handover, approval, review). Time optional
(`time_mode: none|planned_actual|start_stop|manual|imported`). Activatable
module — only shows when `work_sessions` enabled. Models: `WorkSession`
(session_type, status draft→…→approved, visibility, client_visible),
`WorkSessionEvidence/Note/Activity`, `Approval` (related_type work_session/
report/milestone/…), `Evidence` (proof_strength weak→verified, client_visible
default false), `WorkSessionTemplate`. Public token flows (no app): submit view
`/public/work-session/{token}`, approval view `/public/approval/{token}` —
mobile-first, expiring, revocable, limited. Submitted/approved → ProofGrid
Evidence; usable in reports; Nexora checks (no evidence, waiting approval,
report references unapproved session, internal note in client content, …); Tagro
summarizes. UI: WorkSessionsTab/Card/StatusChip/CreateDrawer/DetailDrawer/
EvidenceList/ApprovalPanel/PublicSubmit/PublicApproval. **MVP**: PM creates a
session, attaches evidence, gets client approval, uses it in a report. Not MVP:
full invoicing, GPS, native app, connectors.

## 3. Integrations = proof pipelines (not data dumps)

`External tool → Connector ingest → Normalize → Evidence → ProofGrid → Nexora →
Tagro summary → Report/Client/Executive`. Never render raw tool data in UI; show
Evidence/health/reports/flags/insights. Models: `IntegrationProvider`,
`IntegrationConnection` (encrypted tokens, status, scopes, mapping),
`IntegrationResource`, `RawIntegrationEvent`, `NormalizedEvent`, `Evidence`,
`EvidenceLink`, `IntegrationMapping`, `SyncJob`, `WebhookEndpoint`, `AIInsight`,
`NexoraCheck`. Each connector: `auth/client/sync/webhook/normalize/mapToEvidence`
implementing one `Connector` interface. **Phase-1 end-to-end: GitHub, Linear,
Figma, Vercel** (then Drive, Slack, Notion, Email/Calendar; Jira/GitLab/time/
billing later). Build the shared architecture first, then 2–3 full connectors.

### Legal/Trust (non-negotiable for integrations)
Official APIs/OAuth/webhooks only — **no scraping, no password storage, no
browser automation, no blind whole-workspace ingestion**. Active user
authorization → least-privilege scopes (with human-readable reasons) →
project-scoped **resource selection** → data minimization (raw retention policy)
→ **client_visible default false** → reviewable evidence → disconnect (revoke
token, remove webhook, optional delete) → audit log → rate-limit/backoff →
webhook signature verification. **`ALLOW_CUSTOMER_DATA_FOR_MODEL_TRAINING =
false`** — connected data is used only for project intelligence inside the
customer's workspace. No false "official partner" claims. Per-provider
`providerPolicy.ts` (allowed/sensitive data, retention, ai_processing,
resource_selection, webhooks, polling, client_visibility_default). Clear consent
copy; Slack/Email extra-careful.

## 4. Tagro Queue (scheduled AI work — not a cron/reminder)

Festag prepares recurring/time-based project work: status refresh, ProofGrid
check, work-sessions summary, Nexora scan, report drafts, executive briefings,
client updates, audio briefings, decision/risk digests, readiness checks.
Models: `ScheduledAIJob` (job_type, schedule_type once|recurring|event_based|
manual_only|**quota_aware**, output_type, audience, delivery_mode draft_only|
send_after_approval|auto_send|no_delivery, review_required, auto_send),
`ScheduledAIJobRun`, `AIOutput` (persisted, review workflow), `AudioBriefing`
(**always with transcript**), `DeliverySettings` (channels in_app/email/whatsapp
later/slack/webhook, frequency, quiet hours, require_approval). **Drafts by
default; never auto-send to clients without explicit config.** Report
**versioning** (sent reports never overwritten → new version). Templates: weekly
client report, daily health refresh, Nexora scan, executive briefing, ProofGrid
check, work-sessions summary, decision digest, audio briefing, quota-aware
prompt. **Dashboard rework**: drop the big status headline → small dynamic
sentence ("Guten Abend, kein Eingreifen notwendig."); rename "Bericht
generieren" → **"Aktualisieren"** (no report duplicates); left = report feed
(versioned history, audio/transcript), right = current health + most important
change + next action + Aktualisieren/Bericht öffnen/Zeitplan ändern; when calm,
keep it empty and quiet.

## 5. Docs · Blog · Contextual help · Branding · panels

- **Festag Docs** (product understanding, Linear/Vercel/Stripe-style, calm) +
  **Blog** (product magazine: why evidence-based status, clients shouldn't have
  to ask, management vs control, AI supports not replaces, white-label, reports
  need sources, management by exception, work-sessions ≠ time tracking, …).
  Models `DocsArticle`/`BlogArticle`, routes `/docs`, `/docs/:slug`, `/blog`,
  `/blog/:slug`.
- **Contextual hints** (`FeatureHintState`: per user/workspace/feature,
  view_count, dismissed) — show on 1st/2nd visit, gone on 3rd; calm, line-less,
  one sentence + optional "Mehr in Festag Docs". Never a forced tour.
- **Workspace branding**: name/color/image; if no image → auto **abstract
  generated SVG** (lines/node-net/pixel grid, deterministic by seed, from
  workspace/profile colour, dark/light fit) — not cheap initials.
- **Teams** = responsibility view (who's responsible, who sees what, who
  decides/approves), not a member list. **Client Team** simplified. **Client
  Panel** = understandable layer (status sentence, last report, approvals,
  decisions, client-visible evidence, next steps, contact, audio) — never raw
  internal data. **Dev/Execution Panel** = focused (today's focus, key task,
  acceptance criteria, linked decision, blockers, required evidence, submit/add
  proof, ready-for-review, Tagro context) — not a Jira clone.
- Future: "Explain this page", "Why am I seeing this?", client-safe preview,
  Approval Inbox, Decision Inbox, Project Health Sentence, role-based empty
  states, first-project checklist.

## 6. Polish addon (product quality)

- **Pixel intro after login/onboarding** — calm Festag pixel mark/wordmark
  assembles (2D, not retro/game), 800–1600ms, skippable, once (`has_seen_intro`),
  reduced-motion static. Prototype: `prototypes/festag-guide/index.html`.
- **Favicon/app icon** — modern, rounded, 2D, legible at 16–64px, dark/light.
- **Settings = control center** — fix alignment (left: title/desc, right:
  value/status/action; mobile stacks); real sections (profile, workspace,
  members&roles, **workspace type with "Aktiv" not "Wechseln" on the active
  one**, branding, Tagro, reports&delivery, documents, integrations, security&
  SSO, notifications, billing, appearance, API, audit). **Replace "Anfragen"
  (email) with real in-app flows** (invite members, configure delivery, create
  workspace, switch type with confirm + upgrade-gate). Every button works or is
  clearly disabled — **no fake flows**.
- **Veyra → Tagro rename** (reverse the upstream rebrand) — ~143 files / ~1000
  occurrences + possible DB values + `VEYRA_CLAUDE_MODEL` env + `lib/tagro/*`
  identifiers. **Do as its own careful pass** (UI strings + code identifiers +
  DB migration + legacy aliases), with a Design QA after — not a blind sed.
- **Tagro Chat** — premium, project-scoped, notepad input, evidence/sources +
  action chips (update report, create document, request approval, open Nexora,
  schedule in queue). The bottom-right "Copilot" → Tagro.
- **Documents / Tagro Document Creator** — natural-language → extract fields →
  editable structured preview → Festag-styled PDF → draft/preview/send; types
  offer/briefing/status_report/executive/approval/handover/work_proof/invoice/
  meeting_summary. Models `Document`/`DocumentTemplate`/`DocumentVersion`/
  `DocumentRecipient`/`DocumentLineItem`. Linienarme modals (no form-wüste).
  Tagro never blind-sends; draft first; Nexora checks (missing fields/customer/
  amount/date, internal note in client doc, unreviewed text). Document
  created/sent/approved → ProjectTruthEvent/Evidence.
- **Modals/popups** global: fewer lines, spacing over dividers, notepad inputs,
  consistent buttons, mobile as sheet, focus trap, esc/outside-click. Shared
  `FestagModal/Drawer/Sheet/DialogHeader/DialogActions/InlineEditor/Section`.
- **Auth** — login/register centred, Festag 2D logo, **mobile Google login
  visible + working**, SSO prepared (not fake): `OrganizationSSOProvider`,
  `SSOLoginAttempt`; verify OAuth callback/session.
- **Inputs** — NO boxed containers for titles/descriptions (notepad style);
  boxes only for login email/password/search/filter/technical keys.

## Phase plan (don't do it all at once)

1 Analyse codebase (what exists: reports/teams/workspace/personal-area/hints/
docs/roles/evidence/client-panel/dev-panel/components). 2 Design-system
stabilise (tokens, personal-area reference, notepad inputs, shared shell). 3
Auth (mobile Google, centring, SSO prep). 4 Mobile foundation. 5 Tagro Queue +
dashboard rework. 6 Trust additions (truth events/readiness/confidence/timeline/
client-safe preview). 7 Design Integrity workflow. 8 Final QA. Work Sessions,
Integrations(+legal), Documents/Tagro-Creator, Docs/Blog/Hints slot in as their
own MVP slices.

**Recommended immediate next dedicated task: the Veyra→Tagro rename** (explicit,
high-visibility) done carefully with a migration plan + Design QA.
