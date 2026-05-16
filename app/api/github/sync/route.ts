import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/github/sync
 *
 * Trigger für den Daily-Sync. Diese Stub-Version validiert die Session
 * und beantwortet mit den aktuellen Zählern aus der DB — sie ruft die
 * GitHub-API noch NICHT auf. Sobald wir den GitHub-OAuth-Token-Pfad
 * abgesichert haben (Edge Function + verschlüsselte Tokens), wird hier
 * das echte Sync-Skript aufgerufen.
 */
export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    // Audit-Trail (best-effort)
    try {
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'github_sync_requested',
        entity_type: 'github',
        metadata: { triggered_at: new Date().toISOString(), via: 'manual_button' },
      })
    } catch { /* ignore — audit darf nicht den Aufruf blocken */ }

    // Counters (best-effort, RLS-aware)
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const [{ count: commits }, { count: prs }] = await Promise.all([
      (supabase as any).from('github_commits').select('*', { count: 'exact', head: true }).gte('committed_at', since),
      (supabase as any).from('github_pull_requests').select('*', { count: 'exact', head: true }).gte('updated_at_github', since),
    ])

    return NextResponse.json({
      ok: true,
      stub: true,
      message: 'GitHub-Sync wurde vorgemerkt. Der vollständige API-Pull läuft im Daily-Cron.',
      commits: commits ?? 0,
      prs: prs ?? 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
