'use client'

/**
 * ExecutorModulesStrip — executor-side counterpart to ProjectModulesStrip.
 *
 * Renders the modules a given role *should* see on this project type,
 * sourced from `getExecutorModulesFor(type, role)` + EXECUTOR_MODULE_LABEL.
 * Filters out the "generic" baseline modules that already have
 * dedicated UI on the project page (my_tasks, blockers, priorities, …),
 * so the strip only highlights what's role-specific.
 *
 * No data wiring yet — this is the presentation contract for Phase 3.
 */

import { useMemo } from 'react'
import {
  EXECUTOR_MODULE_LABEL,
  EXECUTOR_ROLE_LABEL,
  getExecutorModulesFor,
  getProjectPreset,
  type ExecutorModule,
  type ExecutorRole,
  type ProjectType,
} from '@/lib/project-modules'

const GENERIC_HIDDEN: ReadonlySet<ExecutorModule> = new Set<ExecutorModule>([
  'my_tasks',
  'project_context',
  'status_to_tagro',
  'blockers',
  'priorities',
  'deadlines',
  'internal_notes',
])

type Props = {
  projectType: ProjectType | null | undefined
  role: ExecutorRole | null | undefined
}

export default function ExecutorModulesStrip({ projectType, role }: Props) {
  const preset = useMemo(() => getProjectPreset(projectType ?? null), [projectType])
  const modules = useMemo(() => getExecutorModulesFor(projectType ?? null, role ?? null), [projectType, role])
  const specific = useMemo(() => modules.filter((m) => !GENERIC_HIDDEN.has(m)), [modules])

  if (!role) return null
  if (specific.length === 0) return null

  return (
    <section
      aria-label="Executor-Module"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 18,
        background: 'color-mix(in srgb, var(--surface) 60%, transparent)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
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
            Dein Executor-Set · {EXECUTOR_ROLE_LABEL[role]}
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
            title={preset.positioning}
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
        >
          rollenspezifisch
        </span>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {specific.map((m) => (
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
            title={EXECUTOR_MODULE_LABEL[m]}
          >
            {EXECUTOR_MODULE_LABEL[m]}
          </span>
        ))}
      </div>
    </section>
  )
}
