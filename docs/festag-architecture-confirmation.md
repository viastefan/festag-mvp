# Festag Architecture Confirmation

**Locked.** Official architecture from this point forward.

Supreme with: Product Constitution · Experience · Identity · Integrations · Design System.

---

## One platform

There is only **one** Festag platform.

Separate Client App and Developer App are **officially deprecated**.

Replaced by:

- **One Account**
- **Multiple Workspaces**
- **Multiple Projects**
- **Project Roles**
- **Adaptive Workspace Intelligence**

Every user enters the exact same product.  
The experience adapts through **context, permissions, and Tagro** — never through separate products.

Do not preserve legacy Client vs Developer architecture.  
Prefer the better product over backwards compatibility when consistent with the constitutions.

## Workspace philosophy

The **Workspace** is the primary object.

Users may own multiple workspaces (Personal, Agency, Startup, Company, Client Workspace, …).

Each workspace has its own:

- projects  
- members  
- integrations  
- AI context  
- memory  
- settings  
- dashboard  

A workspace represents **how work happens** — not who the user is.

Account Profile = who the user is.  
Workspace Profile = how this workspace works.

## Onboarding (single path)

There is only one onboarding. Never split into Client or Developer again.

**Full law:** [`docs/festag-authentication-onboarding-constitution.md`](./festag-authentication-onboarding-constitution.md)

Approximate order:

1. **Workspace Name**  
2. **Authentication** (Google / Apple / Email → verification)  
3. **Workspace Context** — “Tell Tagro about your work”  
4. **Optional Focus Areas** (only if useful; never forced classification)  
5. **Connect Your Workspace** (optional integrations)  
6. **Tagro analyzes** (silent)  
7. **Suggested Workspace Type** (Tagro suggests → user confirms / edits)  
8. **Workspace Initialization** (`/preparing`)  
9. **Adaptive Dashboard**

Invitees use **Join Project** only (name + avatar → open project) — not a second product onboarding.

No additional onboarding branches unless absolutely necessary.

## Tagro

**Infer first. Ask second.**

Users never manually classify themselves when natural language has enough confidence.  
If confidence is low, Tagro may ask for confirmation — never the opposite.

## Workspace Type

Belongs to the **workspace**, not the account.

Examples: Agency · Startup · Company · Personal · Studio · Enterprise

Tagro suggests. Users confirm or change. Always editable later in Settings.

Code: `lib/platform/workspace.ts` → stored on the workspace (mode / metadata), never as account identity.

## Dashboard

There is no Client Dashboard and no Developer Dashboard.

There is only the **Festag Workspace**.

Modules appear from: workspace · projects · role · permissions · connected sources · focus.

Tagro continuously personalizes.

## Projects

Projects belong to Workspaces.

Every project has exactly one **Project Owner**.  
Creator becomes owner automatically. Ownership is transferable.

Everything revolves around **projects**, not users.

## Long-term direction

Continue implementing with these assumptions.

The goal is not to finish screens.  
The goal is to build the **operating system for projects**.

**Code anchors:** `lib/platform/` (`roles`, `onboarding`, `join`, `identity`, `integrations`, `workspace`, `workspace-personalization`)
