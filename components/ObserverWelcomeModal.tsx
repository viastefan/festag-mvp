'use client'

import { Suspense, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, UsersThree } from '@phosphor-icons/react'
import Link from 'next/link'

type WelcomeData = {
  role: string
  projectTitles: string[]
  ownerName?: string
}

function ObserverWelcomeModalInner() {
  const params = useSearchParams()
  const router = useRouter()
  const [data, setData] = useState<WelcomeData | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (params?.get('welcome') !== 'observer') return
    const sb = createClient()
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: rows } = await sb
        .from('workspace_observers')
        .select('role, project_ids, owner_user_id, joined_at')
        .eq('user_id', user.id)
        .eq('status', 'joined')
        .order('joined_at', { ascending: false })
        .limit(1)
      const row = (rows as any[])?.[0]
      if (!row) return

      let titles: string[] = []
      const { data: projs } = row.project_ids === null
        ? await sb.from('projects').select('title').eq('user_id', row.owner_user_id).order('created_at', { ascending: false }).limit(5)
        : await sb.from('projects').select('title').in('id', row.project_ids)
      titles = ((projs as any[]) ?? []).map(p => p.title)

      let ownerName: string | undefined
      try {
        const { data: prof } = await sb.from('profiles').select('full_name,first_name,email').eq('id', row.owner_user_id).maybeSingle()
        const p = prof as any
        ownerName = p?.first_name || p?.full_name?.split(' ')[0] || p?.email?.split('@')[0]
      } catch {}

      setData({ role: row.role || 'Mitwirkende:r', projectTitles: titles, ownerName })
      setOpen(true)
    })()
  }, [params])

  function close() {
    setOpen(false)
    // URL bereinigen ohne Reload
    const url = new URL(window.location.href)
    url.searchParams.delete('welcome')
    router.replace(url.pathname + (url.search || ''))
  }

  if (!open || !data || typeof document === 'undefined') return null

  const titles = data.projectTitles
  const projectLine =
    titles.length === 0 ? '' :
    titles.length === 1 ? titles[0] :
    titles.length === 2 ? `${titles[0]} und ${titles[1]}` :
    `${titles.slice(0, -1).join(', ')} und ${titles[titles.length - 1]}`

  const node = (
    <div className="ow-bg" onClick={close}>
      <style>{`
        @keyframes owFade { from { opacity:0; } to { opacity:1; } }
        @keyframes owPop  {
          0%   { opacity:0; transform:translateY(14px) scale(.96); }
          60%  { opacity:1; transform:translateY(-2px) scale(1.005); }
          100% { transform:translateY(0) scale(1); }
        }
        @keyframes owRingPulse {
          0%   { box-shadow:0 0 0 0 color-mix(in srgb, var(--accent) 40%, transparent); }
          100% { box-shadow:0 0 0 22px color-mix(in srgb, var(--accent) 0%, transparent); }
        }
        @keyframes owIcoFloat {
          0%, 100% { transform:translateY(0); }
          50%      { transform:translateY(-3px); }
        }
        .ow-bg {
          position:fixed; inset:0; z-index:400;
          background:var(--modal-backdrop, rgba(245, 245, 247, 0.72));
          backdrop-filter:none; -webkit-backdrop-filter:none;
          display:flex; align-items:center; justify-content:center;
          padding:24px;
          animation:owFade .22s ease both;
        }
        .ow-card {
          width:min(440px, 100%); max-height:90vh; overflow:auto;
          background:var(--surface);
          border:1px solid var(--border);
          border-radius:14px;
          padding:32px 28px 24px;
          position:relative;
          box-shadow:0 24px 60px rgba(0,0,0,.14);
          animation:owPop .32s cubic-bezier(.16,1,.3,1) both;
          text-align:center;
        }
        .ow-close {
          position:absolute; top:14px; right:14px;
          width:30px; height:30px; border-radius:8px; border:0;
          background:transparent; color:var(--text-muted);
          cursor:pointer; transition:background .12s, color .12s;
          display:inline-flex; align-items:center; justify-content:center;
        }
        .ow-close:hover { background:var(--surface-2); color:var(--text); }
        .ow-ico-wrap {
          width:64px; height:64px; margin:0 auto 18px;
          border-radius:999px;
          background:color-mix(in srgb, var(--accent) 14%, var(--surface));
          color:var(--accent);
          display:flex; align-items:center; justify-content:center;
          animation:owRingPulse 1.6s ease-out 1, owIcoFloat 2.2s ease-in-out infinite;
        }
        .ow-eyebrow {
          color:var(--text-muted); font-size:10.5px; font-weight:500;
          letter-spacing:.2em; text-transform:uppercase;
          margin:0 0 12px;
        }
        .ow-title {
          font-size:18px; font-weight:500;
          letter-spacing:.015em;
          color:var(--text); margin:0 0 14px;
          line-height:1.32;
        }
        .ow-title em { font-family:'Editors Note', serif; font-style:italic; font-weight:500; color:var(--text); }
        .ow-role {
          display:inline-flex; align-items:center;
          padding:5px 11px; border-radius:999px;
          background:var(--surface-2);
          color:var(--text-secondary);
          font-size:11.5px; font-weight:500; letter-spacing:.015em;
          margin:0 0 18px;
        }
        .ow-body {
          font-size:13px; line-height:1.65; color:var(--text-secondary);
          letter-spacing:.015em;
          margin:0 0 22px; max-width:340px; margin-left:auto; margin-right:auto;
          font-weight:500;
        }
        .ow-projects em {
          font-family:'Editors Note', serif; font-style:italic; font-weight:500; color:var(--text);
        }
        .ow-actions {
          display:flex; justify-content:center; gap:8px;
          padding-top:4px;
        }
        .ow-btn {
          height:34px; padding:0 14px; border-radius:999px;
          font:inherit; font-size:12.5px; font-weight:500; letter-spacing:.015em;
          cursor:pointer; text-decoration:none;
          display:inline-flex; align-items:center; gap:6px;
          transition:background .12s ease, color .12s ease, border-color .12s ease;
          background:transparent;
          border:1px solid var(--border);
          color:var(--text-secondary);
        }
        .ow-btn:hover { background:var(--surface-2); color:var(--text); border-color:var(--border-strong); }
        .ow-btn.primary { color:var(--text); border-color:var(--border-strong); }
        .ow-btn.ghost { color:var(--text-muted); }
      `}</style>
      <div className="ow-card" onClick={e => e.stopPropagation()}>
        <button className="ow-close" onClick={close} aria-label="Schließen"><X size={15} /></button>
        <div className="ow-ico-wrap" aria-hidden="true">
          <UsersThree size={28} weight="regular" />
        </div>
        <p className="ow-eyebrow">Willkommen bei Festag</p>
        <h1 className="ow-title">Du wurdest <em>eingeladen</em>{data.ownerName ? `, von ${data.ownerName}` : ''}.</h1>
        <span className="ow-role">{data.role}</span>
        <p className="ow-body">
          {titles.length > 0 ? (
            <>
              Ab jetzt kannst du <span className="ow-projects"><em>{projectLine}</em></span> still mitverfolgen
              und in deiner Rolle mitwirken. Tagro hält dich automatisch auf dem Stand.
            </>
          ) : (
            <>Ab jetzt kannst du als <em>{data.role}</em> mitwirken. Tagro hält dich automatisch auf dem Stand.</>
          )}
        </p>
        <div className="ow-actions">
          <button className="ow-btn ghost" onClick={close}>Später ansehen</button>
          <Link href="/reports" className="ow-btn primary">Statusberichte öffnen</Link>
        </div>
      </div>
    </div>
  )
  return createPortal(node, document.body)
}

export default function ObserverWelcomeModal() {
  return (
    <Suspense fallback={null}>
      <ObserverWelcomeModalInner />
    </Suspense>
  )
}
