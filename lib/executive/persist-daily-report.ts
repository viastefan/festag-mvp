import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExecutiveDailyReport } from '@/lib/executive/types'

function todayBerlin(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export async function fetchPersistedDailyReport(
  sb: SupabaseClient<any>,
  userId: string,
): Promise<ExecutiveDailyReport | null> {
  try {
    const { data } = await sb
      .from('executive_daily_reports')
      .select('title,body,highlights,source,generated_at')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(5)

    const rows = (data as any[]) ?? []
    const today = todayBerlin()
    const todayRow = rows.find(r => String(r.generated_at ?? '').slice(0, 10) === today)
    const pick = todayRow ?? rows[0]
    if (!pick?.body?.trim()) return null

    return {
      title: pick.title || 'Tagro Tagesbericht',
      date_label: new Intl.DateTimeFormat('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Berlin',
      }).format(new Date(pick.generated_at || Date.now())),
      body: String(pick.body).trim(),
      highlights: Array.isArray(pick.highlights) ? pick.highlights.map(String) : [],
      source: pick.source || 'synthesized',
      generated_at: pick.generated_at || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function persistExecutiveDailyReport(
  sb: SupabaseClient<any>,
  userId: string,
  report: ExecutiveDailyReport,
): Promise<void> {
  try {
    await sb.from('executive_daily_reports').insert({
      user_id: userId,
      title: report.title,
      body: report.body,
      highlights: report.highlights,
      source: report.source === 'tagro' ? 'tagro' : report.source,
      generated_at: report.generated_at,
    })
  } catch {
    // Table may not exist until migration runs — non-fatal.
  }
}
