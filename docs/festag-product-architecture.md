# Festag — Product & Architecture North Star

> **Festag is the AI control layer for client projects** — turning scattered
> work, time, evidence, decisions, risks, and updates into clear operational
> visibility for project managers, clients, executives, agencies, and teams.

This is the binding reference for all architecture, backend and UI decisions.
Every element must serve: *does this improve project clarity, decisions, risk
visibility, or trust?* If no → leave it out.

---

## 1. What Festag is / is not

**Is:** AI control & visibility layer that sits *above* the tools teams already
use (GitHub, Linear, Jira, Figma, Slack, Notion, Vercel, Supabase, email …),
reads project signals, and produces evidence-based status, decisions, risks and
briefings. Not a tool you must maintain — a layer that turns existing work into
one clear truth.

**Is not:** another PM tool, Notion/Jira/Linear clone, a chatbot, a plain
dashboard, or a classic agency.

**Differentiation:** Festag does not win on more features. It wins on *more
specific clarity*. Notion = flexible but empty; Jira/Linear = for teams doing
the work; GitHub = shows code; Festag = explains business-relevant truth for
PMs, clients and deciders.

## 2. Audiences (different depth per role)

- **Project Manager / PO / Delivery Manager** — works in Festag daily: status,
  milestones, risks, blockers, decisions, evidence, report generator.
- **Agency** — premium client portal: many client projects, white-label later,
  client views, auto status reports, approvals, fewer status calls.
- **Client** — simple, plain-language status: what's done, next, what needs my
  decision, risks, approvals. No raw technical detail.
- **CEO / Executive** — *management by exception*: only health, risk, decision,
  impact. "Alles läuft normal" state. Very short summary.
- **Investor / Venture Studio** (later) — portfolio visibility across projects.

## 3. Core problem

Software/client projects rarely fail on tasks — they fail on **unclear truth**:
clients don't know what's happening, progress is opaque, decisions get lost in
chats, risks surface too late, status reports are manual, meetings replace
clarity. Festag turns scattered project work into clear, **evidence-based**
project truth.

## 4. Evidence-first principle (non-negotiable)

Festag must never just *claim* progress — it shows what status is based on.
Every meaningful status carries an **Evidence** structure: reason → evidence
links → impact → next action.

> Status: Risk · Reason: API access missing 3 days · Evidence: open decision
> 26.05, 4 blocked tasks, milestone "Login" delayed · Impact: +3–5 days ·
> Next action: client decides — mock data or wait.

## 5. Core data model (build/refactor toward this)

`Organization` (type: agency|startup|company|investor|freelancer|internal_team),
`User` (role, organization_id), `Project` (status: healthy|watch|risk|blocked|
completed|archived; phase: intake|planning|design|development|testing|delivery|
maintenance; progress_percent, health_score, **project_type**, visibility),
`Milestone`, `Task` (source_tool, source_id for connectors), `Decision`
(options json, selected_option, impact_summary, assigned_to, due), `Risk`
(severity, probability, impact, mitigation), `Blocker` (impact_days_estimate),
`StatusReport` (audience: internal|client|executive|investor; generated_by:
ai|human|hybrid), **`Evidence`** (related_type/id, source_type, source_url,
confidence), `Briefing` (text|audio|executive_weekly|client_update; always with
transcript), `Integration` (type, status, last_sync, config), `ActivityLog`,
`AIInsight` (type: risk_detected|decision_needed|progress_summary|contradiction|
scope_change|timeline_shift; confidence, evidence_ids, status workflow).

AI outputs are **persisted** (not chat-only) with confidence + evidence + a
dismiss/acknowledge/resolve workflow.

## 6. Modular project types (NOT software-only)

Festag is the AI control layer for **client projects** generally; software is
the strong first use case, not the only logic. **No hard assumptions** that
every project has developers / GitHub / PRs / deployments.

`Project.project_type`: software_project, web_project, design_project,
marketing_project, construction_project, maintenance_project, minijob_project,
cleaning_project, hospitality_project, real_estate_project, consulting_project,
event_project, custom_project.

Generic naming in backend: **executor** (not developer), **assignee/worker**,
**execution_panel** (not dev_panel), **work_session** (not coding_session),
**evidence** (not commit/proof), **project_type**, **module_config** (not
hardcoded UI). The UI label "Dev Panel" may stay for software; the component is
modular internally.

### Modules (per project, enabled flags)
tasks, milestones, decisions, risks, blockers, evidence, status_reports,
client_portal, executive_briefings, time_tracking, work_sessions, approvals,
file_uploads, photo_evidence, location_checkin, invoices, budget_tracking,
material_tracking, deployment_tracking, code_tracking, design_review,
campaign_tracking, shift_tracking, quality_check, handover, maintenance_log.

Backend prep: `ProjectModule {project_id, module_type, enabled, config}`,
`ProjectTypeTemplate {project_type, default_modules, default_fields,
default_views, default_status_logic}`, `CustomField {entity_type, field_key,
type, options, visible_to_roles}`, `WorkSession {start/end, break_minutes,
duration, hourly_rate, calculated_cost, location, status: draft|submitted|
approved|rejected}`, `WorkLog`, `Approval {status: pending|approved|rejected|
changes_requested}`, `TimeCalculation`.

### Project templates (start fast per branch)
Software MVP · Website · Minijob/Arbeitsauftrag · Handwerkerauftrag ·
Marketingkampagne · Consulting. Veyra detects type → enables right modules,
roles, evidence, status logic, execution-panel fields.

### Modular Execution Panel
Same component, fields by project_type: software → tasks/PR/bugs/review/deploy;
minijob → start/stop/pause, auto time, activity, photo, location, submit day;
handwerker → steps/material/photo/defect/time/done→client approval; marketing →
assets/campaign tasks/approval/publish/results.

### Modular health engine
General health engine + project_type-specific rules. Software: milestone
progress, open bugs, blocked tasks, missing decisions, deployments. Minijob:
planned vs logged hours, missing start/end, unapproved sessions, missing
proofs/approval. Handwerker: steps done, material, photos, handover, defects,
deadline. Marketing/Consulting: assets/approvals/live/budget · deliverables/
meetings/decisions.

## 7. Veyra (the intelligence layer, not a chatbot)

Veyra structures project info, summarises progress, detects risks/blockers/
missing decisions, writes status reports, translates tech → client language,
produces executive briefings, prioritises. **Tone: calm, clear, premium,
factual, no hype, no emojis, no filler, short.** Thinks in categories: what
changed / done / blocked / needs a decision / risky / next / what evidence.

Good: *"Der Login-Milestone ist gefährdet. Drei Tasks hängen am fehlenden
API-Zugang. Ohne Entscheidung heute verschiebt sich der Meilenstein um 3–5
Tage."* Bad: *"Super! Tolle Fortschritte! 🎉"*

Veyra chat = project-scoped actions, not chatter. Answers are short, structured,
with evidence + action buttons (Statusbericht erstellen / Entscheidung anfragen
/ Risiko markieren / Aufgabe erstellen / Ignorieren).

Pipeline: inputs (project/tasks/milestones/decisions/risks/blockers/evidence/
activity/integration) → process (summarise changes, detect blockers, stale
tasks, missing decisions, contradictions, health) → outputs (AIInsight,
StatusReport, Briefing, Suggested Decision/Risk/NextStep). Code today:
`lib/tagro/*` (claude→gemini→openai dispatcher, Claude-first).

## 8. Status / Health

`healthy | watch | risk | blocked | completed | archived`, each with reason +
evidence + impact + recommended next action. Factors: progress vs schedule,
open blockers, overdue decisions, critical risks, blocked tasks, last activity,
milestone delay, scope changes, unanswered client questions, missing evidence,
integration data.

## 9. Reports & briefings

Types: Internal · Client (plain, no needless tech) · Executive (5–8 sentences,
health/risk/decision/impact only) · Weekly Summary · Audio (premium, always
with searchable/exportable transcript). Backend: versioned + exportable
(PDF/email/share link).

## 10. Dashboards by role

- **PM:** Attention Required · Open Decisions · At-Risk Projects · Recent Veyra
  Insights · Reports to Send · Blockers · Project Health · Connected Sources ·
  Next Actions.
- **Client:** Health · Progress · Next Milestone · Decisions needed from me ·
  Latest Report · What changed this week · What's next. Understand in 20s.
- **CEO:** overall status, only exceptions, critical decisions, risk impact,
  weekly summary, no task noise. "Alles läuft planmäßig" when fine.

## 11. UI / design system (binding)

References: Linear, Vercel, Apple, calm dark SaaS. Principles: clarity > feature
count, less text, clear hierarchy, consistent spacing/cards/buttons/radii/hover/
type, no layout shifts, no UI bugs, every page from one system.

**Tokens (target):**
- Background: `#070B12 #0A0F18 #0B1118 #0D141D`
- Surfaces: `#101821 #121A24 #151E2A`
- Border: `rgba(255,255,255,.06) / .08`
- Text: primary `#E8EDF4`, secondary `#9AA4B2`, muted `#6F7A89`
- Accent: **`#6a738c`** (+ subtle `rgba(106,115,140,.12/.18/.28)`). No violet/
  neon.
- Spacing: 4px base — 4/8/12/16/20/24/32/48 (no random 17/23px).
- Radius: sm 8 · md 12 · lg 16 · xl 20 · full 999.
- Motion: 150–250ms UI, 300–500ms modals, `cubic-bezier(.16,1,.3,1)`, no bounce.

**Shared components to stabilise:** Button, Card, Modal, Input (notepad-style,
no boxes — see festag_design_rules), Select, Tabs, Sidebar, StatusChip,
EmptyState, Loading/Error/Skeleton, ReportCard, DecisionCard, RiskCard,
ProjectHealthCard, EvidenceItem.

**Text reduction:** UI labels short ("Projektstatus", not a paragraph). Help
text only where truly needed. Reports may be longer but structured.

**No-bug policy:** check overflow, truncation, z-index (modal over sidebar),
responsive, hover/focus/loading/empty/error, dark contrast, alignment, long
names/emails, small+large screens.

## 12. Veyra orb (dashboard statusabfrage)

A calm **node/pixel network** (or sphere) in `#6a738c`. States:
- **Idle:** slow breathing.
- **Listening:** slight densification / inward pull.
- **Thinking:** fine rotation / node activity.
- **Speaking:** soft outward impulses.
No equalizer disco, no neon — premium and quiet.

## 13. MVP focus (don't dilute)

1 Projects · 2 Milestones · 3 Decisions · 4 Risks · 5 Evidence · 6 Status
Reports · 7 Veyra Summary · 8 Project Health · 9 Client View · 10 clean UI
system. First project types: **software, agency, minijob** (proves Festag is a
modular control layer for executed work, not just a PM tool). Not yet:
marketplace, full white-label platform, live voice, many integrations, heavy
analytics.

## 14. Connector-first architecture

Each integration: authenticated, stores source, sync status, last sync, errors;
maps raw data → Evidence / Activity / Task mapping → updates health → triggers
Veyra insight. Connector service: fetch → normalize → map to Festag objects →
attach evidence → update health → generate insight. (GitHub/Linear/Jira/Figma/
Slack/Notion/Vercel/Supabase/Drive/Email later.)

## 15. Working method

Senior product architect, not feature-builder. Steps: understand code → plan →
stabilise design system → solid backend models → health logic → Veyra services
→ clear pages → leave no bugs (TS/lint/responsive/dark/states). Refactor
software-only terms *gently* (don't break working code). Prefer flexible naming.
