'use client'

/**
 * ProjectModulesStrip — calm, dynamic renderer for the type-specific
 * Client Portal modules of a project.
 *
 * Drives off `PROJECT_MODULE_REGISTRY` + `CLIENT_MODULE_LABEL`, so adding
 * a new project type or relabeling a module never requires touching
 * project pages. The strip intentionally omits the always-on modules
 * (briefing, milestones, files, …) — those already have dedicated
 * surfaces on the project page.
 *
 * Phase 3 stub: the data behind each module is not yet wired (no live
 * staging-link, no real KPI values). This first pass establishes the
 * presentation contract so executors and clients see the same shape
 * regardless of project type.
 */

import { useMemo } from 'react'
import {
  CLIENT_MODULE_LABEL,
  KPI_LABEL,
  getProjectPreset,
  type ClientModule,
  type KpiKind,
  type ProjectType,
} from '@/lib/project-modules'

// Modules already rendered elsewhere on the project page — hide from
// the strip to avoid visual duplication.
const HIDDEN_IN_STRIP: ReadonlySet<ClientModule> = new Set<ClientModule>([
  'briefing',
  'audio_briefing',
  'milestones',
  'open_decisions',
  'risks',
  'files',
  'approvals',
])

type Props = {
  projectType: ProjectType | null | undefined
  /** Optional: live KPI values. Missing keys render as "—". */
  values?: Partial<Record<KpiKind, string | number | null | undefined>>
  /** Optional: muted/empty hint instead of swallowing the section entirely. */
  emptyHint?: string
}

function formatValue(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '—'
  return v
}

export default function ProjectModulesStrip({ projectType, values, emptyHint }: Props) {
  const preset = useMemo(() => getProjectPreset(projectType ?? null), [projectType])

  const visibleModules = useMemo(
    () => preset.clientModules.filter((m) => !HIDDEN_IN_STRIP.has(m)),
    [preset.clientModules],
  )

  // Prefer KPIs that have a value, then fall back to the first preset entries.
  const kpiPreview = useMemo(() => {
    const candidates = preset.kpis.filter((k) => k !== 'progress_pct')
    const withValues = candidates.filter((k) => values && values[k] !== undefined && values[k] !== null && values[k] !== '')
    const remainder  = candidates.filter((k) => !withValues.includes(k))
    return [...withValues, ...remainder].slice(0, 4)
  }, [preset.kpis, values])

  if (visibleModules.length === 0 && kpiPreview.length === 0) {
    return emptyHint ? (
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{emptyHint}</p>
    ) : null
  }

  return (
    <section
      aria-label="Projekttyp-Module"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 24,
        background: 'var(--surface)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '.04em',
              textTransform: 'uppercase',
            }}
          >
            Was dieses Projekt liefert
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              opacity: 0.7,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {preset.label}
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            opacity: 0.65,
            flexShrink: 0,
          }}
          title="Tagro klassifiziert den Projekttyp und blendet die passenden Module ein."
        >
          Tagro · auto
        </span>
      </header>

      {visibleModules.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: kpiPreview.length > 0 ? 12 : 0,
          }}
        >
          {visibleModules.map((m) => (
            <span
              key={m}
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                padding: '3px 9px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
              }}
              title={CLIENT_MODULE_LABEL[m]}
            >
              {CLIENT_MODULE_LABEL[m]}
            </span>
          ))}
        </div>
      )}

      {kpiPreview.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            paddingTop: 10,
            borderTop: '1px solid var(--border)',
          }}
        >
          {kpiPreview.map((k) => {
            const raw = values?.[k]
            const display = formatValue(raw)
            const hasValue = display !== '—'
            return (
              <div
                key={k}
                style={{ display: 'flex', flexDirection: 'column', minWidth: 80 }}
                title={KPI_LABEL[k]}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    letterSpacing: '.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {KPI_LABEL[k]}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: hasValue ? 'var(--text)' : 'var(--text-muted)',
                    opacity: hasValue ? 1 : 0.55,
                    marginTop: 2,
                  }}
                >
                  {display}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
