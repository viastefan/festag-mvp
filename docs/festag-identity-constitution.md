# Festag Identity Constitution

How Festag understands people.

**Supreme with:** Product Constitution · Experience Constitution · Design System.

Users should never configure the platform.  
The platform should understand the user.

---

## Identity philosophy

Festag should never ask users to classify themselves through complex forms.

Users should simply describe what they do.  
Tagro understands everything else.

Onboarding should feel like introducing yourself to a new colleague — not configuring enterprise software.

## The first conversation

During onboarding the user should only answer **one contextual question**.

Never ask for unnecessary configuration.  
Purpose: understanding context — not collecting settings.

Tagro should infer from one natural-language description:

- responsibilities  
- project types  
- work style  
- organization type  
- company stage  
- recommended modules  
- suggested integrations  
- dashboard priorities  

## Workspace Context

Never call this field: Bio · About You · Description.

Prefer:

- **Workspace Context**  
- or **Tell Tagro about your work**

Supporting text:

> Describe what you work on.  
> Tagro will personalize your workspace, recommendations and dashboard based on this information.

### Animated placeholders

The placeholder should never remain static. Every few seconds it should calmly transition to another realistic example.

Slow fade. No typing effect. No flashy motion.

Examples (canonical):

- I run a software agency with eight developers.  
- I'm the CEO of a SaaS startup.  
- I mainly build websites for clients.  
- I manage internal product teams.  
- I design digital products and interfaces.  
- I build AI products and automation tools.  
- I work as a freelance full-stack developer.  
- I coordinate marketing projects for multiple brands.  
- I manage architecture and construction projects.  
- I organize events for enterprise customers.  

## Tagro understanding

After the user writes, Tagro silently analyzes the text.

Understand: role, industry, team size, company type, project complexity, likely integrations, recommended modules, recommended dashboard, recommended onboarding, future suggestions.

Automatic. Never expose unnecessary technical analysis.

## Personalized setup

After understanding, Tagro prepares the workspace automatically.

Examples:

| Understanding | Prepared surfaces |
|---|---|
| Agency | Clients, Projects, GitHub, Invoices, Reports, Team |
| Startup Founder | Roadmap, Funding, Projects, Analytics, Tagro |
| Designer | Assets, Files, Reviews, Projects |
| Marketing | Campaigns, Calendar, Content, Analytics |
| Internal Product Team | Roadmap, Meetings, Reports, Projects |

No dashboard should be completely identical. Every workspace should feel intentionally prepared.

## No forced role selection

Avoid asking users to classify themselves as Developer · Designer · Founder · CEO · Agency · Manager when natural language suffices.

**Infer first. Ask second.**

Optional Focus Areas (architecture confirmation) are soft preferences — not product forks.

Perspectives remain temporary Focus Views — permissions unchanged.

## Workspace Profile

The onboarding description becomes the **Workspace Profile**.

It is never discarded. It continuously evolves. Users can edit it anytime.

Tagro refines understanding through: projects, activity, integrations, team, communication, completed work.

The Workspace Profile is the long-term memory of how the workspace operates.

Code: `lib/platform/identity.ts` — stored under `workspaces.metadata.workspace_profile`.

## Account Profile

Separate personal identity from workspace identity.

| Profile | Meaning |
|---|---|
| **Account Profile** | Who the user is |
| **Workspace Profile** | How the workspace works |

One person may own multiple workspaces; each has its own context and should behave differently.

## Perspectives

Never force users into one permanent role.

Allow temporary **Focus Views** (Executive · Builder · Designer · Marketing · Finance · Operations).

Underlying permissions never change. Only focus changes — the dashboard adapts, not the identity.

## Settings

Everything collected during onboarding should already exist inside Settings.  
Users should never re-enter information.

Changing the Workspace Profile immediately updates Tagro's understanding.

## Long-term learning

Tagro becomes smarter over time — not through manual setup, through observation.

The more users work, the better Festag understands them.  
The less configuration becomes necessary.

## Experience principle

Users should never think: “I need to configure my workspace.”  
Users should think: “It already understands how I work.”

## Final principle

Festag understands people through **context**.

Not through forms. Not through dropdowns. Not through checkboxes.

The operating system should continuously learn, adapt and organize itself around the user's real work.

That is what makes Festag fundamentally different from traditional project management software.
