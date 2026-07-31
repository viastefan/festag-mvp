# Festag Product Constitution

**The Operating System for Projects.**

This is the supreme product law for Festag. Cursor rule: `.cursor/rules/festag-product-constitution.mdc`.  
Code: `lib/platform/roles.ts`, `lib/platform/onboarding.ts`.

## Core belief

Existing tools expect people to organize projects.

Festag believes projects should organize themselves. Humans decide. The system structures.

Tagro is not a chatbot. Tagro is the operating intelligence of every workspace — continuously understanding context, decisions, priorities, communication, documentation, execution, progress, and risks without forcing users to manually maintain everything.

## Festag is not

Jira · ClickUp · Asana · Linear · Notion · AI Chat.

Do not copy those products. Software development is the first market only — architecture must support every complex project (design, consulting, marketing, branding, agencies, startups, internal teams).

## One platform

There is no separate Client App and Developer App.

One platform. Different experiences through **roles and permissions**.

### Project roles

| Role | Notes |
|------|--------|
| Project Owner | Creator by default; transferable |
| Admin | |
| Member | |
| Client | |
| Developer | |
| Designer | |
| Viewer | |

Never build “client logic” or “developer logic.” Build role logic. Permissions define visibility — not account types / separate products.

### Project Owner

Exactly one Project Owner per project. Automatically the creator. Not always the client or the developer — can be freelancer, agency, founder, PM, internal company, or client.

## Workspace

Accounts own one or more Workspaces → Projects → Teams → Members.  
The Workspace is the operating environment; the **project** is the permanent knowledge object.

## Two onboarding paths only

## Architecture confirmation (locked)

Official: `docs/festag-architecture-confirmation.md`

One Festag. Client App / Developer App **deprecated**.  
One Account · Multiple Workspaces · Projects · Project Roles · Adaptive Workspace Intelligence.  
Workspace is how work happens. Tagro infers first. Prefer OS quality over dual-product compatibility.

### Build Projects

For founders, agencies, freelancers, internal teams.

Order: Workspace Name → Auth → **Workspace Context** → optional Focus Areas → Connect your workspace → Tagro analyze → Suggested Workspace Type → `/preparing` → Adaptive Dashboard. Single path on dusk chrome. Legacy `/dev/onboarding` redirects here.

See Identity: `docs/festag-identity-constitution.md`.  
See Integrations: `docs/festag-integrations-constitution.md`.  
See Architecture: `docs/festag-architecture-confirmation.md`.

### Join Project

For invited users.

Name · Avatar · Done → open the invited project immediately.

No Client vs Developer chooser. No unnecessary setup for invitees.

Auth flow: Workspace Name → Google / Apple / Email → Verification → Onboarding → Preparing → Dashboard.

## Auth design system

Keep the current registration quality: workspace name, live availability, Google / Apple / Email, clean minimal layout.

**Dev onboarding visual language** = foundation for ALL auth screens:

Login · Register · Invite · Join Project · Join Workspace · Verify Email · Reset / Forgot Password

Same typography, spacing, components, layout rhythm. Shared: `components/auth/auth-landing-styles.ts` (`.al-root`).

## Auth & onboarding UX

- Reduce visual noise. Never add copy that delays the primary action.
- Prefer progressive disclosure.
- Primary action always visually dominant — clear in 2–3 seconds.
- Onboarding feels like a conversation with the OS — not a form.
- Prefer showing the product over explaining it.
- **Experience over explanation.** Festag is confident — never over-explain.

**Feel-layer:** `docs/festag-experience-constitution.md` — how Festag should feel (motion, typography, Tagro voice, self-review).

## Architecture roadmap

1. Join Project (`/join`) — invitees: name + avatar → open project ✅
2. Build Projects — collapse dual onboardings → `/onboarding` ✅
3. Project membership / `ProjectRole` SSOT
4. Auth chrome unification on `.al-root`
5. Shell unification (role lenses)

## Migration note (honest)

The codebase still contains dual shells and fragmented role enums. That is **legacy debt**. New work must converge toward this constitution — never deepen the fork.
