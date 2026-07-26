/** Shared types + helpers for Settings → Einnahmen & Auszahlungen. */

export type EarningsView = 'agency' | 'earnings'
export type EarningsPeriodKey = '30d' | '90d' | 'year' | 'all'

export type EarningsTransaction = {
  id: string
  date: string
  status: string
  statusLabel: string
  type: 'payment' | 'payout' | 'invoice' | 'earning'
  typeLabel: string
  amountCents: number
  netCents: number
  currency: string
  title?: string | null
  href?: string | null
}

export type EarningsActivity = {
  id: string
  date: string
  text: string
  href?: string | null
}

export type EarningsChartPoint = {
  label: string
  cents: number
}

export type EarningsOverview = {
  view: EarningsView
  workspaceMode: 'delivery' | 'team' | 'agency' | null
  period: {
    key: EarningsPeriodKey
    label: string
    from: string | null
    to: string
  }
  hero: {
    totalCents: number
    previousTotalCents: number
    changePercent: number | null
  }
  chart: EarningsChartPoint[]
  balance: {
    availableCents: number
    outstandingCents: number
    nextPayoutLabel: string
  }
  transactions: EarningsTransaction[]
  activity: EarningsActivity[]
  empty: boolean
}

export const EARNINGS_PERIODS: { key: EarningsPeriodKey; label: string }[] = [
  { key: '30d', label: 'Letzte 30 Tage' },
  { key: '90d', label: 'Letzte 90 Tage' },
  { key: 'year', label: 'Letztes Jahr' },
  { key: 'all', label: 'Gesamter Zeitraum' },
]

export function resolveEarningsView(
  workspaceMode: 'delivery' | 'team' | 'agency' | null,
  role: string | null | undefined,
): EarningsView {
  if (workspaceMode === 'agency') return 'agency'
  if (role === 'dev' || workspaceMode === 'team' || workspaceMode === 'delivery') return 'earnings'
  return 'earnings'
}

export function periodBounds(key: EarningsPeriodKey, now = new Date()): { from: Date | null; to: Date; label: string } {
  const to = now
  const label = EARNINGS_PERIODS.find(p => p.key === key)?.label ?? 'Letztes Jahr'
  if (key === 'all') return { from: null, to, label }
  const from = new Date(now)
  if (key === '30d') from.setDate(from.getDate() - 30)
  else if (key === '90d') from.setDate(from.getDate() - 90)
  else from.setFullYear(from.getFullYear() - 1)
  return { from, to, label }
}

export function previousPeriodBounds(from: Date | null, to: Date): { from: Date; to: Date } | null {
  if (!from) return null
  const ms = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 1)
  const prevFrom = new Date(prevTo.getTime() - ms)
  return { from: prevFrom, to: prevTo }
}

export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

export function formatEurCents(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format((cents || 0) / 100)
}

export function formatEurAmount(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount || 0)
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

export function formatActivityDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Honest payout copy until Connect / Auszahlungskonto exists. */
export function resolveNextPayoutLabel(availableCents: number, outstandingCents: number): string {
  if (availableCents > 0) return 'Nicht geplant'
  if (outstandingCents > 0) return 'Nach Zahlungseingang'
  return 'Keine Auszahlung fällig'
}

const MONTH_SHORT = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.']
const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

export type ChartBucket = { key: string; label: string; start: Date; end: Date }

/** Build up to 12 monthly buckets ending at `to`. */
export function buildMonthBuckets(to: Date, count = 12): ChartBucket[] {
  const buckets: ChartBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(to.getFullYear(), to.getMonth() - i, 1)
    const end = new Date(to.getFullYear(), to.getMonth() - i + 1, 0, 23, 59, 59, 999)
    const showYear = start.getMonth() === 0 || i === count - 1
    const label = showYear
      ? `${MONTH_SHORT[start.getMonth()]} ${start.getFullYear()}`
      : MONTH_SHORT[start.getMonth()]
    buckets.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      label,
      start,
      end,
    })
  }
  return buckets
}

/** Chart buckets matched to the selected period (weeks / months). */
export function buildChartBuckets(key: EarningsPeriodKey, to: Date): ChartBucket[] {
  if (key === '30d') {
    const buckets: ChartBucket[] = []
    for (let i = 3; i >= 0; i--) {
      const end = new Date(to)
      end.setHours(23, 59, 59, 999)
      end.setDate(end.getDate() - i * 7)
      const start = new Date(end)
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      const label =
        i === 0
          ? 'Diese Woche'
          : `${WEEKDAY_SHORT[start.getDay()]} ${start.getDate()}.`
      buckets.push({
        key: `w-${start.toISOString().slice(0, 10)}`,
        label,
        start,
        end,
      })
    }
    return buckets
  }
  if (key === '90d') return buildMonthBuckets(to, 3)
  return buildMonthBuckets(to, 12)
}

export function inRange(iso: string, from: Date | null, to: Date): boolean {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  if (from && t < from.getTime()) return false
  return t <= to.getTime()
}
