import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, getRouteUser } from '@/lib/supabase/route-handler'
import {
  buildMonthBuckets,
  changePercent,
  formatEurCents,
  inRange,
  periodBounds,
  previousPeriodBounds,
  resolveEarningsView,
  type EarningsActivity,
  type EarningsOverview,
  type EarningsPeriodKey,
  type EarningsTransaction,
} from '@/lib/settings/earnings'

export const runtime = 'nodejs'

const PERIOD_KEYS = new Set<EarningsPeriodKey>(['30d', '90d', 'year', 'all'])

/**
 * Settings → Einnahmen & Auszahlungen overview.
 * Agency: paid / outstanding Rechnungen from agency_documents.
 * Earnings (team / delivery / dev): paid milestone payments + time-entry soft signals.
 */
export async function GET(req: NextRequest) {
  const user = await getRouteUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
  }

  const supa = createRouteHandlerClient(req)
  const periodKey = (req.nextUrl.searchParams.get('period') || 'year') as EarningsPeriodKey
  const key = PERIOD_KEYS.has(periodKey) ? periodKey : 'year'
  const { from, to, label } = periodBounds(key)

  const [{ data: profile }, { data: personalWs }] = await Promise.all([
    (supa as any).from('profiles').select('role,hourly_rate').eq('id', user.id).maybeSingle(),
    (supa as any)
      .from('workspaces')
      .select('id,mode')
      .eq('primary_owner_id', user.id)
      .eq('is_personal', true)
      .maybeSingle(),
  ])

  let workspaceMode = (personalWs?.mode ?? null) as 'delivery' | 'team' | 'agency' | null
  if (!workspaceMode) {
    const { data: membership } = await (supa as any)
      .from('workspace_members')
      .select('workspace_id, workspaces(id, mode)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    workspaceMode = (membership?.workspaces?.mode ?? null) as typeof workspaceMode
  }
  const view = resolveEarningsView(workspaceMode, profile?.role ?? null)

  const overview =
    view === 'agency'
      ? await buildAgencyOverview(supa, { from, to, label, key, workspaceMode })
      : await buildEarningsOverview(supa, user.id, {
          from,
          to,
          label,
          key,
          workspaceMode,
          hourlyRate: typeof profile?.hourly_rate === 'number' ? profile.hourly_rate : null,
        })

  return NextResponse.json(overview)
}

async function buildAgencyOverview(
  supa: any,
  opts: {
    from: Date | null
    to: Date
    label: string
    key: EarningsPeriodKey
    workspaceMode: 'delivery' | 'team' | 'agency' | null
  },
): Promise<EarningsOverview> {
  const { data, error } = await supa
    .from('agency_documents')
    .select('id,kind,number_label,title,status,total_cents,currency,created_at,updated_at,agency_clients(name)')
    .eq('kind', 'rechnung')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return emptyOverview('agency', opts.workspaceMode, opts.key, opts.label, opts.from, opts.to)
  }

  const docs = (data ?? []) as Array<{
    id: string
    number_label: string | null
    title: string | null
    status: string
    total_cents: number | null
    currency: string | null
    created_at: string
    updated_at?: string | null
    agency_clients?: { name?: string } | null
  }>

  const paidInPeriod = docs.filter(
    d => d.status === 'paid' && inRange(d.updated_at || d.created_at, opts.from, opts.to),
  )
  const prev = previousPeriodBounds(opts.from, opts.to)
  const paidPrev = prev
    ? docs.filter(
        d => d.status === 'paid' && inRange(d.updated_at || d.created_at, prev.from, prev.to),
      )
    : []

  const totalCents = sumCents(paidInPeriod)
  const previousTotalCents = sumCents(paidPrev)
  const outstandingCents = docs
    .filter(d => d.status === 'sent' || d.status === 'final')
    .reduce((acc, d) => acc + (d.total_cents || 0), 0)

  const buckets = buildMonthBuckets(opts.to, opts.key === '30d' ? 4 : 12)
  const chart = buckets.map(b => ({
    label: b.label,
    cents: docs
      .filter(d => {
        if (d.status !== 'paid') return false
        const t = new Date(d.updated_at || d.created_at).getTime()
        return t >= b.start.getTime() && t <= b.end.getTime()
      })
      .reduce((acc, d) => acc + (d.total_cents || 0), 0),
  }))

  const transactions: EarningsTransaction[] = docs.slice(0, 12).map(d => {
    const cents = d.total_cents || 0
    const paid = d.status === 'paid'
    return {
      id: d.id,
      date: d.updated_at || d.created_at,
      status: d.status,
      statusLabel: agencyStatusLabel(d.status),
      type: paid ? 'payment' : 'invoice',
      typeLabel: paid ? 'Zahlung' : 'Rechnung',
      amountCents: cents,
      netCents: cents,
      currency: d.currency || 'EUR',
      title: d.number_label || d.title,
    }
  })

  const activity: EarningsActivity[] = docs.slice(0, 8).map(d => {
    const cents = d.total_cents || 0
    const client = d.agency_clients?.name
    const amt = formatEurCents(cents, d.currency || 'EUR')
    const paid = d.status === 'paid'
    const text = paid
      ? `Zahlung über ${amt}${client ? ` von ${client}` : ''} ist eingegangen.`
      : d.status === 'sent'
        ? `Rechnung ${d.number_label || ''} über ${amt}${client ? ` an ${client}` : ''} wurde gesendet.`
        : `Rechnung ${d.number_label || d.title || ''} über ${amt} ist ${agencyStatusLabel(d.status).toLowerCase()}.`
    return {
      id: d.id,
      date: d.updated_at || d.created_at,
      text: text.replace(/\s+/g, ' ').trim(),
    }
  })

  return {
    view: 'agency',
    workspaceMode: opts.workspaceMode,
    period: {
      key: opts.key,
      label: opts.label,
      from: opts.from?.toISOString() ?? null,
      to: opts.to.toISOString(),
    },
    hero: {
      totalCents,
      previousTotalCents,
      changePercent: changePercent(totalCents, previousTotalCents),
    },
    chart,
    balance: {
      availableCents: Math.max(0, totalCents - 0),
      outstandingCents,
      nextPayoutLabel: null,
    },
    transactions,
    activity,
    empty: docs.length === 0,
  }
}

async function buildEarningsOverview(
  supa: any,
  userId: string,
  opts: {
    from: Date | null
    to: Date
    label: string
    key: EarningsPeriodKey
    workspaceMode: 'delivery' | 'team' | 'agency' | null
    hourlyRate: number | null
  },
): Promise<EarningsOverview> {
  const { data: assignments } = await (supa as any)
    .from('project_assignments')
    .select('project_id')
    .eq('user_id', userId)
    .eq('active', true)

  const assignedIds = new Set<string>((assignments ?? []).map((a: any) => a.project_id).filter(Boolean))

  const { data: ownedProjects } = await (supa as any)
    .from('projects')
    .select('id')
    .or(`assigned_dev.eq.${userId},user_id.eq.${userId}`)
    .limit(200)

  for (const p of ownedProjects ?? []) {
    if (p?.id) assignedIds.add(p.id)
  }

  const projectIds = Array.from(assignedIds)
  let payments: Array<{
    id: string
    status: string
    amount: number
    currency: string | null
    description: string | null
    created_at: string
    updated_at?: string | null
    project_id?: string | null
  }> = []

  if (projectIds.length > 0) {
    const { data } = await (supa as any)
      .from('payments')
      .select('id,status,amount,currency,description,created_at,updated_at,project_id')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(200)
    payments = data ?? []
  }

  // Also include payments owned by the user (client-side payers / legacy rows).
  const { data: ownPayments } = await (supa as any)
    .from('payments')
    .select('id,status,amount,currency,description,created_at,updated_at,project_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  const seen = new Set(payments.map(p => p.id))
  for (const p of ownPayments ?? []) {
    if (!seen.has(p.id)) payments.push(p)
  }
  payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const paidInPeriod = payments.filter(
    p => p.status === 'paid' && inRange(p.updated_at || p.created_at, opts.from, opts.to),
  )
  const prev = previousPeriodBounds(opts.from, opts.to)
  const paidPrev = prev
    ? payments.filter(
        p => p.status === 'paid' && inRange(p.updated_at || p.created_at, prev.from, prev.to),
      )
    : []

  const totalCents = paidInPeriod.reduce((acc, p) => acc + Math.round(Number(p.amount || 0) * 100), 0)
  const previousTotalCents = paidPrev.reduce((acc, p) => acc + Math.round(Number(p.amount || 0) * 100), 0)

  // Soft pending: unpaid / pending payments
  const pendingCents = payments
    .filter(p => p.status === 'pending')
    .reduce((acc, p) => acc + Math.round(Number(p.amount || 0) * 100), 0)

  const buckets = buildMonthBuckets(opts.to, opts.key === '30d' ? 4 : 12)
  const chart = buckets.map(b => ({
    label: b.label,
    cents: payments
      .filter(p => {
        if (p.status !== 'paid') return false
        const t = new Date(p.updated_at || p.created_at).getTime()
        return t >= b.start.getTime() && t <= b.end.getTime()
      })
      .reduce((acc, p) => acc + Math.round(Number(p.amount || 0) * 100), 0),
  }))

  const transactions: EarningsTransaction[] = payments.slice(0, 12).map(p => {
    const cents = Math.round(Number(p.amount || 0) * 100)
    return {
      id: p.id,
      date: p.updated_at || p.created_at,
      status: p.status,
      statusLabel: paymentStatusLabel(p.status),
      type: 'earning',
      typeLabel: 'Verdienst',
      amountCents: cents,
      netCents: cents,
      currency: p.currency || 'EUR',
      title: p.description,
    }
  })

  // Optional time-entry activity (not counted as cash until payout exists).
  let timeActivity: EarningsActivity[] = []
  if (opts.hourlyRate && opts.hourlyRate > 0) {
    const { data: entries } = await (supa as any)
      .from('time_entries')
      .select('id,seconds,ended_at,created_at,note')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    timeActivity = (entries ?? []).map((e: any) => {
      const hours = (Number(e.seconds) || 0) / 3600
      const estimate = formatEurCents(Math.round(hours * opts.hourlyRate! * 100))
      return {
        id: `te-${e.id}`,
        date: e.ended_at || e.created_at,
        text: `Zeiteintrag erfasst — geschätzter Verdienst ca. ${estimate}.`,
      }
    })
  }

  const payActivity: EarningsActivity[] = payments.slice(0, 8).map(p => {
    const cents = Math.round(Number(p.amount || 0) * 100)
    const amt = formatEurCents(cents, p.currency || 'EUR')
    const text =
      p.status === 'paid'
        ? `Dein Verdienst in Höhe von ${amt} wurde als bezahlt markiert.`
        : p.status === 'pending'
          ? `Zahlung über ${amt} steht noch aus.`
          : `Zahlung über ${amt}: ${paymentStatusLabel(p.status)}.`
    return { id: p.id, date: p.updated_at || p.created_at, text }
  })

  const activity = [...payActivity, ...timeActivity]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  return {
    view: 'earnings',
    workspaceMode: opts.workspaceMode,
    period: {
      key: opts.key,
      label: opts.label,
      from: opts.from?.toISOString() ?? null,
      to: opts.to.toISOString(),
    },
    hero: {
      totalCents,
      previousTotalCents,
      changePercent: changePercent(totalCents, previousTotalCents),
    },
    chart,
    balance: {
      availableCents: Math.max(0, totalCents),
      outstandingCents: pendingCents,
      nextPayoutLabel: null,
    },
    transactions,
    activity,
    empty: payments.length === 0 && timeActivity.length === 0,
  }
}

function sumCents(rows: Array<{ total_cents: number | null }>) {
  return rows.reduce((acc, d) => acc + (d.total_cents || 0), 0)
}

function agencyStatusLabel(status: string): string {
  switch (status) {
    case 'paid':
      return 'Bezahlt'
    case 'sent':
      return 'Gesendet'
    case 'final':
      return 'Offen'
    case 'draft':
      return 'Entwurf'
    default:
      return status
  }
}

function paymentStatusLabel(status: string): string {
  switch (status) {
    case 'paid':
      return 'Erfolgreich'
    case 'pending':
      return 'Ausstehend'
    case 'failed':
      return 'Fehlgeschlagen'
    case 'refunded':
      return 'Erstattet'
    default:
      return status
  }
}

function emptyOverview(
  view: 'agency' | 'earnings',
  workspaceMode: 'delivery' | 'team' | 'agency' | null,
  key: EarningsPeriodKey,
  label: string,
  from: Date | null,
  to: Date,
): EarningsOverview {
  return {
    view,
    workspaceMode,
    period: { key, label, from: from?.toISOString() ?? null, to: to.toISOString() },
    hero: { totalCents: 0, previousTotalCents: 0, changePercent: 0 },
    chart: buildMonthBuckets(to).map(b => ({ label: b.label, cents: 0 })),
    balance: { availableCents: 0, outstandingCents: 0, nextPayoutLabel: null },
    transactions: [],
    activity: [],
    empty: true,
  }
}
