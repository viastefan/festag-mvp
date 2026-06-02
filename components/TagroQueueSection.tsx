'use client'

/**
 * TagroQueueSection — scheduled Tagro work for a project.
 *
 * Configures recurring AI jobs (weekly report, health refresh, Nexora scan, …)
 * persisted to `scheduled_ai_jobs`. Drafts by default; client-facing jobs are
 * marked "needs approval". Real DB config — the scheduler/runner consumes these
 * rows (execution is a separate slice). All buttons persist; nothing is faked.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  QUEUE_TEMPLATES, AUDIENCE_LABEL, DELIVERY_LABEL, queueTemplate,
  type QueueTemplate,
} from '@/lib/tagro/queue-templates'
import { Plus, Clock, Check, Trash, X, ShieldCheck } from '@phosphor-icons/react'

type JobRow = {
  id: string
  job_type: string
  schedule_type: string
  cron: string | null
  audience: 'internal' | 'client' | 'executive'
  output_type: string
  delivery_mode: 'draft_only' | 'send_after_approval' | 'auto_send' | 'no_delivery'
  review_required: boolean
  enabled: boolean
  created_at: string
}

export default function TagroQueueSection({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: e } = await (supabase as any)
      .from('scheduled_ai_jobs').select('*').eq('project_id', projectId).order('created_at', { ascending: true })
    if (e) setError(e.message)
    setJobs((data as JobRow[]) ?? [])
    setLoading(false)
  }, [supabase, projectId])

  useEffect(() => { load() }, [load])

  const existingTypes = new Set(jobs.map(j => j.job_type))
  const available = QUEUE_TEMPLATES.filter(t => !existingTypes.has(t.job_type))

  async function addJob(t: QueueTemplate) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Bitte erneut anmelden.')
      const { error: e } = await (supabase as any).from('scheduled_ai_jobs').insert({
        project_id: projectId,
        created_by: user.id,
        job_type: t.job_type,
        schedule_type: t.schedule_type,
        cron: t.cron,
        audience: t.audience,
        output_type: t.output_type,
        delivery_mode: t.delivery_mode,
        review_required: t.review_required,
        enabled: true,
      })
      if (e) throw new Error(e.message)
      setPicking(false)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Konnte Job nicht anlegen.')
    } finally {
      setBusy(false)
    }
  }

  async function toggle(job: JobRow) {
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, enabled: !j.enabled } : j))
    const { error: e } = await (supabase as any).from('scheduled_ai_jobs')
      .update({ enabled: !job.enabled, updated_at: new Date().toISOString() }).eq('id', job.id)
    if (e) { setError(e.message); await load() }
  }

  async function remove(id: string) {
    setJobs(prev => prev.filter(j => j.id !== id))
    const { error: e } = await (supabase as any).from('scheduled_ai_jobs').delete().eq('id', id)
    if (e) { setError(e.message); await load() }
  }

  return (
    <div className="tq">
      <style>{CSS}</style>

      <div className="tq-head">
        <div className="tq-head-meta">
          <span className="tq-title">Tagro Queue</span>
          <span className="tq-sub">
            Geplante Tagro-Arbeit. Entwürfe standardmäßig — kundenfähige Jobs warten auf deine Freigabe.
          </span>
        </div>
        {canEdit && !picking && available.length > 0 && (
          <button type="button" className="tq-add-btn" onClick={() => { setPicking(true); setError('') }}>
            <Plus size={14} /> Job hinzufügen
          </button>
        )}
      </div>

      {picking && (
        <div className="tq-picker">
          <button type="button" className="tq-picker-close" onClick={() => setPicking(false)} aria-label="Schließen"><X size={14} /></button>
          <p className="tq-picker-title">Vorlage wählen</p>
          <div className="tq-picker-list">
            {available.map(t => (
              <button key={t.job_type} type="button" className="tq-picker-item" disabled={busy} onClick={() => addJob(t)}>
                <span className="tq-pi-main">
                  <strong>{t.label}</strong>
                  <small>{t.desc}</small>
                </span>
                <span className="tq-pi-meta">
                  <span className="tq-pi-cron"><Clock size={11} /> {t.cron}</span>
                  <span className="tq-pi-aud">{AUDIENCE_LABEL[t.audience]}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="tq-error">{error}</p>}

      {!loading && jobs.length === 0 && !picking && (
        <div className="tq-empty">
          <p>Noch keine geplanten Jobs. Lege z. B. einen wöchentlichen Statusbericht an — Tagro bereitet ihn vor, du gibst ihn frei.</p>
        </div>
      )}

      <div className="tq-list">
        {jobs.map(job => {
          const t = queueTemplate(job.job_type)
          return (
            <article key={job.id} className={`tq-item${job.enabled ? '' : ' off'}`}>
              <div className="tq-item-main">
                <p className="tq-item-title">{t?.label ?? job.job_type}</p>
                <div className="tq-item-meta">
                  <span className="tq-chip"><Clock size={11} /> {job.cron || job.schedule_type}</span>
                  <span className="tq-chip">{AUDIENCE_LABEL[job.audience]}</span>
                  <span className="tq-chip">{DELIVERY_LABEL[job.delivery_mode]}</span>
                  {job.review_required && <span className="tq-chip review"><ShieldCheck size={11} /> Freigabe nötig</span>}
                </div>
              </div>
              {canEdit && (
                <div className="tq-item-actions">
                  <button type="button" className={`tq-toggle${job.enabled ? ' on' : ''}`} onClick={() => toggle(job)} role="switch" aria-checked={job.enabled} title={job.enabled ? 'Aktiv' : 'Pausiert'}>
                    <span className="tq-toggle-knob">{job.enabled && <Check size={9} weight="bold" />}</span>
                  </button>
                  <button type="button" className="tq-mini danger" onClick={() => remove(job.id)} title="Entfernen"><Trash size={13} /></button>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

const CSS = `
  .tq { display:flex; flex-direction:column; gap:14px; max-width:760px; }
  .tq-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
  .tq-head-meta { display:flex; flex-direction:column; gap:3px; min-width:0; }
  .tq-title { font-size:15px; font-weight:500; color:var(--text); letter-spacing:.01em; }
  .tq-sub { font-size:12.5px; color:var(--text-muted); font-weight:500; line-height:1.5; letter-spacing:.012em; }
  .tq-add-btn {
    display:inline-flex; align-items:center; gap:6px; flex-shrink:0;
    height:32px; padding:0 13px; border-radius:8px;
    border:1px solid color-mix(in srgb, var(--border) 76%, transparent);
    background:transparent; color:var(--text); font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;
    transition:background .12s, border-color .12s;
  }
  .tq-add-btn:hover { background:color-mix(in srgb, var(--surface-2) 50%, transparent); border-color:var(--border-strong); }

  .tq-picker {
    position:relative; padding:14px; border-radius:14px;
    border:1px solid color-mix(in srgb, var(--border) 60%, transparent);
    background:color-mix(in srgb, var(--surface-2) 26%, transparent);
    display:flex; flex-direction:column; gap:10px;
  }
  .tq-picker-close { position:absolute; top:10px; right:10px; width:26px; height:26px; border:0; background:transparent; color:var(--text-muted); border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
  .tq-picker-close:hover { background:color-mix(in srgb, var(--surface-2) 70%, transparent); color:var(--text); }
  .tq-picker-title { margin:0; font-size:11px; font-weight:500; letter-spacing:.06em; text-transform:uppercase; color:var(--text-muted); }
  .tq-picker-list { display:flex; flex-direction:column; gap:7px; }
  .tq-picker-item {
    display:flex; align-items:center; justify-content:space-between; gap:14px; text-align:left;
    padding:11px 13px; border-radius:11px; cursor:pointer;
    border:1px solid color-mix(in srgb, var(--border) 60%, transparent); background:var(--card); color:var(--text); font:inherit;
    transition:border-color .12s, transform .12s;
  }
  .tq-picker-item:hover { border-color:var(--border-strong); transform:translateY(-1px); }
  .tq-picker-item:disabled { opacity:.5; cursor:default; }
  .tq-pi-main { display:flex; flex-direction:column; gap:3px; min-width:0; }
  .tq-pi-main strong { font-size:13.5px; font-weight:500; }
  .tq-pi-main small { font-size:12px; color:var(--text-muted); line-height:1.45; }
  .tq-pi-meta { display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; }
  .tq-pi-cron { display:inline-flex; align-items:center; gap:4px; font-size:11.5px; color:var(--text-secondary); }
  .tq-pi-aud { font-size:11px; color:var(--text-muted); }

  .tq-error { margin:0; color:#d44b4b; font-size:12.5px; font-weight:500; }
  .tq-empty { padding:18px 0; }
  .tq-empty p { margin:0; color:var(--text-muted); font-size:13px; line-height:1.55; max-width:48ch; }

  .tq-list { display:flex; flex-direction:column; gap:1px; }
  .tq-item {
    display:flex; align-items:center; justify-content:space-between; gap:14px;
    padding:13px 0; border-bottom:1px solid color-mix(in srgb, var(--border) 38%, transparent);
  }
  .tq-item.off { opacity:.55; }
  .tq-item-main { min-width:0; display:flex; flex-direction:column; gap:6px; }
  .tq-item-title { margin:0; font-size:14px; font-weight:500; color:var(--text); }
  .tq-item-meta { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
  .tq-chip {
    display:inline-flex; align-items:center; gap:4px;
    font-size:11px; font-weight:500; color:var(--text-secondary);
    padding:2px 8px; border-radius:999px; background:color-mix(in srgb, var(--surface-2) 50%, transparent);
  }
  .tq-chip.review { color:#D4882B; }
  .tq-item-actions { display:flex; align-items:center; gap:8px; flex-shrink:0; }
  .tq-toggle {
    width:38px; height:22px; border-radius:999px; border:0; cursor:pointer; padding:2px;
    background:color-mix(in srgb, var(--border) 90%, transparent); transition:background .14s;
    display:flex; align-items:center;
  }
  .tq-toggle.on { background:var(--btn-prim); }
  .tq-toggle-knob {
    width:18px; height:18px; border-radius:50%; background:#fff; color:var(--btn-prim);
    display:inline-flex; align-items:center; justify-content:center; transform:translateX(0); transition:transform .14s;
    box-shadow:0 1px 2px rgba(0,0,0,.3);
  }
  .tq-toggle.on .tq-toggle-knob { transform:translateX(16px); }
  .tq-mini {
    width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center;
    border:1px solid color-mix(in srgb, var(--border) 60%, transparent); background:transparent;
    color:var(--text-secondary); border-radius:8px; cursor:pointer; transition:color .12s, border-color .12s;
  }
  .tq-mini.danger:hover { color:#d44b4b; border-color:color-mix(in srgb, #d44b4b 40%, transparent); }
`
