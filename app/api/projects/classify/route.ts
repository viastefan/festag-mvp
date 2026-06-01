import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { PROJECT_MODULE_REGISTRY, getProjectPreset, type ProjectType, type ExecutorRole, type DataSource } from '@/lib/project-modules'
import { hasVeyraAI as hasGeminiKey, runVeyraText as runGeminiText } from '@/lib/tagro/text'
import { extractJsonObject } from '@/lib/tagro/json'

export const runtime = 'nodejs'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const PROJECT_TYPES: ProjectType[] = [
  'software', 'website', 'marketing', 'seo', 'branding', 'automation', 'consulting', 'hybrid',
]

type ClassifyInput = {
  description: string
  hint?: ProjectType
  targetClient?: 'self' | 'internal' | 'client' | 'agency_client' | 'white_label_client'
  teamShape?: 'solo' | 'team' | 'external' | 'festag_support' | 'mixed'
  industryContext?: string
  projectId?: string | null
}

type ClassifyOutput = {
  projectType: ProjectType
  label: string
  confidence: number
  source: 'heuristic' | 'ai' | 'hint'
  clientModules: string[]
  briefingSections: string[]
  suggestedRoles: ExecutorRole[]
  suggestedDataSources: DataSource[]
  defaultMilestones: string[]
  kpis: string[]
  reason: string
}

/**
 * POST /api/projects/classify
 *
 * Body: { description, hint?, targetClient?, teamShape?, industryContext?, projectId? }
 * Returns the full module preset for the resolved project_type.
 * Persists to project_classifier_runs when projectId is provided.
 *
 * Strategy:
 *   1. If a typed hint is provided, trust it (source='hint').
 *   2. Else try OpenAI when OPENAI_API_KEY is set (source='ai').
 *   3. Fall back to keyword heuristics (source='heuristic') — never fails.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ClassifyInput
    const description = (body.description || '').trim()
    if (!description && !body.hint) {
      return NextResponse.json({ ok: false, error: 'description_required' }, { status: 400 })
    }

    const cookieStore = cookies()
    const sbCookie = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(_cookies: { name: string; value: string; options: CookieOptions }[]) { /* read-only */ },
      },
    })
    const { data: { user } } = await sbCookie.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

    let projectType: ProjectType
    let confidence: number
    let source: ClassifyOutput['source']
    let reason: string

    if (body.hint && PROJECT_TYPES.includes(body.hint)) {
      projectType = body.hint
      confidence = 1
      source = 'hint'
      reason = `Manuell als ${body.hint} markiert.`
    } else {
      const ai = await classifyWithAI(description, body.industryContext)
      if (ai) {
        projectType = ai.type
        confidence = ai.confidence
        source = 'ai'
        reason = ai.reason
      } else {
        const h = heuristicClassify(description, body.industryContext)
        projectType = h.type
        confidence = h.confidence
        source = 'heuristic'
        reason = h.reason
      }
    }

    const preset = getProjectPreset(projectType)
    const output: ClassifyOutput = {
      projectType,
      label: preset.label,
      confidence,
      source,
      clientModules: preset.clientModules,
      briefingSections: preset.briefingSections,
      suggestedRoles: preset.suggestedRoles,
      suggestedDataSources: preset.suggestedDataSources,
      defaultMilestones: preset.defaultMilestones,
      kpis: preset.kpis,
      reason,
    }

    // Persist to project_classifier_runs if we have a projectId.
    if (body.projectId) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const sb = serviceKey
        ? createServiceClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
        : sbCookie
      // Look up workspace for the project (owner's personal workspace as fallback)
      const { data: project } = await sb.from('projects')
        .select('id,user_id,workspace_id').eq('id', body.projectId).maybeSingle()
      const workspaceId = (project as any)?.workspace_id ?? null

      await sb.from('project_classifier_runs').insert({
        project_id: body.projectId,
        user_id: user.id,
        workspace_id: workspaceId,
        input: body,
        output,
        source,
        confidence,
      })

      // Mirror the classification onto the project itself so future
      // queries don't need a join.
      await sb.from('projects').update({
        project_type: projectType,
        industry_context: body.industryContext ?? null,
        enabled_modules: preset.clientModules,
        enabled_briefing_modules: preset.briefingSections,
        executor_roles: preset.suggestedRoles,
        classifier_metadata: { confidence, source, reason },
        classified_at: new Date().toISOString(),
      }).eq('id', body.projectId)
    }

    return NextResponse.json({ ok: true, classification: output })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'classify_failed' }, { status: 500 })
  }
}

// ── Heuristic classifier — keyword scoring, deterministic, never fails ──
const SCORE_RULES: Array<{ type: ProjectType; patterns: RegExp[]; weight: number }> = [
  { type: 'software',   patterns: [/\b(app|saas|plattform|mvp|webapp|api|backend|frontend|softwar|features?)\b/i, /\b(react|next|supabase|github|deploy|stripe|auth)\b/i], weight: 1 },
  { type: 'website',    patterns: [/\b(website|landingpage|webseite|seiten|homepage|webflow|wix|wordpress|landing page|website-relaunch)\b/i], weight: 1 },
  { type: 'marketing',  patterns: [/\b(kampagne|ads|meta ads|google ads|werbung|performance marketing|marketing|funnel|leadgen|paid social|tiktok ads)\b/i], weight: 1 },
  { type: 'seo',        patterns: [/\b(seo|suchmaschine|ranking|search console|keyword|onpage|technische seo|content cluster)\b/i], weight: 1 },
  { type: 'branding',   patterns: [/\b(branding|markenidentität|logo|corporate design|brand kit|moodboard|visual identity)\b/i], weight: 1 },
  { type: 'automation', patterns: [/\b(automation|automatisierung|workflow|zapier|make\.com|n8n|integration|ai workflow|api workflow)\b/i], weight: 1 },
  { type: 'consulting', patterns: [/\b(strategie|beratung|consulting|digitalstrategie|roadmap|positionierung|advisory)\b/i], weight: 1 },
]

function heuristicClassify(description: string, industryContext?: string) {
  const text = `${description} ${industryContext || ''}`.toLowerCase()
  const scores: Partial<Record<ProjectType, number>> = {}

  for (const rule of SCORE_RULES) {
    let s = 0
    for (const p of rule.patterns) if (p.test(text)) s += rule.weight
    if (s > 0) scores[rule.type] = (scores[rule.type] || 0) + s
  }

  const ranked = (Object.entries(scores) as Array<[ProjectType, number]>)
    .sort((a, b) => b[1] - a[1])

  if (ranked.length === 0) {
    return { type: 'software' as ProjectType, confidence: 0.35, reason: 'Keine eindeutigen Signale erkannt — Default Software.' }
  }
  // If top two are within 1 point, mark as hybrid.
  const [top, second] = ranked
  if (second && top[1] - second[1] <= 0 && top[0] !== second[0]) {
    return { type: 'hybrid' as ProjectType, confidence: 0.55, reason: `Mehrere Signale: ${top[0]} + ${second[0]}.` }
  }
  return { type: top[0], confidence: Math.min(0.95, 0.55 + top[1] * 0.1), reason: `Top-Match per Keyword: ${top[0]} (${top[1]} Signals).` }
}

// ── AI classifier — Gemini first, OpenAI fallback, JSON-only ────────
async function classifyWithAI(description: string, industryContext?: string): Promise<{ type: ProjectType; confidence: number; reason: string } | null> {
  if (!description.trim()) return null
  try {
    const prompt = `Du bist Veyra, ein Klassifizierer für Festag. Lies die Projektbeschreibung und entscheide den Projekt-Typ.

Mögliche Typen:
- software (App / Platform / SaaS / Backend)
- website (Landingpage, Marketing-Site, CMS)
- marketing (Kampagne / Performance / Ads / Social)
- seo (SEO / Content / Technical SEO)
- branding (Design / Identity / Asset System)
- automation (AI-Workflows / Integrationen)
- consulting (Strategie / Digital Advisory)
- hybrid (mehrere der oben gleichgewichtig)

Branche (optional): ${industryContext || '—'}

Projektbeschreibung: ${description}

Antworte AUSSCHLIESSLICH als JSON-Objekt mit dem Schema:
{"type": "<einer der Typen>", "confidence": <0..1>, "reason": "<ein deutscher Satz, knapp>"}`

    let content: string | null = null
    if (hasGeminiKey()) {
      const gemini = await runGeminiText({
        system: 'Du klassifizierst Projekte für Festag. Nur JSON ausgeben.',
        prompt,
        maxTokens: 200,
        temperature: 0.2,
        responseMimeType: 'application/json',
      })
      if (gemini.ok && gemini.text) content = gemini.text
    }

    const key = process.env.OPENAI_API_KEY
    if (!content && key) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          max_tokens: 200,
          messages: [
            { role: 'system', content: 'Du klassifizierst Projekte für Festag. Nur JSON ausgeben.' },
            { role: 'user',   content: prompt },
          ],
        }),
      })
      if (!res.ok) return null
      const json = await res.json()
      content = json?.choices?.[0]?.message?.content ?? null
    }
    if (!content) return null
    const parsed = extractJsonObject(content) as { type?: string; confidence?: number; reason?: string }
    const t = parsed.type as ProjectType | undefined
    if (!t || !PROJECT_TYPES.includes(t)) return null
    return {
      type: t,
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.7,
      reason: parsed.reason || `Veyra hat ${t} erkannt.`,
    }
  } catch {
    return null
  }
}
