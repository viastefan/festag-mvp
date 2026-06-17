import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/inbox/welcome
 *
 * Posts the Festag welcome message into the user's structured inbox.
 * Idempotent: `create_inbox_item` upserts on (source_table, source_id),
 * so calling this on every inbox load only ever yields one welcome item
 * per user — and never re-marks it unread once read.
 *
 * The inbox page (and dashboard) fire this on load, so every account —
 * however it was registered — receives the welcome exactly once.
 */
export const runtime = 'nodejs'

const WELCOME_TITLE = 'Willkommen bei Festag'

const WELCOME_BODY = `Schön, dass du da bist.

Festag ist dein ruhiger Projektraum — kein Cockpit, kein Fachchinesisch. So funktioniert es:

· Statusabfrage — auf dem Dashboard tippst du auf „Status abrufen", und Tagro schreibt dir den aktuellen Projektstand ruhig zusammen. Ein Klick genügt.

· Posteingang — hier landen strukturierte Eingänge: neue Projektstände von deinem Team, Rechnungen und Entscheidungen, die auf dich warten.

· Projekte — jedes Projekt hat seine eigene Seite mit Aufgaben, Meilensteinen und einem direkten Draht zu Tagro.

· Dein Team meldet sich. Jedes Entwickler-Update wird von Tagro in einen klaren Stand für dich übersetzt — du musst nichts Technisches lesen.

Hast du eine Frage? Stell sie einfach im Tagro-Chat des jeweiligen Projekts. Wir sind da.`

// Sobald das Einführungsvideo steht: URL hier eintragen — der Posteingang
// blendet dann automatisch einen „Einführung ansehen"-Button ein.
const WELCOME_VIDEO_URL = ''

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const sb = getServiceClient()
    if (!sb) return NextResponse.json({ ok: false, skipped: 'no_service_client' })

    const { data, error } = await sb.rpc('create_inbox_item', {
      p_user_id: user.id,
      p_project_id: null,
      p_category: 'system',
      p_type: 'system_event',
      p_title: WELCOME_TITLE,
      p_body: WELCOME_BODY,
      p_actor_id: null,
      p_source_table: 'welcome',
      p_source_id: user.id,
      p_metadata: {
        thread_title: 'System',
        source_label: 'Festag',
        video_url: WELCOME_VIDEO_URL,
      },
    })
    if (error) return NextResponse.json({ ok: false, error: error.message })
    return NextResponse.json({ ok: true, itemId: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
