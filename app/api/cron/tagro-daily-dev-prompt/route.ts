import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

/**
 * Cron · 16:00 Europe/Berlin (= 14:00 UTC standard, 15:00 UTC summer).
 *
 * Schedule in vercel.json runs at both 14 and 15 UTC; this handler is
 * idempotent (unique (developer_id, project_id, prompt_date)) so the
 * duplicate fire is harmless.
 *
 * What it does:
 *   1. Pull every active project_assignment.
 *   2. For each (dev, project) insert a `dev_daily_prompts` row for today
 *      with state='open'. Existing rows from earlier today are kept.
 *   3. Insert a notification per dev so the dev sees the prompt instantly
 *      (the /dev shell renders the latest open prompt as a card).
 *
 * Runs with the service role — bypasses RLS, never touches user input.
 */
export const runtime = 'nodejs'

function todayBerlin(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())
}

function isAuthorised(req: Request): boolean {
  // Vercel cron sends `Authorization: Bearer <CRON_SECRET>`. If the secret
  // isn't configured we still allow the call from a Vercel cron header.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const header = req.headers.get('authorization') || ''
    return header === `Bearer ${secret}`
  }
  return !!req.headers.get('x-vercel-cron')
}

export async function GET(req: Request) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 })
  }
  const sb = getServiceClient()
  if (!sb) return NextResponse.json({ error: 'no_service_key' }, { status: 503 })

  const date = todayBerlin()

  // 1) Pull active devs scoped to live projects.
  const { data: assignments } = await sb
    .from('project_assignments')
    .select('user_id, project_id, projects!inner(id, title, status, user_id, client_id)')
    .eq('active', true)

  type Row = { user_id: string; project_id: string; projects: { id: string; title: string; status: string | null; user_id: string | null; client_id: string | null } }
  const rows = ((assignments as any[]) ?? []) as Row[]
  // skip archived / done projects — no point prompting if the work is shipped.
  const live = rows.filter(r => r.projects && !['done', 'archived'].includes(String(r.projects.status ?? '')))

  if (live.length === 0) {
    return NextResponse.json({ ok: true, prompts: 0, note: 'no_active_assignments' })
  }

  // 2) Upsert prompt rows. Ignore conflicts (already prompted today).
  const promptRows = live.map(r => ({
    developer_id: r.user_id,
    project_id: r.project_id,
    prompt_date: date,
    state: 'open',
    payload: { source: 'cron_16', project_title: r.projects.title },
  }))
  const { error: upErr } = await sb.from('dev_daily_prompts').upsert(promptRows, { onConflict: 'developer_id,project_id,prompt_date', ignoreDuplicates: true })
  if (upErr) {
    return NextResponse.json({ error: upErr.message, stage: 'upsert' }, { status: 500 })
  }

  // 3) One notification per dev, regardless of how many projects they have.
  const byDev = new Map<string, Row[]>()
  for (const r of live) {
    const list = byDev.get(r.user_id) ?? []
    list.push(r)
    byDev.set(r.user_id, list)
  }

  const notifs: any[] = []
  byDev.forEach((projects, devId) => {
    const count = projects.length
    notifs.push({
      user_id: devId,
      kind: 'tagro_daily_prompt',
      type: 'tagro_daily_prompt',
      audience: 'dev',
      title: count === 1
        ? `Wie weit bist du heute mit ${projects[0].projects.title} gekommen?`
        : `Veyra fragt: dein Stand zu ${count} Projekten`,
      body: 'Schick einen kurzen Satz oder eine kleine Aufnahme — ich übersetze es ruhig für deinen Client.',
      message: 'Schick einen kurzen Satz oder eine kleine Aufnahme — ich übersetze es ruhig für deinen Client.',
      link: '/dev',
      payload: { date, project_count: count },
      read: false,
    })
  })

  if (notifs.length > 0) {
    await sb.from('notifications').insert(notifs).then(() => null, () => null)
  }

  return NextResponse.json({
    ok: true,
    date,
    prompts: live.length,
    devs_notified: byDev.size,
  })
}

// Also expose POST so the Vercel cron config can use either method
// without us caring which it chose.
export const POST = GET
