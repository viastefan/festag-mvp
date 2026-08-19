'use client'

/**
 * Risiko-Intelligenz — die Einstellungen dazu, wie aufmerksam Festag ist.
 *
 * Bewusst wenige Schalter: was erkannt wird, woraus, wie früh — und wie
 * eigenständig Tagro daraufhin handeln darf. Alles Weitere gehört auf die
 * Risikoseite selbst, nicht in eine Konfigurationsmatrix.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  RISK_ACTION_LABEL,
  RISK_ACTION_TYPES,
  defaultPermissionFor,
  type RiskActionPermission,
  type RiskActionType,
} from '@/lib/risks/actions'
import type { RiskSettings } from '@/lib/risks/types'
import { DEFAULT_RISK_SETTINGS } from '@/lib/risks/types'

type Settings = Omit<RiskSettings, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>

type Props = {
  workspaceId: string | null
  flashSaved: (label: string) => void
  setError: (msg: string) => void
}

const SENSITIVITY: { id: Settings['sensitivity']; label: string }[] = [
  { id: 'low', label: 'Zurückhaltend' },
  { id: 'medium', label: 'Normal' },
  { id: 'high', label: 'Früh' },
]

const AUTONOMY: { id: Settings['autonomy']; label: string; hint: string }[] = [
  { id: 'observe', label: 'Beobachten', hint: 'Tagro analysiert, meldet aber nichts von sich aus.' },
  { id: 'recommend', label: 'Empfehlen', hint: 'Tagro erkennt Risiken und schlägt Maßnahmen vor.' },
  { id: 'assist', label: 'Unterstützen', hint: 'Tagro darf nach Rückfrage kleine Schritte selbst ausführen.' },
  { id: 'act', label: 'Handeln', hint: 'Freigegebene Aktionen führt Tagro selbstständig aus — protokolliert.' },
]

const SOURCES: { key: keyof Settings; label: string; sub: string }[] = [
  { key: 'source_tasks', label: 'Aufgaben', sub: 'Blockaden, überfällige Termine, Abhängigkeiten.' },
  { key: 'source_developer', label: 'Team-Updates', sub: 'Was das Team zu seiner Arbeit meldet.' },
  { key: 'source_github', label: 'GitHub', sub: 'Pull Requests und Repository-Aktivität.' },
  { key: 'source_client', label: 'Kundenkommunikation', sub: 'Neue Anforderungen und Rückmeldungen.' },
  { key: 'source_timeline', label: 'Zeitplan', sub: 'Zieltermin gegen verbleibende Kapazität.' },
  { key: 'source_decisions', label: 'Entscheidungen', sub: 'Offene Freigaben, die die Umsetzung aufhalten.' },
]

const PERMISSION_LABEL: Record<RiskActionPermission, string> = {
  auto: 'Automatisch',
  ask: 'Nachfragen',
  off: 'Aus',
}

export default function RiskIntelligencePanel({ workspaceId, flashSaved, setError }: Props) {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_RISK_SETTINGS })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  // Einzelne Aktionen sind der seltene Fall — die Stufe reicht fast immer.
  const [advanced, setAdvanced] = useState(false)

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/risks/settings?workspace_id=${workspaceId}`, { credentials: 'include' })
        const data = res.ok ? await res.json().catch(() => null) : null
        if (!cancelled && data?.settings) setSettings({ ...DEFAULT_RISK_SETTINGS, ...data.settings })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [workspaceId])

  const save = useCallback(async (patch: Partial<Settings>) => {
    if (!workspaceId || busy) return
    const next = { ...settings, ...patch }
    setSettings(next) // optimistisch — die Schalter sollen nicht ruckeln
    setBusy(true)
    try {
      const res = await fetch('/api/risks/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspace_id: workspaceId, ...patch }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Einstellung konnte nicht gespeichert werden.')
      if (data?.settings) setSettings({ ...DEFAULT_RISK_SETTINGS, ...data.settings })
      flashSaved('Risiko-Intelligenz')
    } catch (e: any) {
      setSettings(settings) // zurück auf den letzten bestätigten Stand
      setError(e?.message || 'Einstellung konnte nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }, [workspaceId, settings, busy, flashSaved, setError])

  /** Ohne Ausnahme (null) gilt wieder, was die Autonomiestufe vorgibt. */
  const savePermission = useCallback(
    async (type: RiskActionType, value: RiskActionPermission | null) => {
      const next = { ...(settings.action_permissions ?? {}) }
      if (value) next[type] = value
      else delete next[type]
      await save({ action_permissions: next })
    },
    [settings.action_permissions, save],
  )

  if (!workspaceId) {
    return (
      <div className="set-card">
        <div className="set-row">
          <div>
            <div className="set-label">Risiko-Intelligenz</div>
            <div className="set-label-sub">Wähle zuerst einen Workspace aus.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <p className="set-section-title">Risiko-Intelligenz</p>
      <div className="set-card">
        <div className="set-row">
          <div>
            <div className="set-label">Risiken automatisch erkennen</div>
            <div className="set-label-sub">
              Festag wertet Projektsignale aus und meldet, was die Lieferung gefährden könnte.
            </div>
          </div>
          <Toggle
            value={settings.detect_risks}
            disabled={loading}
            onChange={v => void save({ detect_risks: v })}
          />
        </div>
        <div className="set-row">
          <div>
            <div className="set-label">Blockaden erkennen</div>
            <div className="set-label-sub">Aufgaben, die stehen, und gemeldete Blocker.</div>
          </div>
          <Toggle
            value={settings.detect_blockers}
            disabled={loading || !settings.detect_risks}
            onChange={v => void save({ detect_blockers: v })}
          />
        </div>
        <div className="set-row">
          <div>
            <div className="set-label">Scope-Änderungen erkennen</div>
            <div className="set-label-sub">Neue Anforderungen gegen den vereinbarten Umfang.</div>
          </div>
          <Toggle
            value={settings.detect_scope_changes}
            disabled={loading || !settings.detect_risks}
            onChange={v => void save({ detect_scope_changes: v })}
          />
        </div>
        <div className="set-row set-row-stack">
          <div>
            <div className="set-label">Aufmerksamkeit</div>
            <div className="set-label-sub">
              Je früher, desto eher meldet Festag auch schwache Hinweise — dafür häufiger.
            </div>
          </div>
          <div className="set-segment">
            {SENSITIVITY.map(o => (
              <button
                key={o.id}
                type="button"
                className={`set-segment-btn${settings.sensitivity === o.id ? ' on' : ''}`}
                disabled={loading || !settings.detect_risks}
                onClick={() => void save({ sensitivity: o.id })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="set-section-title">Signalquellen</p>
      <div className="set-card">
        {SOURCES.map(source => (
          <div className="set-row" key={String(source.key)}>
            <div>
              <div className="set-label">{source.label}</div>
              <div className="set-label-sub">{source.sub}</div>
            </div>
            <Toggle
              value={Boolean(settings[source.key])}
              disabled={loading || !settings.detect_risks}
              onChange={v => void save({ [source.key]: v } as Partial<Settings>)}
            />
          </div>
        ))}
      </div>

      <p className="set-section-title">Wie eigenständig Tagro arbeitet</p>
      <div className="set-card">
        <div className="set-row set-row-stack">
          <div>
            <div className="set-label">Handlungsspielraum</div>
            <div className="set-label-sub">
              {AUTONOMY.find(a => a.id === settings.autonomy)?.hint}
            </div>
          </div>
          <div className="set-segment">
            {AUTONOMY.map(o => (
              <button
                key={o.id}
                type="button"
                className={`set-segment-btn${settings.autonomy === o.id ? ' on' : ''}`}
                disabled={loading}
                onClick={() => void save({ autonomy: o.id })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="set-row">
          <div>
            <div className="set-label">Immer mit Rückfrage</div>
            <div className="set-label-sub">
              Budget, Termine gegenüber Kunden und Kundenkommunikation entscheidet nie Tagro allein —
              unabhängig von dieser Einstellung.
            </div>
          </div>
        </div>
        <div className="set-row">
          <div>
            <div className="set-label">Einzelne Aktionen</div>
            <div className="set-label-sub">
              Wenn die Stufe nicht genau passt, lässt sich jede Aktionsart einzeln regeln.
            </div>
          </div>
          <button type="button" className="set-btn" onClick={() => setAdvanced(v => !v)}>
            {advanced ? 'Ausblenden' : 'Erweitert'}
          </button>
        </div>
      </div>

      {advanced && (
        <div className="set-card">
          {RISK_ACTION_TYPES.map(type => {
            const inherited = defaultPermissionFor(settings.autonomy, type)
            const current = settings.action_permissions?.[type]
            const meta = RISK_ACTION_LABEL[type]
            return (
              <div className="set-row set-row-stack" key={type}>
                <div>
                  <div className="set-label">{meta.label}</div>
                  <div className="set-label-sub">{meta.sub}</div>
                </div>
                <div className="set-segment">
                  <button
                    type="button"
                    className={`set-segment-btn${!current ? ' on' : ''}`}
                    disabled={loading}
                    onClick={() => void savePermission(type, null)}
                  >
                    {`Standard (${PERMISSION_LABEL[inherited]})`}
                  </button>
                  {(['auto', 'ask', 'off'] as RiskActionPermission[]).map(value => (
                    <button
                      key={value}
                      type="button"
                      className={`set-segment-btn${current === value ? ' on' : ''}`}
                      disabled={loading}
                      onClick={() => void savePermission(type, value)}
                    >
                      {PERMISSION_LABEL[value]}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function Toggle({
  value,
  disabled,
  onChange,
}: {
  value: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="set-segment">
      <button
        type="button"
        className={`set-segment-btn${value ? ' on' : ''}`}
        disabled={disabled}
        onClick={() => onChange(true)}
      >
        An
      </button>
      <button
        type="button"
        className={`set-segment-btn${!value ? ' on' : ''}`}
        disabled={disabled}
        onClick={() => onChange(false)}
      >
        Aus
      </button>
    </div>
  )
}
