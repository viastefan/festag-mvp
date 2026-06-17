import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/notes/quick   { text: string, project_id?: string }
 *
 * One-shot capture used by the global ⌘⇧N shortcut and the /more page.
 * Extracts the first sentence as the title and stores the rest as body.
 * Optionally pre-attaches a project_id (e.g. when triggered from a
 * project detail page). Returns the new note so the caller can route
 * to /notes?open=<id>.
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { text, project_id, note_type } = (await req.json().catch(() => ({}))) as {
    text?: string; project_id?: string; note_type?: string
  }
  const raw = (text || '').trim()
  if (!raw) return NextResponse.json({ error: 'empty' }, { status: 400 })

  // Split first sentence → title (max 120 chars), rest → body.
  const firstBreak = raw.search(/[\n.!?]/)
  const title = (firstBreak > 0 ? raw.slice(0, firstBreak) : raw).trim().slice(0, 120) || 'Schnelle Notiz'
  const body  = firstBreak > 0 ? raw.slice(firstBreak + 1).trim() : ''

  const { data, error } = await (supa as any).from('notes').insert({
    user_id: user.id,
    title,
    body: body || null,
    project_id: project_id || null,
    note_type: ['journal','brief','meeting','research'].includes(note_type || '') ? note_type : 'journal',
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}
