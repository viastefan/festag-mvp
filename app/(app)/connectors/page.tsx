'use client'

import { useEffect, useState } from 'react'
import { FunnelSimple, PencilSimple } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import LinearLinkModal from '@/components/connectors/LinearLinkModal'
import MobileCodexListChrome from '@/components/mobile/MobileCodexListChrome'
import { openTagro } from '@/components/TagroOverlay'

/**
 * Connectors hub — connect Festag with external tools.
 * Each connector has 3 states: not_connected | pending | connected.
 * Stores per-user OAuth tokens / webhook URLs in user_connectors table.
 *
 * Connection flow per provider:
 *   - Notion / Slack / Gmail: OAuth (redirect)
 *   - Zapier / GitHub:        Personal token paste
 *   - Webhook (custom):       URL paste
 */

type ConnState = 'not_connected' | 'pending' | 'connected'
type Connector = {
  id: string
  name: string
  category: string
  description: string
  iconBg: string
  iconText: string
  iconImg?: string  // path to /brand/* svg
  authMode: 'oauth' | 'token' | 'webhook'
  docs: string
}

const CONNECTORS: Connector[] = [
  { id:'notion',  name:'Notion',  category:'Wissen',
    description:'Projektbriefings automatisch in deine Notion-Datenbank.',
    iconBg:'#000', iconText:'#fff', iconImg:'/brand/notion.svg',
    authMode:'oauth', docs:'https://developers.notion.com/' },

  { id:'zapier',  name:'Zapier',  category:'Automatisierung',
    description:'Trigger 7000+ Workflows aus Festag-Events.',
    iconBg:'#FF4A00', iconText:'#fff', iconImg:'/brand/zapier.svg',
    authMode:'webhook', docs:'https://zapier.com/apps/webhook' },

  { id:'slack',   name:'Slack',   category:'Kommunikation',
    description:'Tagro postet Status-Updates und Alerts in deinen Channel.',
    iconBg:'#4A154B', iconText:'#fff', iconImg:'/brand/slack.svg',
    authMode:'oauth', docs:'https://api.slack.com/messaging/webhooks' },

  { id:'gmail',   name:'Gmail',   category:'E-Mail',
    description:'Projektbriefings direkt aus dem Projekt versenden.',
    iconBg:'#EA4335', iconText:'#fff', iconImg:'/brand/gmail.svg',
    authMode:'oauth', docs:'https://developers.google.com/gmail/api' },

  { id:'github',  name:'GitHub',  category:'Code',
    description:'Festag-Tasks ↔ Issues + PR-Verlinkung.',
    iconBg:'#181717', iconText:'#fff', iconImg:'/brand/github.svg',
    authMode:'token', docs:'https://docs.github.com/rest' },

  { id:'linear',  name:'Linear',  category:'Issues',
    description:'Sync Tasks zwischen Linear und Festag in Echtzeit.',
    iconBg:'#5E6AD2', iconText:'#fff',
    authMode:'token', docs:'https://developers.linear.app/' },

  { id:'figma',   name:'Figma',   category:'Design',
    description:'Embed Designs direkt in Festag-Tasks.',
    iconBg:'#F24E1E', iconText:'#fff',
    authMode:'oauth', docs:'https://www.figma.com/developers/api' },

  { id:'webhook', name:'Custom Webhook', category:'Eigene',
    description:'Eigene URL — Festag postet alle Events als JSON.',
    iconBg:'var(--surface-2)', iconText:'var(--text)',
    authMode:'webhook', docs:'/docs/webhooks' },
]

export default function ConnectorsPage() {
  const [conns, setConns] = useState<Record<string, ConnState>>({})
  const [open, setOpen] = useState<string|null>(null)
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [linearLinkOpen, setLinearLinkOpen] = useState(false)
  const [linearLinkCount, setLinearLinkCount] = useState(0)
  const sb = createClient()

  const loadLinearLinks = async () => {
    try {
      const res = await fetch('/api/linear/links', { credentials: 'include' })
      const data = res.ok ? await res.json().catch(() => null) : null
      setLinearLinkCount((data?.links ?? []).length)
    } catch {
      setLinearLinkCount(0)
    }
  }

  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href='/login'; return }
      const { data: uc } = await sb.from('user_connectors').select('connector_id,status').eq('user_id', data.session.user.id)
      const map: Record<string, ConnState> = {}
      for (const c of (uc as any[]) ?? []) map[(c as any).connector_id] = (c as any).status
      setConns(map)
      if (map.linear === 'connected') void loadLinearLinks()
    })
  }, [])

  async function connect(c: Connector) {
    if (c.authMode === 'oauth') {
      // Placeholder OAuth init — would redirect to /api/connectors/[id]/auth
      setOpen(c.id)
    } else {
      setOpen(c.id); setToken('')
    }
  }

  async function saveConnection(c: Connector) {
    setSaving(true)
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Nicht eingeloggt.')
      await sb.from('user_connectors').upsert({
        user_id: user.id,
        connector_id: c.id,
        status: 'connected',
        config: c.authMode === 'oauth' ? null : { token: token.trim() },
        connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id,connector_id' }).catch(() => {})
      setConns(prev => ({ ...prev, [c.id]: 'connected' }))
      setOpen(null); setToken('')
      if (c.id === 'linear') {
        void loadLinearLinks()
        setLinearLinkOpen(true)
      }
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function disconnect(c: Connector) {
    if (!confirm(`${c.name} wirklich trennen?`)) return
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    await sb.from('user_connectors').delete().eq('user_id', user.id).eq('connector_id', c.id).catch(() => {})
    setConns(prev => { const n = { ...prev }; delete n[c.id]; return n })
    if (c.id === 'linear') setLinearLinkCount(0)
  }

  const cats = ['all', ...Array.from(new Set(CONNECTORS.map(c => c.category)))]
  const filtered = filter === 'all' ? CONNECTORS : CONNECTORS.filter(c => c.category === filter)

  const opened = CONNECTORS.find(c => c.id === open)
  const connectedCount = CONNECTORS.filter(c => conns[c.id] === 'connected').length

  const tagroConnectors = () => openTagro({
    contextType: 'empty',
    id: 'connectors',
    title: 'Connectors · Übersicht',
    subtitle: `${connectedCount} verbunden`,
  })

  return (
    <>
    <MobileCodexListChrome
      className="conn-page"
      title="Connectors"
      titleMobile="Connectors"
      subtitle={`${connectedCount} von ${CONNECTORS.length} verbunden`}
      mobileActions={(
        <>
          <button
            type="button"
            className={`mcl-ctl${filterOpen ? ' on' : ''}${filter !== 'all' ? ' has-active' : ''}`}
            aria-label="Filter"
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen(v => !v)}
          >
            <FunnelSimple size={17} weight="regular" />
          </button>
          {filterOpen && (
            <>
              <div className="mcl-filter-menu" role="menu">
                <p className="mcl-sheet-title">Kategorie</p>
                {cats.map(c => (
                  <button
                    key={c}
                    type="button"
                    role="menuitem"
                    className={`mcl-filter-item${filter === c ? ' on' : ''}`}
                    onClick={() => { setFilter(c); setFilterOpen(false) }}
                  >
                    {c === 'all' ? `Alle (${CONNECTORS.length})` : c}
                  </button>
                ))}
              </div>
              <button type="button" className="mcl-sheet-backdrop" aria-label="Schließen" onClick={() => setFilterOpen(false)} />
            </>
          )}
        </>
      )}
      dock={{
        onDragUp: tagroConnectors,
        primary: {
          id: 'discuss',
          label: 'Integrationen besprechen...',
          icon: <FunnelSimple size={14} weight="regular" />,
          onClick: tagroConnectors,
          ariaLabel: 'Mit Tagro besprechen',
        },
        secondary: {
          id: 'tagro',
          icon: <PencilSimple size={20} weight="bold" />,
          onClick: tagroConnectors,
          ariaLabel: 'Mit Tagro bearbeiten',
        },
      }}
      extraCss={CONN_CSS}
    >
      <header className="conn-dt-head">
        <h1>Connectors</h1>
        <p>Verbinde Festag mit deinen Tools. Tagro AI nutzt sie automatisch in Workflows.</p>
      </header>

      <div className="conn-dt-filters">
        {cats.map(c => (
          <button key={c} type="button" className={`conn-chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)}>
            {c === 'all' ? `Alle (${CONNECTORS.length})` : c}
          </button>
        ))}
      </div>

      <div className="conn-grid">
        {filtered.map(c => {
          const state = conns[c.id] ?? 'not_connected'
          const connected = state === 'connected'
          return (
            <div key={c.id} className={`conn-card${connected ? ' is-connected' : ''}`}>
              <div className="conn-card-top">
                <div className="conn-icon" style={{ background: c.iconBg, color: c.iconText }}>
                  {c.iconImg ? <img src={c.iconImg} alt={c.name} onError={(e) => { (e.target as HTMLElement).style.display = 'none' }} /> : c.name.charAt(0)}
                </div>
                <div className="conn-card-meta">
                  <div className="conn-card-title-row">
                    <p className="conn-name">{c.name}</p>
                    {connected && (
                      <span className="conn-active-badge">
                        <span className="conn-active-dot" aria-hidden />
                        AKTIV
                      </span>
                    )}
                  </div>
                  <p className="conn-category">{c.category.toUpperCase()}</p>
                </div>
              </div>

              <p className="conn-desc">{c.description}</p>

              {c.id === 'linear' && connected && linearLinkCount > 0 && (
                <p className="conn-linear-meta">
                  {linearLinkCount} Team{linearLinkCount === 1 ? '' : 's'} mit Projekten verknüpft
                </p>
              )}

              <div className="conn-actions">
                {connected ? (
                  <>
                    {c.id === 'linear' && (
                      <button
                        type="button"
                        className="conn-btn conn-btn-linear"
                        onClick={() => setLinearLinkOpen(true)}
                      >
                        Teams verknüpfen
                      </button>
                    )}
                    <button type="button" className="conn-btn conn-btn-ghost" onClick={() => disconnect(c)}>Trennen</button>
                    <a href={c.docs} target="_blank" rel="noopener" className="conn-btn conn-btn-docs">Docs ↗</a>
                  </>
                ) : (
                  <button type="button" className="conn-btn conn-btn-primary" onClick={() => connect(c)}>Verbinden →</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </MobileCodexListChrome>

      {/* Connect modal */}
      {opened && (
        <div onClick={() => setOpen(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', backdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:24, maxWidth:420, width:'100%', boxShadow:'0 30px 80px rgba(0,0,0,.3)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:14 }}>
              <div style={{ width:46, height:46, borderRadius:12, background:opened.iconBg, color:opened.iconText, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, overflow:'hidden' }}>
                {opened.iconImg ? <img src={opened.iconImg} alt="" style={{ width:'70%', height:'70%', objectFit:'contain', filter: opened.iconBg === '#fff' ? 'none' : 'brightness(0) invert(1)' }} onError={(e) => { (e.target as HTMLElement).style.display='none' }}/> : opened.name.charAt(0)}
              </div>
              <div>
                <h2 style={{ fontSize:18, fontWeight:700, margin:0, letterSpacing:'-.3px' }}>{opened.name} verbinden</h2>
                <p style={{ fontSize:12, color:'var(--text-muted)', margin:'2px 0 0' }}>{opened.category}</p>
              </div>
            </div>

            <p style={{ fontSize:13, color:'var(--text-secondary)', margin:'0 0 18px', lineHeight:1.55 }}>{opened.description}</p>

            {opened.authMode === 'oauth' && (
              <div style={{ padding:'14px 16px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:11, marginBottom:14 }}>
                <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:0, lineHeight:1.55 }}>
                  Du wirst auf <strong style={{ color:'var(--text)' }}>{opened.name}</strong> weitergeleitet, um den Zugang freizugeben. Festag bekommt nur die explizit angefragten Berechtigungen.
                </p>
              </div>
            )}

            {opened.authMode === 'token' && (
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', display:'block', marginBottom:6 }}>API TOKEN</label>
                <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder={`Token aus ${opened.name}`}
                  style={{ width:'100%', padding:'11px 13px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--text)', fontFamily:'ui-monospace,monospace', outline:'none', boxSizing:'border-box' }}/>
                <a href={opened.docs} target="_blank" rel="noopener" style={{ fontSize:11.5, color:'var(--text)', fontWeight:600, marginTop:6, display:'inline-block', textDecoration:'underline', textDecorationColor:'var(--border-strong)' }}>Wo finde ich meinen Token? ↗</a>
              </div>
            )}

            {opened.authMode === 'webhook' && (
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', display:'block', marginBottom:6 }}>WEBHOOK URL</label>
                <input value={token} onChange={e => setToken(e.target.value)} placeholder="https://hooks.zapier.com/…"
                  style={{ width:'100%', padding:'11px 13px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--text)', fontFamily:'ui-monospace,monospace', outline:'none', boxSizing:'border-box' }}/>
                <p style={{ fontSize:11, color:'var(--text-muted)', margin:'6px 0 0', lineHeight:1.55 }}>Festag postet Events als JSON an diese URL. Du kannst sie in Zapier / make.com / n8n auswerten.</p>
              </div>
            )}

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setOpen(null)} style={{ flex:1, padding:'11px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:11, fontSize:13, fontWeight:700, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>Abbrechen</button>
              <button onClick={() => saveConnection(opened)}
                disabled={(opened.authMode !== 'oauth' && !token.trim()) || saving}
                style={{ flex:2, padding:'11px', background: opened.authMode === 'oauth' || token.trim() ? 'var(--text)' : 'var(--surface-2)', color: opened.authMode === 'oauth' || token.trim() ? 'var(--bg)' : 'var(--text-muted)', border:'none', borderRadius:11, fontSize:13, fontWeight:700, cursor: (opened.authMode === 'oauth' || token.trim()) && !saving ? 'pointer' : 'default', fontFamily:'inherit', opacity: saving ? .7 : 1 }}>
                {saving ? 'Wird verbunden…' : opened.authMode === 'oauth' ? `Mit ${opened.name} fortfahren →` : 'Speichern & Verbinden'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LinearLinkModal
        open={linearLinkOpen}
        onClose={() => setLinearLinkOpen(false)}
        onChanged={() => void loadLinearLinks()}
      />
    </>
  )
}

const CONN_CSS = `
  .conn-dt-head { display: none; }
  .conn-dt-head h1 { margin: 0; font-size: 22px; font-weight: 500; }
  .conn-dt-head p { margin: 6px 0 0; color: var(--text-secondary); font-size: 14px; }
  .conn-dt-filters { display: none; }

  .conn-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 14px;
  }
  .conn-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 11px;
    min-height: 170px;
    transition: transform .15s, border-color .15s, box-shadow .15s;
  }
  .conn-card.is-connected { border-color: rgba(34, 197, 94, 0.3); }
  .conn-card:hover { transform: translateY(-2px); border-color: var(--border-strong); box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }
  .conn-card-top { display: flex; align-items: center; gap: 11px; }
  .conn-icon {
    width: 42px; height: 42px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 800; flex-shrink: 0; overflow: hidden;
  }
  .conn-icon img { width: 70%; height: 70%; object-fit: contain; filter: brightness(0) invert(1); }
  .conn-card-meta { flex: 1; min-width: 0; }
  .conn-card-title-row { display: flex; align-items: center; gap: 6px; }
  .conn-name { font-size: 14px; font-weight: 700; color: var(--text); margin: 0; }
  .conn-active-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 7px; background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 8px;
    font-size: 9.5px; font-weight: 800; color: #16a34a; letter-spacing: 0.05em;
  }
  .conn-active-dot { width: 4px; height: 4px; border-radius: 50%; background: #22c55e; }
  .conn-category { font-size: 10.5px; color: var(--text-muted); margin: 2px 0 0; letter-spacing: 0.05em; }
  .conn-desc { font-size: 12.5px; color: var(--text-secondary); margin: 0; line-height: 1.5; flex: 1; }
  .conn-linear-meta {
    margin: -4px 0 0;
    font-size: 11.5px;
    color: #5E6AD2;
    font-weight: 600;
  }
  .conn-actions { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; }
  .conn-btn {
    flex: 1; padding: 8px 14px; border-radius: 8px; font-size: 12.5px;
    font-weight: 700; cursor: pointer; font-family: inherit; text-decoration: none;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .conn-btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
  .conn-btn-docs { flex: 0; padding: 8px 11px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text); }
  .conn-btn-primary { background: var(--text); color: var(--bg); border: none; }
  .conn-btn-linear { background: #5E6AD2; color: #fff; border: none; flex: 1.2; }
  .conn-chip {
    padding: 6px 12px; font-size: 11.5px; font-weight: 700;
    border: 1px solid var(--border); background: var(--card);
    border-radius: 20px; cursor: pointer; font-family: inherit;
    color: var(--text-secondary); transition: all .12s;
  }
  .conn-chip.on { background: var(--text); color: var(--bg); border-color: var(--text); }
  .conn-chip:hover:not(.on) { border-color: var(--border-strong); color: var(--text); }

  @media (min-width: 769px) {
    .conn-dt-head { display: block; margin-bottom: 16px; }
    .conn-dt-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
  }

  @media (max-width: 768px) {
    .conn-grid { grid-template-columns: 1fr; gap: 12px; }
    .conn-card {
      border: 1px solid rgba(0, 0, 0, 0.07);
      border-radius: 14px;
      background: #FFFFFF;
      box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 1px 0 rgba(0,0,0,0.04), 0 4px 10px rgba(144,149,159,0.16);
    }
    [data-theme="dark"] .conn-card,
    [data-theme="classic-dark"] .conn-card {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.14);
    }
    .conn-card:hover { transform: none; }
    .conn-name { font-size: 16px; font-weight: 500; letter-spacing: -0.02em; }
    .conn-desc { font-size: 14px; }
    .conn-page .mcl-actions { position: relative; }
  }
`
