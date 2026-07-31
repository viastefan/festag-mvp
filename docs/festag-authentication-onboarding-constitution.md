# Festag Authentication & Onboarding Constitution

The complete authentication and onboarding flow for Festag.

**Supreme with:** Product · Architecture · Experience · Identity · Integrations · Design System · Workspace Intelligence · Connected Workspace.

This is the **only** authentication flow inside Festag.

There are no separate Client, Developer, or Admin authentication experiences.

Everything starts here.

---

## Authentication philosophy

The user is not creating an account.

The user is creating an **intelligent workspace**.

| | |
|---|---|
| **Account** | Grants access |
| **Workspace** | Is the product |
| **Onboarding** | Beginning of the Workspace — not the end of registration |

Every screen should naturally lead into the next one.

- No dead ends  
- No confusing decisions  
- No unnecessary questions  

---

## Flow overview (locked order)

```
Launch App
  → Workspace Name
  → Authentication
  → Email Verification (if required)
  → Workspace Context
  → Focus Areas (optional)
  → Connect Workspace (optional)
  → Tagro Analysis
  → Workspace Type Suggestion
  → Workspace Initialization
  → Adaptive Dashboard
```

This order must remain consistent.

**Code:** `lib/platform/onboarding.ts` (`AUTH_ONBOARDING_FLOW`, `BUILD_PROJECTS_STEPS`)

---

## Screen 1 — Workspace Name

**Purpose:** Create the user's first Workspace.

| | |
|---|---|
| Field | Workspace Name |
| Validation | Live availability check — never block typing; show success instantly |
| Examples | Festag · Aerobay · Studio · Acme |
| Primary CTA | Continue |
| Secondary | Google · Apple · Email |

The visual language of this page is the foundation of the entire authentication experience.

---

## Screen 2 — Authentication

Authentication should feel effortless.

**Support:** Google · Apple · Email · SSO (Business+)

Never ask unnecessary questions. Only collect what is required.

---

## Screen 3 — Workspace Context

Replace traditional profile setup.

**Headline:** Tell Tagro about your work.

**Support:** Describe what you work on. Tagro will personalize your Workspace automatically.

- Single multiline input  
- Animated rotating placeholders (calm fade — no typing flash)  
- Everything entered becomes **Workspace Profile**  
- Never ask users to repeat this later  

Canonical examples live in `lib/platform/identity.ts` (`WORKSPACE_CONTEXT_EXAMPLES`).

---

## Screen 4 — Focus Areas

**Optional. Multiple selection. Never required. Skip always possible.**

Suggested areas:

Development · Design · Product · Marketing · Operations · Finance · Sales · Strategy · Legal · Support · Research

**Purpose:** Help Tagro personalize the first dashboard — soft preferences, not role classification.

**Code:** `FOCUS_AREA_IDS` in `lib/platform/workspace.ts`

---

## Screen 5 — Connect your Workspace

Everything optional.

**Headline:** Connect your Workspace.

**Support:** Connect the tools you already use. Tagro becomes smarter automatically.

Never explain OAuth. Never expose technical language.

Show the most relevant recommendations first; everything else later.

Categories (catalog): Development · Design · Business · Calendar · Finance · Communication — see Integrations Constitution + `lib/platform/integrations.ts`.

---

## Background process

While the user completes onboarding, Tagro continuously builds understanding.

**Infer:** Industry · Team · Responsibilities · Workspace Type · Project Types · Suggested Modules · Suggested Integrations · Suggested Dashboard

Never ask if AI confidence is high. Ask only when confidence is low.

**Infer first. Ask second.**

---

## Workspace Type

Tagro suggests. Never automatically locks.

Examples: Agency · Startup · Company · Studio · Personal · Enterprise

User confirms or changes. Always editable later.

**Belongs to the Workspace — never to the Account.**

---

## Workspace Initialization

Never instantly open the dashboard.

Premium initialization sequence (~800–1500ms):

Preparing Workspace… → Understanding Context… → Connecting Intelligence… → Creating Modules… → Finalizing… → Ready.

Do not fake loading. Animate only real initialization work.

**Route:** `/preparing`

---

## First dashboard

Tagro generates the first experience. Never one fixed dashboard.

Modules depend on: Workspace Context · Focus Areas · Connected Sources · Workspace Type · Permissions · Project Role.

Possible modules: Projects · Tagro · Calendar · Reports · Tasks · Clients · Files · Analytics · Billing · Integrations · Recommendations

---

## Invited users

Separate flow — no Build onboarding theater:

```
Invitation Link → Authentication → Name → Avatar (optional)
  → Workspace Initialization → Open invited Project
```

No additional onboarding. No unnecessary setup.

**Route:** `/join`

---

## Returning users

Skip onboarding entirely:

```
Authentication → Workspace Initialization → Adaptive Dashboard
```

---

## Account / Workspace Settings

Everything collected during onboarding must already exist in Settings:

Workspace Name · Workspace Profile · Focus Areas · Connected Sources · Workspace Type · Modules

Users never enter the same information twice.

---

## Design rules

Every authentication screen should feel like **one continuous experience**.

- Never different layouts / spacing / interactions between auth screens  
- Reuse the current onboarding visual language (Primary Dusk foundation)  
- Improve details continuously  
- Never redesign the foundation  

---

## Final experience

Users should never feel like they completed a registration.

Users should feel like they just created an **intelligent operating environment**.

Transition into the Workspace: magical but believable — calm, premium, professional, invisible.

The Workspace should already feel alive before the first project.

---

## Gate (every auth / onboarding change)

1. Is this still **one** auth flow — no Client|Developer|Admin fork?  
2. Does every screen lead naturally into the next (no dead ends)?  
3. Is the user creating a **Workspace**, not filling a registration form?  
4. Does Tagro infer before asking?  
5. Does Settings already hold anything collected here?  
6. Does visual language stay continuous with the dusk onboarding foundation?

If dual auth experiences or registration theater — redesign toward this constitution.

**Cursor rule:** `.cursor/rules/festag-authentication-onboarding-constitution.mdc`
