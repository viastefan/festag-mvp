import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { taskStatusPatch } from '@/lib/tasks/status'
import { tagroComplete } from '@/lib/tagro/complete'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

function fallbackCustomerUpdate(devNote: string) {
  const note = devNote.trim()
  if (!note) return 'Es gibt ein neues Developer-Update. Tagro bereitet die verständliche Einordnung vor.'
  return `Es gibt ein neues Update aus der Umsetzung: ${note.length > 220 ? `${note.slice(0, 220)}…` : note}`
}

async function translateWithTagro(devNote: string) {
  const system = 'Du bist Tagro, die Übersetzungsschicht von Festag. Übersetze technische Developer-Notizen in kundenfreundliche Projekt-Updates. Maximal 2 kurze Sätze. Deutsch. Kein Fachjargon. Ehrlich, ruhig, konkret.'
  const ai = await tagroComplete({
    system,
    prompt: `Developer-Notiz: ${devNote}`,
    maxTokens: 700,
    temperature: 0.2,
  })
  if (ai.ok && ai.text.trim()) return ai.text.trim()
  return fallbackCustomerUpdate(devNote)
}

export async function POST(req: NextRequest) {
  try {
    const { taskId, devNote, projectId, status } = await req.json()
    if (!devNote?.trim()) return NextResponse.json({ error: 'devNote missing' }, { status: 400 })

    const customerUpdate = await translateWithTagro(devNote)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (serviceKey) {
      const sb = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      if (taskId) {
        const updatePayload: Record<string, unknown> = {
          dev_notes: devNote,
          customer_update: customerUpdate,
          updated_at: new Date().toISOString(),
        }
        if (status) Object.assign(updatePayload, taskStatusPatch(status))
        await sb.from('tasks').update(updatePayload).eq('id', taskId)
      }

      if (projectId) {
        await sb.from('messages').insert({ project_id: projectId, message: customerUpdate, is_ai: true }).catch(() => {})
        await sb.from('activity_feed').insert({ project_id: projectId, type: 'dev_update', message: `Tagro Client Update: ${customerUpdate}` }).catch(() => {})
        await sb.from('ai_updates').insert({ project_id: projectId, type: 'dev_progress_update', content: customerUpdate }).catch(() => {})
      }
    }

    return NextResponse.json({ customerUpdate })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'progress update failed' }, { status: 500 })
  }
}
