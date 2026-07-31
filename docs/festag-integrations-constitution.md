# Festag Integrations Constitution

How integrations work inside Festag.

**Supreme with:** Product · Experience · Identity constitutions · Design System.

Integrations are **not** technical settings.  
Integrations are part of the **onboarding experience** — building the workspace.

---

## Core philosophy

Every project already has context.  
Every user already works somewhere.

Festag should never ask users to manually recreate their work.

Instead, Festag connects to where work already happens.  
The OS becomes intelligent by understanding **signals** from connected sources.

## Connect your workspace

Never present integrations as technical APIs.  
Present them as part of building the workspace.

**Headline:** Connect your workspace.

**Supporting text:**

> Connect the tools you already use.  
> Tagro will understand your work automatically.

Users should immediately understand: connecting sources means **less manual work** — never “more configuration.”

## Optional

Every integration is optional.  
The user should never feel blocked. Skipping should always be possible.

The product already provides value without integrations.  
Integrations simply **increase intelligence**.

## Universal integrations

Do not optimize only for software developers.  
Festag is an operating system for projects — onboarding must support many industries.

Categories (grow over time):

| Category | Examples |
|---|---|
| Development | GitHub, GitLab, Bitbucket, Linear, Jira, Vercel, Supabase, Railway, Cloudflare, Firebase |
| Design | Figma, Adobe, Framer |
| Marketing | Google Analytics, Meta, LinkedIn, HubSpot, Mailchimp |
| Business | Slack, Microsoft Teams, Google Workspace, Notion, Google Drive, Dropbox |
| Finance | Stripe, Lexoffice, DATEV |
| Calendars | Google Calendar, Outlook Calendar, Apple Calendar |
| Communication | Discord, WhatsApp Business, Email, Zoom |

## Smart recommendations

Never recommend every integration.  
Tagro recommends based on **Workspace Context**.

Examples:

| Context | Recommend |
|---|---|
| Agency | GitHub, Slack, Google Drive, Stripe |
| Startup | GitHub, Vercel, Supabase, Linear |
| Marketing Agency | Google Analytics, Meta, Figma, Notion |
| Architecture Office | Google Drive, Calendar, Dropbox |
| Enterprise Team | Microsoft Teams, Outlook, Azure, Jira |

Recommendations should always feel obvious.

## Workspace signals

Integrations are signals. They let Tagro understand: project progress, communication, files, deployments, meetings, deadlines, deliveries, documents, analytics, billing, team activity.

Tagro continuously combines these signals.  
Never ask users to manually repeat information that already exists elsewhere.

## Living workspace

A workspace is never static.  
Every new connected source makes the workspace **smarter** — not more complicated.

Users should feel: the more I connect, the less I have to manage.

## UI principles

Every integration card: premium · simple · large · comfortable · calm.

**Only visible states:**

`Connected` · `Available` · `Recommended` · `Coming Soon`

Never expose: technical terminology, OAuth details, API language.  
Users connect **products**, not APIs.

## Progressive disclosure

Never show hundreds of integrations.  
Start with the few most relevant. Allow discovery later.  
Tagro suggests better integrations as the workspace evolves.

## Long-term vision

Festag is the intelligence layer above every work tool.

GitHub creates software. Figma creates designs. Slack creates conversations.  
Google Drive stores files. Stripe processes payments.

Festag understands all of them together.

## Final principle

Users should never think: “I connected another integration.”  
Users should think: “My workspace just became smarter.”

Every connected source should reduce manual work and improve Tagro’s understanding.

**Code:** `lib/platform/integrations.ts`
