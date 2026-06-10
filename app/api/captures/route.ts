/**
 * /api/captures — client capture loop ingestion.
 *
 * Single endpoint used by every recorder (in-app, Chrome extension, mobile).
 * Accepts a transcript + page context, lazily creates a draft row, and
 * triggers Tagro structuring on the side. The recorder gets the row back
 * immediately so the UI can show the draft + start polling for the
 * structured version.
 *
 * Auth: standard Supabase server session (the extension will get its own
 * short-lived token in a later slice; for now it can use the user session
 * the cookie carries when they're logged in to Festag in the same browser).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// CORS allow-list: the Chrome extension content script posts to this
// endpoint from arbitrary third-party origins (the page the client is
// reviewing). We mirror the origin so credentials can ride along.
const CORS_HEADERS = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Vary': 'Origin',
})

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS(req.headers.get('origin')) })
}

type Body = {
  projectId?: string
  pageUrl?: string
  pageTitle?: string
  selector?: string
  screenshotUrl?: string
  transcript?: string
  audioUrl?: string
  /** in_app · chrome_extension · mobile. Defaults to in_app. */
  source?: 'in_app' | 'chrome_extension' | 'mobile'
  /** When true the row is created with status='processing' and Tagro is
   *  triggered immediately. False keeps it as a 'draft'. */
  process?: boolean
}

export async function POST(req: NextRequest) {
  const sb = createServerClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Body
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  if (!body.projectId) return NextResponse.json({ error: 'projectId_required' }, { status: 400 })
  const transcript = (body.transcript || '').trim()

  // Look up the project to get its workspace (denormalised on the capture
  // for RLS and fast workspace-wide queries).
  const { data: project, error: pErr } = await sb
    .from('projects')
    .select('id,workspace_id')
    .eq('id', body.projectId)
    .single()
  if (pErr || !project?.workspace_id) {
    return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
  }

  const initialStatus = body.process && transcript ? 'processing' : 'draft'

  const { data: row, error: insErr } = await sb
    .from('client_captures')
    .insert({
      workspace_id: project.workspace_id,
      project_id: project.id,
      created_by: user.id,
      source: body.source ?? 'in_app',
      page_url: body.pageUrl ?? null,
      page_title: body.pageTitle ?? null,
      selector: body.selector ?? null,
      screenshot_url: body.screenshotUrl ?? null,
      transcript,
      audio_url: body.audioUrl ?? null,
      status: initialStatus,
    })
    .select('*')
    .single()
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // Fire-and-forget structuring. Wrapped in a try so a structuring failure
  // never breaks the ingestion contract.
  if (initialStatus === 'processing') {
    try {
      await structureCapture(sb, row.id)
    } catch (e: any) {
      // leave row as-is so the user can retry; surface the error
      console.error('captures.structure failed:', e?.message || e)
    }
  }

  return NextResponse.json({ capture: row })
}

/**
 * Pulls the capture, runs it through Tagro to produce structured
 * change-scripts, and writes the result back. Kept inline so the same
 * code path is used whether the API triggered it or the user clicked
 * 'Strukturieren'.
 */
async function structureCapture(sb: ReturnType<typeof createServerClient>, captureId: string) {
  const { data: cap } = await sb
    .from('client_captures')
    .select('id,project_id,page_url,page_title,transcript')
    .eq('id', captureId)
    .single()
  if (!cap) return

  const { tagroComplete } = await import('@/lib/tagro/complete')
  const { extractJsonObject } = await import('@/lib/tagro/json')

  const SYSTEM = `Du bist Tagro, die AI-Kontrollschicht von Festag. Du verarbeitest rohe Client-Feedback-Aufnahmen (gesprochen während einer Live-Walkthrough-Session) zu klaren, ausführbaren Change-Scripts für Developer. Du erfindest nichts.

Eingabeformat: Der Transcript ist nach Seiten gegliedert. Jede Seite beginnt mit "[Seite: <url-oder-bereich>]" gefolgt von einer Liste aufgenommener Sätze. Mehrere Seiten sind möglich.

Antworte AUSSCHLIESSLICH als valides JSON in diesem Schema:
{
  "summary": "1-2 Sätze: was will der Kunde insgesamt, über alle Seiten hinweg?",
  "changes": [
    {
      "title": "kurz, imperativ",
      "description": "1-3 Sätze, sachlich, kein Marketing",
      "affected": "URL oder Bereich der Seite, plus konkretes Element falls genannt — z.B. '/preise · Hero · Headline'",
      "suggested": "Konkrete Umsetzung in einem Satz"
    }
  ],
  "warnings": []
}

Regeln:
- Eine "change" entspricht EINEM zusammenhängenden Wunsch. Pro Seite können mehrere changes entstehen.
- affected muss die Seite ausweisen, damit der Dev weiß, wo er hin muss.
- Wenn der Kunde redundant ist (mehrmals dasselbe sagt), fasse zusammen.
- max 12 changes pro Capture.
- warnings: 0-3 kurze Hinweise (Scope unklar, technisch nicht möglich, widersprüchliche Wünsche, etc.) oder leer.
- changes: leer wenn der Transcript nichts Umsetzbares enthält.`

  const userPrompt = [
    cap.page_title ? `Seite: ${cap.page_title}` : '',
    cap.page_url ? `URL: ${cap.page_url}` : '',
    `Client-Feedback:\n${cap.transcript || '(leer)'}`,
    'Antworte mit dem JSON-Schema.',
  ].filter(Boolean).join('\n\n')

  const ai = await tagroComplete({
    system: SYSTEM,
    prompt: userPrompt,
    maxTokens: 900,
    temperature: 0.2,
    json: true,
  })

  let summary = ''
  let changes: any[] = []
  let warnings: string[] = []
  if (ai.ok && ai.text.trim()) {
    try {
      const parsed = extractJsonObject(ai.text) as any
      summary = String(parsed?.summary ?? '').trim()
      changes = Array.isArray(parsed?.changes) ? parsed.changes.slice(0, 6) : []
      warnings = Array.isArray(parsed?.warnings)
        ? parsed.warnings.filter((w: any) => typeof w === 'string').slice(0, 3)
        : []
    } catch {/* fall through to ready_review with empty changes */}
  }

  await sb
    .from('client_captures')
    .update({
      structured_changes: changes,
      tagro_summary: summary,
      warnings,
      status: 'ready_review',
    })
    .eq('id', captureId)
}

/**
 * GET /api/captures?projectId=… (or ?workspaceId=…)
 * — list captures the caller can see (RLS gates everything; we only filter).
 */
export async function GET(req: NextRequest) {
  const sb = createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const projectId = url.searchParams.get('projectId')
  const status = url.searchParams.get('status')

  let q = sb
    .from('client_captures')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (projectId) q = q.eq('project_id', projectId)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ captures: data ?? [] })
}
