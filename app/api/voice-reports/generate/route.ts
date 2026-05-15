import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildVoiceBriefingData, VoiceBriefingService, type VoiceBriefingMode } from '@/lib/voice/voice-briefing-service'

export const runtime = 'nodejs'

type ProjectRow = { id: string; title: string; status?: string | null; description?: string | null; color?: string | null }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { projectId?: string | null; mode?: VoiceBriefingMode }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

    let project: ProjectRow | null = null
    if (body.projectId) {
      const { data } = await sb.from('projects').select('id,title,status,description,color').eq('id', body.projectId).maybeSingle()
      project = data as ProjectRow | null
    } else {
      const { data } = await sb.from('projects').select('id,title,status,description,color').order('created_at', { ascending: false }).limit(1).maybeSingle()
      project = data as ProjectRow | null
    }

    if (!project) {
      return NextResponse.json({ ok: true, state: 'unavailable', message: 'Noch kein Projektstatus verfügbar. Aktualisiere zuerst dein Briefing.' })
    }

    const [{ data: latestReport }, { data: taskRows }, { data: devRows }] = await Promise.all([
      sb.from('ai_updates').select('id,content,created_at').eq('project_id', project.id).eq('type', 'status_report').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      sb.from('tasks').select('id,title,status,priority,updated_at').eq('project_id', project.id).order('updated_at', { ascending: false }),
      sb.from('ai_updates').select('content').eq('project_id', project.id).eq('type', 'dev_progress_update').order('created_at', { ascending: false }).limit(8),
    ])

    if (!latestReport) {
      return NextResponse.json({ ok: true, state: 'unavailable', project, message: 'Noch kein Projektstatus verfügbar. Aktualisiere zuerst dein Briefing.' })
    }

    const data = buildVoiceBriefingData({
      project,
      latestReport: latestReport as any,
      tasks: (taskRows as any[]) ?? [],
      devUpdates: ((devRows as any[]) ?? []).map((row) => row.content).filter(Boolean),
    })
    const service = new VoiceBriefingService()
    const text = service.generateVoiceBriefingText(data, body.mode ?? 'full')
    const audio = await service.generateAudioFromText(text, { voice: 'alloy', format: 'mp3', speed: 0.95 })

    return NextResponse.json({ ok: true, state: text ? 'ready' : 'unavailable', project, text, audio, mode: body.mode ?? 'full' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, state: 'error', error: e?.message ?? 'voice_report_failed' }, { status: 500 })
  }
}
