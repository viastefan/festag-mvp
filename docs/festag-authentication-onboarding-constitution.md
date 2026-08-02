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
  → Profile (Name required + optional Position/Unternehmen/Ziel)
  → Workspace wählen
  → Quellen verbinden (optional)
  → Workspace Initialization (/preparing)
  → Adaptive Dashboard
```

This order must remain consistent. No separate Abschluss card — Connect continues into `/preparing`.

**Code:** `lib/platform/onboarding.ts` · `lib/platform/master-onboarding.ts`

Team invites are **not** part of Build onboarding.

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

## Screen 3 — Name

Account profile — calm, skippable.

| | |
|---|---|
| Field | Full name |
| Required | No — Skip always; editable in Settings |
| Why | Invites, welcome emails, team clarity |
| CTA | Weiter when typed · Überspringen when empty |

---

## Screen 4 — Position

Soft signal — not a Client|Developer product fork.

| | |
|---|---|
| Field | Free-text position |
| Required | No — Skip always |
| Examples | Gründer · Product Lead · Client · Developer |
| Purpose | Soft personalization for Tagro — never locks roles or apps |

---

## Screen 5 — Workspace wählen

User picks the workspace orientation. Always editable later in Settings.

Options: Developer · Agentur · Startup · Unternehmen

Maps to workspace type (`personal` · `agency` · `startup` · `company`). Belongs to the **Workspace** — never the Account.

---

## Screen 6 — Quellen verbinden

Everything optional. Skip always available.

**Headline:** Quellen verbinden.

**Support:** Was nutzt du schon?

Never explain OAuth. Never expose technical language.

Show the most relevant recommendations first; everything else later.

Categories (catalog): Development · Design · Business · Calendar · Finance · Communication — see Integrations Constitution + `lib/platform/integrations.ts`.

---

## Screen 7 — Abschluss

Calm ready screen. Primary CTA enters `/preparing` then the adaptive dashboard.

No invite gate. No extra forms.

---

## Background process

While the user completes onboarding, Tagro builds understanding from name, position, workspace choice, and sources.

**Infer:** Modules · Suggested Integrations ranking · Dashboard priorities

Never lock Workspace Type without user agency — the user picks; Settings can change it.

---

## Workspace Type

User picks during Build (Developer · Agentur · Startup · Unternehmen). Always editable later.

Maps to: Personal · Agency · Startup · Company (+ Studio · Enterprise later).

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

Modules depend on: Position · Connected Sources · Workspace Type · Permissions · Project Role.

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

Workspace Name · Name · Position · Connected Sources · Workspace Type · Modules

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
4. Is Position a soft signal — never a product fork?  
5. Does Settings already hold anything collected here?  
6. Does visual language stay continuous with the dusk onboarding foundation?

If dual auth experiences or registration theater — redesign toward this constitution.

**Cursor rule:** `.cursor/rules/festag-authentication-onboarding-constitution.mdc`