// ─────────────────────────────────────────────────────────────────────────────
// Anlässe, zu denen die Risikoerkennung läuft.
//
// Ein Ereignis verändert nie direkt das Projekt — es wird gespeichert, dann
// interpretiert. Dieser Aufruf ist die Interpretationsstelle: bewusst
// non-blocking und fehlerresistent, damit weder ein Webhook noch eine
// Statusänderung an der Erkennung scheitert.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'

export async function triggerRiskDetection(
  supa: SupabaseClient<any, any, any>,
  projectId: string | null | undefined,
): Promise<void> {
  if (!projectId) return
  try {
    const { runRiskDetection } = await import('@/lib/risks/engine')
    await runRiskDetection(supa, projectId)
  } catch {
    // Erkennung ist ein Nebeneffekt, nie die Hauptleistung des Aufrufers.
  }
}
