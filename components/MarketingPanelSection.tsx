'use client'

/**
 * MarketingPanelSection — the Marketing Control Room for a marketing project.
 *
 * Phase 1: campaigns, budget transparency ("wo geht mein Geld hin?") and leads.
 * Reads/writes marketing_* tables via the user client (RLS scopes to project
 * access). Borderless notepad inputs, calm Festag styling.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Trash, Megaphone, CurrencyEur, UsersThree } from '@phosphor-icons/react'

type Campaign = {
  id: string; name: string; status: string; campaign_type: string
  budget_planned: number; budget_spent: number; currency: string; client_visible: boolean
}
type BudgetEntry = { id: string; type: string; amount: number; currency: string; entry_date: string; description: string | null }
type Lead = { id: string; lead_name: string | null; source_channel: string | null; status: string; value: number | null; created_at: string }

const CAMPAIGN_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Entwurf', color: '#6F7A89' },
  planned: { label: 'Geplant', color: '#6a738c' },
  active: { label: 'Aktiv', color: '#3FB984' },
  paused: { label: 'Pausiert', color: '#D4882B' },
  completed: { label: 'Abgeschlossen', color: '#6a738c' },
  needs_review: { label: 'Prüfen', color: '#D4882B' },
  archived: { label: 'Archiviert', color: '#6F7A89' },
}
const BUDGET_TYPE: Record<string, string> = {
  ad_spend: 'Werbebudget', production_cost: 'Produktion', agency_fee: 'Agenturleistung',
  creator_fee: 'Creator', tool_cost: 'Tools', media_buy: 'Media-Buy', other: 'Sonstiges',
}
const LEAD_STATUS: Record<string, string> = {
  new: 'Neu', contacted: 'Kontaktiert', qualified: 'Qualifiziert', converted: 'Gewonnen', lost: 'Verloren', archived: 'Archiviert',
}

function eur(n: number, currency = 'EUR') {
  try { return new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n) }
  catch { return `${Math.round(n)} €` }
}

export default function MarketingPanelSection({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [budget, setBudget] = useState<BudgetEntry[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [addCampaign, setAddCampaign] = useState(false)
  const [cName, setCName] = useState('')
  const [cBudget, setCBudget] = useState('')

  const [addBudget, setAddBudget] = useState(false)
  const [bType, setBType] = useState('ad_spend')
  const [bAmount, setBAmount] = useState('')
  const [bDesc, setBDesc] = useState('')

  const [addLead, setAddLead] = useState(false)
  const [lName, setLName] = useState('')
  const [lChannel, setLChannel] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: b }, { data: l }] = await Promise.all([
      (supabase as any).from('marketing_campaigns').select('id,name,status,campaign_type,budget_planned,budget_spent,currency,client_visible').eq('project_id', projectId).order('created_at', { ascending: false }),
      (supabase as any).from('marketing_budget_entries').select('id,type,amount,currency,entry_date,description').eq('project_id', projectId).order('entry_date', { ascending: false }).limit(50),
      (supabase as any).from('marketing_leads').select('id,lead_name,source_channel,status,value,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(50),
    ])
    setCampaigns((c as Campaign[]) ?? [])
    setBudget((b as BudgetEntry[]) ?? [])
    setLeads((l as Lead[]) ?? [])
    setLoading(false)
  }, [supabase, projectId])

  useEffect(() => { load() }, [load])

  async function uid() { return (await supabase.auth.getUser()).data.user?.id }

  async function saveCampaign() {
    if (!cName.trim()) { setError('Kampagnenname fehlt.'); return }
    const { error: e } = await (supabase as any).from('marketing_campaigns').insert({
      project_id: projectId, name: cName.trim(), budget_planned: Number(cBudget) || 0, status: 'planned', created_by: await uid(),
    })
    if (e) { setError(e.message); return }
    setCName(''); setCBudget(''); setAddCampaign(false); await load()
  }
  async function saveBudget() {
    if (!Number(bAmount)) { setError('Betrag fehlt.'); return }
    const { error: e } = await (supabase as any).from('marketing_budget_entries').insert({
      project_id: projectId, type: bType, amount: Number(bAmount), description: bDesc.trim() || null, created_by: await uid(),
    })
    if (e) { setError(e.message); return }
    setBAmount(''); setBDesc(''); setAddBudget(false); await load()
  }
  async function saveLead() {
    if (!lName.trim() && !lChannel.trim()) { setError('Lead-Name oder Kanal angeben.'); return }
    const { error: e } = await (supabase as any).from('marketing_leads').insert({
      project_id: projectId, lead_name: lName.trim() || null, source_channel: lChannel.trim() || null, status: 'new', created_by: await uid(),
    })
    if (e) { setError(e.message); return }
    setLName(''); setLChannel(''); setAddLead(false); await load()
  }
  async function del(table: string, id: string, setter: (fn: (p: any[]) => any[]) => void) {
    setter(prev => prev.filter((r: any) => r.id !== id))
    const { error: e } = await (supabase as any).from(table).delete().eq('id', id)
    if (e) { setError(e.message); await load() }
  }

  const spentTotal = budget.reduce((s, b) => s + (b.amount || 0), 0)
  const plannedTotal = campaigns.reduce((s, c) => s + (c.budget_planned || 0), 0)
  const spentByType = budget.reduce((acc, b) => { acc[b.type] = (acc[b.type] || 0) + b.amount; return acc }, {} as Record<string, number>)
  const convertedLeads = leads.filter(l => l.status === 'converted').length

  return (
    <div className="mk">
      <style>{CSS}</style>

      {/* Money flow — "wo geht mein Geld hin?" */}
      <section className="mk-block">
        <div className="mk-head">
          <span className="mk-h"><CurrencyEur size={15} /> Budget</span>
          {canEdit && !addBudget && <button className="mk-add" onClick={() => { setAddBudget(true); setError('') }}><Plus size={13} /> Ausgabe</button>}
        </div>
        <div className="mk-money">
          <div className="mk-money-cell"><span>Geplant</span><strong>{eur(plannedTotal)}</strong></div>
          <div className="mk-money-cell"><span>Eingesetzt</span><strong>{eur(spentTotal)}</strong></div>
          <div className="mk-money-cell"><span>Rest</span><strong>{eur(Math.max(0, plannedTotal - spentTotal))}</strong></div>
        </div>
        {Object.keys(spentByType).length > 0 && (
          <div className="mk-bytype">
            {Object.entries(spentByType).map(([t, amt]) => (
              <span key={t} className="mk-chip">{BUDGET_TYPE[t] || t}: {eur(amt)}</span>
            ))}
          </div>
        )}
        {addBudget && (
          <div className="mk-form">
            <button className="mk-form-x" onClick={() => setAddBudget(false)}><X size={13} /></button>
            <div className="mk-form-row">
              <select className="mk-select" value={bType} onChange={e => setBType(e.target.value)}>
                {Object.entries(BUDGET_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input className="mk-np" type="number" placeholder="Betrag €" value={bAmount} onChange={e => setBAmount(e.target.value)} />
            </div>
            <input className="mk-np" placeholder="Wofür? (optional)" value={bDesc} onChange={e => setBDesc(e.target.value)} />
            <div className="mk-form-actions"><button className="mk-primary" onClick={saveBudget}>Speichern</button></div>
          </div>
        )}
        {budget.length > 0 && (
          <div className="mk-list">
            {budget.slice(0, 8).map(b => (
              <div key={b.id} className="mk-row">
                <span className="mk-row-main">{BUDGET_TYPE[b.type] || b.type}{b.description ? ` · ${b.description}` : ''}</span>
                <span className="mk-row-amt">{eur(b.amount, b.currency)}</span>
                {canEdit && <button className="mk-del" onClick={() => del('marketing_budget_entries', b.id, setBudget as any)}><Trash size={12} /></button>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Campaigns */}
      <section className="mk-block">
        <div className="mk-head">
          <span className="mk-h"><Megaphone size={15} /> Kampagnen</span>
          {canEdit && !addCampaign && <button className="mk-add" onClick={() => { setAddCampaign(true); setError('') }}><Plus size={13} /> Kampagne</button>}
        </div>
        {addCampaign && (
          <div className="mk-form">
            <button className="mk-form-x" onClick={() => setAddCampaign(false)}><X size={13} /></button>
            <input className="mk-np mk-np-title" placeholder="Kampagnenname" value={cName} onChange={e => setCName(e.target.value)} autoFocus />
            <input className="mk-np" type="number" placeholder="Geplantes Budget € (optional)" value={cBudget} onChange={e => setCBudget(e.target.value)} />
            <div className="mk-form-actions"><button className="mk-primary" onClick={saveCampaign}>Kampagne anlegen</button></div>
          </div>
        )}
        {!loading && campaigns.length === 0 && !addCampaign && <p className="mk-empty">Noch keine Kampagnen.</p>}
        <div className="mk-list">
          {campaigns.map(c => {
            const st = CAMPAIGN_STATUS[c.status] ?? CAMPAIGN_STATUS.draft
            return (
              <div key={c.id} className="mk-row">
                <span className="mk-row-main">
                  <span className="mk-dot" style={{ background: st.color }} />{c.name}
                  <span className="mk-row-sub">{st.label}{c.budget_planned ? ` · ${eur(c.budget_planned, c.currency)}` : ''}</span>
                </span>
                {canEdit && <button className="mk-del" onClick={() => del('marketing_campaigns', c.id, setCampaigns as any)}><Trash size={12} /></button>}
              </div>
            )
          })}
        </div>
      </section>

      {/* Leads */}
      <section className="mk-block">
        <div className="mk-head">
          <span className="mk-h"><UsersThree size={15} /> Leads <span className="mk-count">{leads.length}{convertedLeads ? ` · ${convertedLeads} gewonnen` : ''}</span></span>
          {canEdit && !addLead && <button className="mk-add" onClick={() => { setAddLead(true); setError('') }}><Plus size={13} /> Lead</button>}
        </div>
        {addLead && (
          <div className="mk-form">
            <button className="mk-form-x" onClick={() => setAddLead(false)}><X size={13} /></button>
            <div className="mk-form-row">
              <input className="mk-np" placeholder="Name / Firma" value={lName} onChange={e => setLName(e.target.value)} autoFocus />
              <input className="mk-np" placeholder="Kanal (z. B. Meta)" value={lChannel} onChange={e => setLChannel(e.target.value)} />
            </div>
            <div className="mk-form-actions"><button className="mk-primary" onClick={saveLead}>Lead erfassen</button></div>
          </div>
        )}
        {leads.length > 0 && (
          <div className="mk-list">
            {leads.slice(0, 8).map(l => (
              <div key={l.id} className="mk-row">
                <span className="mk-row-main">{l.lead_name || 'Lead'}<span className="mk-row-sub">{l.source_channel || '—'} · {LEAD_STATUS[l.status] || l.status}</span></span>
                {canEdit && <button className="mk-del" onClick={() => del('marketing_leads', l.id, setLeads as any)}><Trash size={12} /></button>}
              </div>
            ))}
          </div>
        )}
      </section>

      {error && <p className="mk-error">{error}</p>}
    </div>
  )
}

const CSS = `
  .mk { display:flex; flex-direction:column; gap:22px; max-width:760px; }
  .mk-block { display:flex; flex-direction:column; gap:11px; }
  .mk-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .mk-h { display:inline-flex; align-items:center; gap:7px; font-size:14px; font-weight:500; color:var(--text); }
  .mk-h svg { color:var(--text-muted); }
  .mk-count { font-size:12px; color:var(--text-muted); font-weight:500; }
  .mk-add { display:inline-flex; align-items:center; gap:5px; height:30px; padding:0 11px; border-radius:8px; border:1px solid color-mix(in srgb, var(--border) 76%, transparent); background:transparent; color:var(--text); font:inherit; font-size:12px; font-weight:500; cursor:pointer; }
  .mk-add:hover { background:color-mix(in srgb, var(--surface-2) 50%, transparent); }
  .mk-money { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .mk-money-cell { display:flex; flex-direction:column; gap:3px; padding:13px 14px; border-radius:12px; background:color-mix(in srgb, var(--surface-2) 30%, transparent); border:1px solid color-mix(in srgb, var(--border) 40%, transparent); }
  .mk-money-cell span { font-size:11.5px; color:var(--text-muted); }
  .mk-money-cell strong { font-size:17px; font-weight:500; color:var(--text); letter-spacing:-.01em; }
  .mk-bytype { display:flex; flex-wrap:wrap; gap:6px; }
  .mk-chip { font-size:11.5px; color:var(--text-secondary); padding:3px 9px; border-radius:999px; background:color-mix(in srgb, var(--surface-2) 50%, transparent); }
  .mk-form { position:relative; display:flex; flex-direction:column; gap:9px; padding:14px; border-radius:12px; border:1px solid color-mix(in srgb, var(--border) 55%, transparent); background:color-mix(in srgb, var(--surface-2) 22%, transparent); }
  .mk-form-x { position:absolute; top:9px; right:9px; width:24px; height:24px; border:0; background:transparent; color:var(--text-muted); border-radius:7px; cursor:pointer; }
  .mk-form-row { display:flex; gap:10px; flex-wrap:wrap; }
  .mk-form-row > * { flex:1; min-width:140px; }
  .mk-np { width:100%; background:transparent; border:0; outline:0; color:var(--text); font:inherit; font-size:14px; padding:6px 0; }
  .mk-np::placeholder { color:var(--text-muted); opacity:.6; }
  .mk-np-title { font-size:16px; font-weight:500; }
  .mk-select { height:32px; border-radius:8px; border:1px solid color-mix(in srgb, var(--border) 72%, transparent); background:var(--card); color:var(--text); font:inherit; font-size:13px; padding:0 9px; outline:0; }
  .mk-form-actions { display:flex; justify-content:flex-end; }
  .mk-primary { height:32px; padding:0 15px; border:0; border-radius:8px; background:var(--btn-prim); color:var(--btn-prim-text); font:inherit; font-size:13px; font-weight:500; cursor:pointer; }
  .mk-list { display:flex; flex-direction:column; gap:1px; }
  .mk-row { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid color-mix(in srgb, var(--border) 32%, transparent); }
  .mk-row-main { flex:1; min-width:0; display:flex; align-items:center; gap:8px; font-size:13.5px; color:var(--text); }
  .mk-row-sub { color:var(--text-muted); font-size:12px; }
  .mk-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .mk-row-amt { font-size:13.5px; font-weight:500; color:var(--text); }
  .mk-del { width:26px; height:26px; border:0; background:transparent; color:var(--text-muted); border-radius:7px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
  .mk-del:hover { color:#d44b4b; }
  .mk-empty { margin:0; color:var(--text-muted); font-size:13px; }
  .mk-error { margin:0; color:#d44b4b; font-size:12.5px; font-weight:500; }
  @media (max-width:540px){ .mk-money { grid-template-columns:1fr; } }
`
