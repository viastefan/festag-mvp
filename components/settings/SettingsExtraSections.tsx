'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getAnalyticsOptIn,
  getPortalPreview,
  setAnalyticsOptIn,
  setPortalPreview,
  type BriefingStyle,
  type ClarityMode,
  type SignalPriority,
} from '@/components/settings/settings-prefs'

type TagroHealth = {
  provider: string
  model: string | null
  reachable: boolean | null
  message?: string
} | null

type Props = {
  section: 'intelligence' | 'portal' | 'privacy' | 'shortcuts'
  wsSettings: Record<string, any>
  saveWsSetting: (key: string, value: any) => Promise<void>
  tagroHealth: TagroHealth
  tagroPinging: boolean
  pingTagro: () => void
  wsName: string
  wsMode: 'delivery' | 'team' | 'agency' | null
  setError: (msg: string) => void
  flashSaved: (label: string) => void
}

function SegmentToggle({
  value,
  onChange,
  options,
}: {
  value: boolean
  onChange: (v: boolean) => void
  options?: [string, string]
}) {
  const [onLabel, offLabel] = options || ['An', 'Aus']
  return (
    <div className="set-segment">
      <button type="button" className={`set-segment-btn${value ? ' on' : ''}`} onClick={() => onChange(true)}>{onLabel}</button>
      <button type="button" className={`set-segment-btn${!value ? ' on' : ''}`} onClick={() => onChange(false)}>{offLabel}</button>
    </div>
  )
}

export default function SettingsExtraSections({
  section,
  wsSettings,
  saveWsSetting,
  tagroHealth,
  tagroPinging,
  pingTagro,
  wsName,
  wsMode,
  setError,
  flashSaved,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [analytics, setAnalytics] = useState(() => getAnalyticsOptIn())
  const [portalPreview, setPortalPreviewState] = useState(() => getPortalPreview())
  const [exporting, setExporting] = useState(false)
  const [portalWelcome, setPortalWelcome] = useState('')

  useEffect(() => {
    if (section === 'portal') setPortalWelcome(wsSettings.portal_welcome ?? '')
  }, [section, wsSettings.portal_welcome])

  async function requestExport() {
    setExporting(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Bitte erneut anmelden.')
      window.location.href = `mailto:hi@festag.app?subject=${encodeURIComponent('Festag — Datenexport')}&body=${encodeURIComponent('Bitte sendet mir einen Export meiner Festag-Daten.\n\nE-Mail: ' + (session.user.email || ''))}`
      flashSaved('Export-Anfrage vorbereitet')
    } catch (e: any) {
      setError(e?.message || 'Export konnte nicht gestartet werden.')
    } finally {
      setExporting(false)
    }
  }

  if (section === 'intelligence') {
    const clarity = (wsSettings.clarity_mode ?? 'executive') as ClarityMode
    const signal = (wsSettings.signal_priority ?? 'balanced') as SignalPriority
    const style = (wsSettings.briefing_style ?? 'narrative') as BriefingStyle

    return (
      <>
        <div className="set-insight-card" style={{ marginBottom: 18 }}>
          <strong>Delivery Intelligence — nicht Chatbot</strong>
          <p>
            Tagro übersetzt Arbeitssignale in client-ready Klarheit. Diese Einstellungen steuern,
            wie Risiken, Entscheidungen und Fortschritt priorisiert und formuliert werden — workspace-weit.
          </p>
        </div>

        <p className="set-section-title">Verbindung</p>
        <div className="set-card">
          <div className="set-row">
            <div>
              <div className="set-label">KI-Modell</div>
              <div className="set-label-sub">
                {tagroHealth
                  ? tagroHealth.provider === 'none'
                    ? 'Keine KI verbunden — API-Schlüssel in der Umgebung setzen.'
                    : `Tagro läuft auf ${tagroHealth.provider === 'claude' ? 'Claude' : tagroHealth.provider === 'gemini' ? 'Gemini' : 'MiniMax'}${tagroHealth.model ? ` · ${tagroHealth.model}` : ''}.`
                  : 'Verbindungsstatus wird geladen …'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
              <span
                aria-hidden
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: !tagroHealth ? '#6F7A89'
                    : tagroHealth.reachable === true ? '#3FB984'
                    : tagroHealth.reachable === false ? '#D9534F'
                    : tagroHealth.provider === 'none' ? '#D9534F' : '#6a738c',
                }}
              />
              <button type="button" className="set-btn" onClick={pingTagro} disabled={tagroPinging || tagroHealth?.provider === 'none'}>
                {tagroPinging ? 'Prüfe …' : 'Verbindung testen'}
              </button>
            </div>
          </div>
        </div>

        <p className="set-section-title">Klarheitsmodus</p>
        <div className="set-card">
          <div className="set-row set-row-stack">
            <div>
              <div className="set-label">Wie Tagro zusammenfasst</div>
              <div className="set-label-sub">Executive = eine Zeile pro Signal. Detailed = Kontext für Approver. Minimal = nur Status &amp; Next Step.</div>
            </div>
            <div className="ws-mode-switch">
              {([
                ['executive', 'Executive', 'Für CEOs & Kunden — eine klare Zeile pro Thema.'],
                ['detailed', 'Detailed', 'Mehr Kontext für interne Freigaben.'],
                ['minimal', 'Minimal', 'Nur Status, Risiko und nächster Schritt.'],
              ] as const).map(([id, label, sub]) => (
                <button
                  key={id}
                  type="button"
                  className={`ws-mode-opt${clarity === id ? ' on' : ''}`}
                  onClick={() => saveWsSetting('clarity_mode', id)}
                >
                  <span className="ws-mode-top">
                    <span className="ws-mode-name">{label}</span>
                    {clarity === id && <span className="ws-mode-badge">Aktiv</span>}
                  </span>
                  <span className="ws-mode-desc">{sub}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="set-row">
            <div>
              <div className="set-label">Signal-Priorität</div>
              <div className="set-label-sub">Was Tagro zuerst nach oben zieht, wenn Platz knapp ist.</div>
            </div>
            <select className="set-select" value={signal} onChange={e => saveWsSetting('signal_priority', e.target.value)}>
              <option value="balanced">Ausgewogen</option>
              <option value="risks">Risiken zuerst</option>
              <option value="decisions">Entscheidungen zuerst</option>
              <option value="progress">Fortschritt zuerst</option>
            </select>
          </div>
          <div className="set-row">
            <div>
              <div className="set-label">Briefing-Stil</div>
              <div className="set-label-sub">Form der client-ready Updates — unabhängig vom Kanal.</div>
            </div>
            <select className="set-select" value={style} onChange={e => saveWsSetting('briefing_style', e.target.value)}>
              <option value="narrative">Erzählend</option>
              <option value="bullet">Bullet-Executive</option>
              <option value="dashboard">Dashboard-Kacheln</option>
            </select>
          </div>
        </div>

        <p className="set-section-title">Proaktivität</p>
        <div className="set-card">
          <div className="set-row">
            <div>
              <div className="set-label">Risiko-Highlights</div>
              <div className="set-label-sub">Tagro markiert neue Risiken automatisch in Briefings und Entscheidungen.</div>
            </div>
            <SegmentToggle
              value={wsSettings.risk_highlight ?? true}
              onChange={v => saveWsSetting('risk_highlight', v)}
            />
          </div>
          <div className="set-row">
            <div>
              <div className="set-label">Entscheidungs-Digest</div>
              <div className="set-label-sub">Wöchentliche Übersicht offener Entscheidungen — bevor der Kunde nachfragt.</div>
            </div>
            <SegmentToggle
              value={wsSettings.decision_digest ?? true}
              onChange={v => saveWsSetting('decision_digest', v)}
            />
          </div>
          <div className="set-row">
            <div>
              <div className="set-label">Tagro schlägt vor</div>
              <div className="set-label-sub">Interpretiert Signale ohne explizite Anfrage — z. B. „Diese Woche braucht Freigabe".</div>
            </div>
            <SegmentToggle
              value={wsSettings.tagro_proactive ?? false}
              onChange={v => saveWsSetting('tagro_proactive', v)}
            />
          </div>
          <div className="set-row">
            <div>
              <div className="set-label">Berichtssprache</div>
              <div className="set-label-sub">Sprache der Statusberichte und Briefings.</div>
            </div>
            <div className="set-segment">
              <button type="button" className={`set-segment-btn${(wsSettings.report_language ?? 'de') === 'de' ? ' on' : ''}`} onClick={() => saveWsSetting('report_language', 'de')}>Deutsch</button>
              <button type="button" className={`set-segment-btn${(wsSettings.report_language ?? 'de') === 'en' ? ' on' : ''}`} onClick={() => saveWsSetting('report_language', 'en')}>English</button>
            </div>
          </div>
          <div className="set-row">
            <div>
              <div className="set-label">Tagro-Ton</div>
              <div className="set-label-sub">Wie Tagro mit Kunden und Team kommuniziert.</div>
            </div>
            <select className="set-select" value={wsSettings.tagro_tone ?? 'neutral'} onChange={e => saveWsSetting('tagro_tone', e.target.value)}>
              <option value="calm">Ruhig &amp; erklärend</option>
              <option value="neutral">Neutral &amp; sachlich</option>
              <option value="direct">Direkt &amp; knapp</option>
            </select>
          </div>
        </div>

        <p className="set-section-title">Veröffentlichung</p>
        <div className="set-card">
          <div className="set-row">
            <div>
              <div className="set-label">Standardmäßig kundensicher</div>
              <div className="set-label-sub">Neue Berichte starten ohne interne Notizen.</div>
            </div>
            <SegmentToggle
              value={wsSettings.default_client_safe ?? true}
              onChange={v => saveWsSetting('default_client_safe', v)}
            />
          </div>
          <div className="set-row">
            <div>
              <div className="set-label">Vor Versand prüfen</div>
              <div className="set-label-sub">Briefings warten auf deine Freigabe.</div>
            </div>
            <SegmentToggle
              value={wsSettings.review_before_send ?? true}
              onChange={v => saveWsSetting('review_before_send', v)}
            />
          </div>
          <div className="set-row">
            <div>
              <div className="set-label">Berichtsrhythmus</div>
              <div className="set-label-sub">Wie oft Tagro automatisch einen Statusbericht vorschlägt.</div>
            </div>
            <select className="set-select" value={wsSettings.report_frequency ?? 'weekly'} onChange={e => saveWsSetting('report_frequency', e.target.value)}>
              <option value="daily">Täglich</option>
              <option value="weekly">Wöchentlich</option>
              <option value="milestone">Bei Meilensteinen</option>
              <option value="on_demand">Nur auf Anfrage</option>
            </select>
          </div>
        </div>
      </>
    )
  }

  if (section === 'portal') {
    const showRisks = wsSettings.portal_show_risks ?? true
    const showDecisions = wsSettings.portal_show_decisions ?? true
    const showTimeline = wsSettings.portal_show_timeline ?? true

    return (
      <>
        <div className="set-insight-card" style={{ marginBottom: 18 }}>
          <strong>Was Kunden sehen</strong>
          <p>
            Steuere Sichtbarkeit und Ton im Client Portal — unabhängig von internen Tasks und Dev-Tools.
            {wsMode === 'agency' ? ' White-Label-Branding findest du unter Workspace.' : ''}
          </p>
        </div>

        <div className="set-card">
          <div className="set-row set-row-stack">
            <div>
              <div className="set-label">Live-Vorschau</div>
              <div className="set-label-sub">Simuliert die Kundenansicht direkt in Festag — ohne separaten Login.</div>
            </div>
            <SegmentToggle
              value={portalPreview}
              onChange={v => {
                setPortalPreviewState(v)
                setPortalPreview(v)
                flashSaved(v ? 'Portal-Vorschau aktiv' : 'Portal-Vorschau aus')
              }}
            />
          </div>
          <div className="set-preview-frame">
            <div className="set-preview-bar">
              <span>{wsName || 'Festag'} · Client Portal</span>
              <span>{portalPreview ? 'Vorschau aktiv' : 'Standard'}</span>
            </div>
            <div className="set-preview-body">
              <span className="set-preview-pill">Delivery Update</span>
              {showRisks && <div className="set-preview-line mid" title="Risiko-Zeile" />}
              {showDecisions && <div className="set-preview-line" title="Entscheidung-Zeile" />}
              {showTimeline && <div className="set-preview-line short" title="Timeline-Zeile" />}
              <div className="set-preview-line mid" title="Next Step" />
            </div>
          </div>
        </div>

        <p className="set-section-title">Sichtbarkeit</p>
        <div className="set-card">
          <div className="set-row">
            <div>
              <div className="set-label">Risiken anzeigen</div>
              <div className="set-label-sub">Kunden sehen markierte Risiken — nie interne Dev-Notizen.</div>
            </div>
            <SegmentToggle value={showRisks} onChange={v => saveWsSetting('portal_show_risks', v)} />
          </div>
          <div className="set-row">
            <div>
              <div className="set-label">Entscheidungen anzeigen</div>
              <div className="set-label-sub">Offene Freigaben und Entscheidungspunkte im Portal.</div>
            </div>
            <SegmentToggle value={showDecisions} onChange={v => saveWsSetting('portal_show_decisions', v)} />
          </div>
          <div className="set-row">
            <div>
              <div className="set-label">Timeline & Meilensteine</div>
              <div className="set-label-sub">Fortschrittslinie und nächste Meilensteine für Stakeholder.</div>
            </div>
            <SegmentToggle value={showTimeline} onChange={v => saveWsSetting('portal_show_timeline', v)} />
          </div>
          <div className="set-row set-row-stack">
            <div>
              <div className="set-label">Willkommenszeile</div>
              <div className="set-label-sub">Optional — erscheint oben im Portal-Dashboard.</div>
            </div>
            <input
              className="set-input"
              type="text"
              value={portalWelcome}
              onChange={e => setPortalWelcome(e.target.value)}
              onBlur={() => {
                if ((wsSettings.portal_welcome ?? '') !== portalWelcome.trim()) {
                  saveWsSetting('portal_welcome', portalWelcome.trim() || null)
                }
              }}
              placeholder="z. B. Willkommen zurück — hier ist der aktuelle Stand."
            />
          </div>
        </div>

        <div className="set-card">
          <div className="set-row">
            <div>
              <div className="set-label">Kundenbereiche</div>
              <div className="set-label-sub">Pro Kunde eigener Bereich mit Briefings und Freigaben.</div>
            </div>
            <Link href="/clients" className="set-btn">Kundenbereiche öffnen</Link>
          </div>
        </div>
      </>
    )
  }

  if (section === 'privacy') {
    return (
      <>
        <div className="set-insight-card" style={{ marginBottom: 18 }}>
          <strong>Transparenz by design</strong>
          <p>Festag speichert nur, was Delivery Intelligence braucht. Hier exportierst du Daten, steuerst Analytics und findest den Weg zur Kontolöschung.</p>
        </div>

        <div className="set-card">
          <div className="set-row">
            <div>
              <div className="set-label">Datenexport</div>
              <div className="set-label-sub">Profil, Projekte, Briefings und Entscheidungen — auf Anfrage als strukturierter Export.</div>
            </div>
            <button type="button" className="set-btn set-btn-primary" onClick={requestExport} disabled={exporting}>
              {exporting ? 'Wird vorbereitet…' : 'Export anfragen'}
            </button>
          </div>
          <div className="set-row">
            <div>
              <div className="set-label">Produkt-Analytics</div>
              <div className="set-label-sub">Anonyme Nutzungsmetriken helfen uns, Festag schneller zu verbessern — ohne Inhalte deiner Projekte.</div>
            </div>
            <SegmentToggle
              value={analytics}
              onChange={v => {
                setAnalytics(v)
                setAnalyticsOptIn(v)
                flashSaved('Datenschutz-Einstellung gespeichert')
              }}
            />
          </div>
          <div className="set-row">
            <div>
              <div className="set-label">Aktive Sitzung</div>
              <div className="set-label-sub">Du bist in diesem Browser angemeldet. Abmelden beendet nur diese Sitzung.</div>
            </div>
            <span className="set-value">Dieses Gerät</span>
          </div>
          <div className="set-row">
            <div>
              <div className="set-label">Konto löschen</div>
              <div className="set-label-sub">Unwiderruflich — inkl. Workspaces, Briefings und Tagro-Memory.</div>
            </div>
            <Link href="/settings/security" className="set-btn set-btn-danger">Zu Sicherheit</Link>
          </div>
        </div>

        <div className="set-card">
          <div className="set-row set-row-stack">
            <div>
              <div className="set-label">Datenschutzerklärung</div>
              <div className="set-label-sub">Wie Festag personenbezogene Daten verarbeitet.</div>
            </div>
            <a className="set-btn" href="https://festag.app/datenschutz" target="_blank" rel="noopener noreferrer">Öffnen</a>
          </div>
        </div>
      </>
    )
  }

  if (section === 'shortcuts') {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
    const mod = isMac ? '⌘' : 'Ctrl'

    const rows: Array<{ label: string; sub?: string; keys: string[] }> = [
      { label: 'Command Palette', sub: 'Schnell zu jeder Seite springen', keys: [mod, 'K'] },
      { label: 'Einstellungen', sub: 'Linear-style: G dann S', keys: ['G', 'S'] },
      { label: 'Dashboard', keys: ['G', 'D'] },
      { label: 'Projekte', keys: ['G', 'P'] },
      { label: 'Entscheidungen', keys: ['G', 'E'] },
      { label: 'Tagro öffnen', sub: 'Project Interpreter', keys: [mod, '/'] },
      { label: 'Suche in Liste', keys: ['/'] },
      { label: 'Sidebar ein/aus', keys: [mod, 'B'] },
    ]

    return (
      <>
        <div className="set-insight-card" style={{ marginBottom: 18 }}>
          <strong>Schnell durch Festag</strong>
          <p>Tastenkürzel halten dich im Flow — ohne die Maus. Die Command Palette kennt alle Bereiche inkl. der neuen Einstellungsseiten.</p>
        </div>

        <div className="set-card">
          <div className="set-kbd-grid">
            {rows.map(row => (
              <div key={row.label} className="set-kbd-row">
                <div>
                  <div className="set-kbd-label">{row.label}</div>
                  {row.sub && <div className="set-kbd-sub">{row.sub}</div>}
                </div>
                <div className="set-kbd-keys">
                  {row.keys.map(k => (
                    <span key={k} className="set-kbd-key">{k}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="set-card">
          <div className="set-row">
            <div>
              <div className="set-label">Palette öffnen</div>
              <div className="set-label-sub">Probiere es jetzt — alle Routen inkl. Tagro &amp; Klarheit.</div>
            </div>
            <button
              type="button"
              className="set-btn set-btn-primary"
              onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            >
              Command Palette
            </button>
          </div>
        </div>
      </>
    )
  }

  return null
}
