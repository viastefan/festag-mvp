export type ExecutiveHealth = 'healthy' | 'watch' | 'risk' | 'blocked'

export type ExecutiveProjectRow = {
  id: string
  title: string
  color?: string | null
  health: ExecutiveHealth
  progress_pct: number
  open_issues: number
  critical_issues: number
  open_decisions: number
  velocity_7d: number
  summary?: string | null
}

export type ExecutiveOverview = {
  health: ExecutiveHealth
  headline: string
  summary: string
  progress_pct: number
  open_issues: number
  critical_issues: number
  open_decisions: number
  active_objectives: number
  objectives_at_risk: number
  velocity_7d: number
  forecast_days_min: number | null
  forecast_days_max: number | null
  projects: ExecutiveProjectRow[]
  generated_at: string
}

export type ExecutiveDailyReportSource = 'tagro' | 'scheduled' | 'synthesized'

export type ExecutiveDailyReport = {
  title: string
  date_label: string
  body: string
  highlights: string[]
  source: ExecutiveDailyReportSource
  generated_at: string
}
