import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getProjectPreset, type ProjectType, type ExecutorRole } from '@/lib/project-modules'

export const runtime = 'nodejs'
export const maxDuration = 30

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

type AnalyzeOutput = {
  summary: string                       // 1-2 sentences in calm German
  project_area: string                  // "Checkout Mobile", "Brand Kit", "Lead-Funnel Landingpage", …
  affected_roles: ExecutorRole[]        // who is impacted
  suggested_tasks: Array<{ title: string; priority: 'low' | 'medium' | 'high'; reason: string }>
  open_questions: string[]              // bullet list, calm tone
  risks: string[]                       // bullet list, calm tone
  requires_client_approval: boolean
  confidence: number                    // 0..1
  source: 'ai' | 'heuristic'            // which path produced this
}

/**
 * POST /api/assets/analyze
 *
 * Body: { assetId: string }
 *
 * Reads the asset (image / external link / file metadata) + the parent
 * project's type and produces a structured analysis Tagro can hand to
 * the rest of the system. Persists to project_assets.analysis_result +
 * analyzed_at and sets status='analyzed'. Also drops an inbox item so
 * the client sees the new signal without polling.
 *
 * Auth: session cookie. RLS is bypassed for the read/update via service
 * key once the user is confirmed.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { assetId?: string }
    const assetId = body.assetId
    if (!assetId) return NextResponse.json({ ok: false, error: 'assetId_required' }, { status: 400 })

    const cookieStore = cookies()
    const sbCookie = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(_cookies: { name: string; value: string; options: CookieOptions }[]) { /* read-only */ },
      },
    })
    const { data: { user } } = await sbCookie.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ ok: false, error: 'service_key_missing' }, { status: 500 })
    const sb = createServiceClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1) Pull asset + parent project for context.
    const { data: asset } = await sb
      .from('project_assets')
      .select('id, project_id, workspace_id, kind, category, title, description, storage_path, external_url, mime_type, size_bytes')
      .eq('id', assetId)
      .maybeSingle()
    if (!asset) return NextResponse.json({ ok: false, error: 'asset_not_found' }, { status: 404 })

    const { data: project } = await sb
      .from('projects')
      .select('id, title, description, project_type')
      .eq('id', (asset as any).project_id)
      .maybeSingle()
    if (!project) return NextResponse.json({ ok: false, error: 'project_not_found' }, { status: 404 })

    const projectType = ((project as any).project_type as ProjectType | null) || 'software'
    const preset = getProjectPreset(projectType)

    // 2) Build the OpenAI request — text-only for links/files, vision for images.
    let analysis: AnalyzeOutput | null = null
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      let imageUrl: string | null = null
      const a = asset as any
      if (a.kind === 'image' || a.kind === 'screenshot' || (a.mime_type && String(a.mime_type).startsWith('image/'))) {
        if (a.storage_path) {
          const { data: signed } = await sb.storage.from('project-assets').createSignedUrl(a.storage_path, 60 * 10)
          if (signed?.signedUrl) imageUrl = signed.signedUrl
        } else if (a.external_url && /\.(png|jpe?g|webp|gif|svg)$/i.test(a.external_url)) {
          imageUrl = a.external_url
        }
      }
      analysis = await analyzeWithOpenAI({
        apiKey: openaiKey,
        projectTitle: (project as any).title,
        projectType,
        projectTypeLabel: preset.label,
        suggestedRoles: preset.suggestedRoles,
        asset: a,
        imageUrl,
      })
    }

    // 3) Fallback heuristic so we always return something usable.
    if (!analysis) {
      analysis = heuristicAnalysis(asset as any, projectType, preset.suggestedRoles)
    }

    // 4) Persist.
    await sb.from('project_assets')
      .update({
        analysis_result: analysis,
        analyzed_at: new Date().toISOString(),
        status: 'analyzed',
      })
      .eq('id', assetId)

    // 5) Push an inbox item so the workspace sees the new signal.
    try {
      await sb.rpc('create_inbox_item', {
        p_user_id: (asset as any).uploaded_by || user.id,
        p_project_id: (asset as any).project_id,
        p_category: 'tagro',
        p_type: 'system_event',
        p_title: `Tagro hat ein Asset analysiert: ${(asset as any).title}`,
        p_body: analysis.summary,
        p_actor_id: null,
        p_source_table: 'project_assets',
        p_source_id: assetId,
        p_metadata: {
          asset_id: assetId,
          asset_kind: (asset as any).kind,
          actionable: analysis.suggested_tasks.length > 0,
        },
      })
    } catch { /* inbox failure must not block the analysis flow */ }

    return NextResponse.json({ ok: true, analysis })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'analyze_failed' }, { status: 500 })
  }
}

/** OpenAI path. JSON mode + optional vision input. */
async function analyzeWithOpenAI({ apiKey, projectTitle, projectType, projectTypeLabel, suggestedRoles, asset, imageUrl }: {
  apiKey: string
  projectTitle: string
  projectType: ProjectType
  projectTypeLabel: string
  suggestedRoles: ExecutorRole[]
  asset: any
  imageUrl: string | null
}): Promise<AnalyzeOutput | null> {
  try {
    const userContent: any[] = [
      {
        type: 'text',
        text: [
          `Projekt: ${projectTitle} (${projectTypeLabel}, type=${projectType})`,
          `Asset-Typ: ${asset.kind} · Kategorie: ${asset.category}`,
          `Titel: ${asset.title}`,
          asset.description ? `Beschreibung: ${asset.description}` : null,
          asset.external_url ? `Externer Link: ${asset.external_url}` : null,
          asset.mime_type ? `MIME: ${asset.mime_type}` : null,
          asset.size_bytes ? `Größe: ${asset.size_bytes} bytes` : null,
          `Bekannte Executor-Rollen im Projekt: ${suggestedRoles.join(', ')}`,
          '',
          'Analysiere das Asset und liefere eine ruhige, executive-orientierte Einschätzung. KEIN technisches Fachchinesisch. Auf Deutsch.',
          'Antworte AUSSCHLIESSLICH als JSON mit dem Schema:',
          '{',
          '  "summary": "1-2 ruhige Sätze, was dieses Asset für das Projekt bedeutet",',
          '  "project_area": "konkreter Bereich, z.B. Checkout Mobile / Lead-Funnel / Brand Kit",',
          '  "affected_roles": ["developer" | "designer" | "marketing_manager" | "ads_manager" | "seo_specialist" | "content_creator" | "project_manager" | "strategist" | "automation_expert" | "reviewer" | "client_success"],',
          '  "suggested_tasks": [{ "title": "kurz und actionable", "priority": "low|medium|high", "reason": "warum dieser Task" }],',
          '  "open_questions": ["…"],',
          '  "risks": ["…"],',
          '  "requires_client_approval": true|false,',
          '  "confidence": 0..1',
          '}',
        ].filter(Boolean).join('\n'),
      },
    ]
    if (imageUrl) userContent.push({ type: 'image_url', image_url: { url: imageUrl, detail: 'auto' } })

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: imageUrl ? 'gpt-4o' : 'gpt-4o-mini',
        temperature: 0.25,
        response_format: { type: 'json_object' },
        max_tokens: 600,
        messages: [
          { role: 'system', content: 'Du bist Tagro, AI-Orchestrator von Festag. Du analysierst Produktionsartefakte und übersetzt sie in operative Empfehlungen. Nur JSON ausgeben.' },
          { role: 'user', content: userContent as any },
        ],
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const content = json?.choices?.[0]?.message?.content
    if (!content) return null
    const parsed = JSON.parse(content) as Partial<AnalyzeOutput>
    return {
      summary: String(parsed.summary || '').trim() || 'Tagro hat das Asset registriert, aber noch keine eindeutige Lesart.',
      project_area: String(parsed.project_area || '').trim() || asset.title,
      affected_roles: Array.isArray(parsed.affected_roles) ? parsed.affected_roles.filter(Boolean).slice(0, 6) as ExecutorRole[] : [],
      suggested_tasks: Array.isArray(parsed.suggested_tasks) ? parsed.suggested_tasks.slice(0, 6).map((t: any) => ({
        title: String(t.title || '').trim().slice(0, 240),
        priority: ['low','medium','high'].includes(t.priority) ? t.priority : 'medium',
        reason: String(t.reason || '').trim().slice(0, 400),
      })).filter((t: any) => t.title) : [],
      open_questions: Array.isArray(parsed.open_questions) ? parsed.open_questions.slice(0, 6).map((q: any) => String(q).trim()).filter(Boolean) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 6).map((r: any) => String(r).trim()).filter(Boolean) : [],
      requires_client_approval: Boolean(parsed.requires_client_approval),
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.65,
      source: 'ai',
    }
  } catch {
    return null
  }
}

/** Deterministic fallback so analyze never returns nothing. */
function heuristicAnalysis(asset: any, projectType: ProjectType, suggestedRoles: ExecutorRole[]): AnalyzeOutput {
  const kind = asset.kind as string
  const baseRoles: ExecutorRole[] = (() => {
    if (kind === 'figma') return suggestedRoles.includes('designer') ? ['designer','developer'] as ExecutorRole[] : ['designer'] as ExecutorRole[]
    if (kind === 'loom' || kind === 'video') return ['project_manager','reviewer'] as ExecutorRole[]
    if (kind === 'pdf' || kind === 'document') return ['project_manager','strategist'] as ExecutorRole[]
    if (kind === 'image' || kind === 'screenshot') return suggestedRoles.includes('designer') ? ['designer','developer'] as ExecutorRole[] : ['developer'] as ExecutorRole[]
    return suggestedRoles.slice(0, 3) as ExecutorRole[]
  })()

  const tasks: Array<{ title: string; priority: 'low'|'medium'|'high'; reason: string }> = []
  if (kind === 'figma') tasks.push({ title: `${asset.title}: Design durchgehen und Akzeptanzkriterien definieren`, priority: 'high', reason: 'Neue Figma-Datei landet ohne Acceptance Criteria oft als Bug-Source.' })
  if (kind === 'pdf' || kind === 'document') tasks.push({ title: `${asset.title}: Inhalt auf neue Anforderungen scannen`, priority: 'medium', reason: 'Neue Doku kann Scope-Änderungen oder offene Fragen enthalten.' })
  if (kind === 'loom' || kind === 'video') tasks.push({ title: `${asset.title}: Video durchgehen und Erkenntnisse als Task ableiten`, priority: 'medium', reason: 'Looms tragen oft mehrere Tasks gleichzeitig.' })
  if (kind === 'image' || kind === 'screenshot') tasks.push({ title: `${asset.title}: Screenshot zuordnen, fehlt etwas im Build?`, priority: 'medium', reason: 'Screenshots dokumentieren Bugs oder Feature-Lücken.' })

  return {
    summary: `Tagro hat ${asset.title} (${kind}) gesichtet. Eine vollständige AI-Analyse läuft, sobald der OpenAI-Key gesetzt ist.`,
    project_area: asset.title,
    affected_roles: baseRoles,
    suggested_tasks: tasks,
    open_questions: ['Welche konkreten Anforderungen leiten sich aus dem Asset ab?'],
    risks: [],
    requires_client_approval: false,
    confidence: 0.4,
    source: 'heuristic',
  }
}
