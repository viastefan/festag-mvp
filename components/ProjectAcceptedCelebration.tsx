'use client'

/**
 * ProjectAcceptedCelebration — the client-facing moment when a Festag
 * developer accepts an open project.
 *
 * A dev (in the dev panel) taps "Eintragen" on a Festag-directed job. The
 * join route writes a `kind = 'dev_accepted'` notification with the dev's
 * name + avatar in its payload. This component, mounted on the dashboard,
 * picks up the newest unread one and plays a calm celebration: the Tagro
 * orb on one side, the developer's photo on the other, a line drawing
 * between them. Dismissing (or opening the project) marks it read so it
 * never replays.
 *
 * Tone per the product rules: this is "your project is ready", not a
 * surveillance/tracking flourish. Slate + green-dark accents, Phosphor
 * icons, letter-spacing tokens, no Apple emojis.
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Sparkle, X } from '@phosphor-icons/react'

type Celebration = {
  notifId: string
  devName: string
  devAvatar: string | null
  projectId: string
  projectTitle: string
  projectColor: string
}

export default function ProjectAcceptedCelebration() {
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const [phase, setPhase] = useState<'enter' | 'connect' | 'done'>('enter')

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data } = await (supabase as any)
        .from('notifications')
        .select('id,payload,created_at')
        .eq('user_id', user.id)
        .eq('kind', 'dev_accepted')
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(1)

      const row = Array.isArray(data) ? data[0] : null
      const p = row?.payload
      if (!row || !p?.celebrate || cancelled) return

      setCelebration({
        notifId: row.id,
        devName: p.dev_name || 'Dein Entwickler',
        devAvatar: p.dev_avatar ?? null,
        projectId: p.project_id,
        projectTitle: p.project_title || 'Dein Projekt',
        projectColor: p.project_color || '#5B647D',
      })
      // Beat the scene into life: enter → draw connection → settle.
      setTimeout(() => { if (!cancelled) setPhase('connect') }, 480)
      setTimeout(() => { if (!cancelled) setPhase('done') }, 1500)
    })()

    return () => { cancelled = true }
  }, [])

  async function markRead() {
    if (!celebration) return
    const supabase = createClient()
    try {
      await (supabase as any)
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', celebration.notifId)
    } catch { /* best-effort */ }
  }

  function close() {
    markRead()
    setCelebration(null)
  }

  function openProject() {
    if (!celebration) return
    markRead()
    window.location.href = `/project/${celebration.projectId}`
  }

  if (!celebration) return null

  const initial = celebration.devName.trim().charAt(0).toUpperCase() || 'D'

  return (
    <div className="pac-overlay" role="status" aria-live="polite">
      <style>{CSS}</style>
      <div className="pac-backdrop" onClick={close} aria-hidden />

      <div className="pac-card" role="dialog" aria-modal="true" aria-label="Dein Projekt ist startklar">
        <button type="button" className="pac-close" onClick={close} aria-label="Schließen"><X size={16} /></button>

        <p className="pac-kicker">Angenommen · live</p>

        <div className={`pac-stage phase-${phase}`}>
          {/* Tagro orb (left) */}
          <div className="pac-node pac-tagro">
            <span className="pac-orb-wave" aria-hidden />
            <span className="pac-orb-core"><Sparkle size={20} weight="fill" /></span>
            <span className="pac-node-label">Tagro</span>
          </div>

          {/* Connection line */}
          <div className="pac-link" aria-hidden>
            <span className="pac-link-track" />
            <span className="pac-link-fill" />
            <span className="pac-link-spark" />
          </div>

          {/* Developer (right) */}
          <div className="pac-node pac-dev" style={{ ['--accent' as any]: celebration.projectColor }}>
            <span className="pac-dev-ring" aria-hidden />
            <span className="pac-dev-avatar">
              {celebration.devAvatar
                ? <img src={celebration.devAvatar} alt="" />
                : <span className="pac-dev-initial">{initial}</span>}
              <span className="pac-dev-check" aria-hidden>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
            </span>
            <span className="pac-node-label">{celebration.devName}</span>
          </div>
        </div>

        <h2 className="pac-title">Dein Projekt ist startklar</h2>
        <p className="pac-sub">
          <strong>{celebration.devName}</strong> übernimmt „{celebration.projectTitle}". Tagro begleitet
          jeden Schritt und fasst dir alles ruhig und verständlich zusammen.
        </p>

        <div className="pac-actions">
          <button type="button" className="pac-secondary" onClick={close}>Später</button>
          <button type="button" className="pac-primary" onClick={openProject}>
            Projekt öffnen <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

const CSS = `
  .pac-overlay {
    position: fixed; inset: 0; z-index: 13000;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    animation: pacFade .18s ease both;
  }
  .pac-backdrop {
    position: absolute; inset: 0;
    background: rgba(8,10,14,.5);
    backdrop-filter: blur(10px) saturate(120%);
    -webkit-backdrop-filter: blur(10px) saturate(120%);
  }
  @keyframes pacFade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes pacPop { from { opacity: 0; transform: translateY(12px) scale(.985) } to { opacity: 1; transform: none } }

  .pac-card {
    position: relative; z-index: 1;
    width: min(520px, calc(100vw - 32px));
    background: var(--card);
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    border-radius: 20px;
    padding: 26px 28px 22px;
    text-align: center;
    box-shadow: 0 1px 2px rgba(15,23,42,.06), 0 36px 90px -30px rgba(15,23,42,.4);
    animation: pacPop .3s cubic-bezier(.16,1,.3,1) both;
  }
  [data-theme="dark"] .pac-card,
  [data-theme="classic-dark"] .pac-card {
    background: color-mix(in srgb, var(--card) 96%, #fff 4%);
    box-shadow: 0 1px 2px rgba(0,0,0,.5), 0 40px 100px -32px rgba(0,0,0,.7);
  }

  .pac-close {
    position: absolute; top: 14px; right: 14px;
    width: 30px; height: 30px; border: 0; background: transparent;
    color: var(--text-muted); border-radius: 8px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .pac-close:hover { background: color-mix(in srgb, var(--surface-2) 65%, transparent); color: var(--text); }

  .pac-kicker {
    margin: 0 0 18px; font-size: 11px; font-weight: 500;
    letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted);
  }

  /* Stage */
  .pac-stage {
    display: flex; align-items: center; justify-content: center; gap: 0;
    height: 132px; margin: 4px 0 18px;
  }
  .pac-node { display: flex; flex-direction: column; align-items: center; gap: 9px; width: 96px; }
  .pac-node-label {
    font-size: 12px; font-weight: 500; letter-spacing: .01em; color: var(--text);
    max-width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  /* Tagro orb */
  .pac-tagro { position: relative; }
  .pac-orb-core {
    width: 62px; height: 62px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--btn-prim); color: var(--btn-prim-text);
    box-shadow: 0 12px 34px -8px color-mix(in srgb, var(--btn-prim) 60%, transparent);
    position: relative; z-index: 2;
  }
  .pac-orb-wave {
    position: absolute; top: 0; left: 50%; transform: translateX(-50%);
    width: 62px; height: 62px; border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--btn-prim) 50%, transparent);
    animation: pacWave 2.4s ease-out infinite;
  }
  @keyframes pacWave {
    0% { transform: translateX(-50%) scale(.7); opacity: .8; }
    100% { transform: translateX(-50%) scale(1.7); opacity: 0; }
  }

  /* Connection line */
  .pac-link { position: relative; flex: 1; max-width: 130px; height: 3px; margin: 0 6px 26px; }
  .pac-link-track {
    position: absolute; inset: 0; border-radius: 999px;
    background: color-mix(in srgb, var(--border) 80%, transparent);
  }
  .pac-link-fill {
    position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 999px;
    background: linear-gradient(90deg, var(--btn-prim), var(--green-dark));
    transition: width .9s cubic-bezier(.16,1,.3,1);
  }
  .pac-link-spark {
    position: absolute; top: 50%; left: 0; width: 9px; height: 9px;
    margin: -4.5px 0 0 -4.5px; border-radius: 50%;
    background: var(--green-dark);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--green-dark) 25%, transparent);
    opacity: 0; transition: left .9s cubic-bezier(.16,1,.3,1), opacity .3s;
  }
  .pac-stage.phase-connect .pac-link-fill,
  .pac-stage.phase-done .pac-link-fill { width: 100%; }
  .pac-stage.phase-connect .pac-link-spark { left: 100%; opacity: 1; }
  .pac-stage.phase-done .pac-link-spark { left: 100%; opacity: 0; }

  /* Developer node */
  .pac-dev { position: relative; }
  .pac-dev-ring {
    position: absolute; top: 0; left: 50%; transform: translateX(-50%);
    width: 62px; height: 62px; border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
    opacity: 0;
  }
  .pac-stage.phase-done .pac-dev-ring { animation: pacRing 1.8s ease-out infinite; }
  @keyframes pacRing {
    0% { transform: translateX(-50%) scale(.85); opacity: .7; }
    100% { transform: translateX(-50%) scale(1.55); opacity: 0; }
  }
  .pac-dev-avatar {
    position: relative; z-index: 2;
    width: 62px; height: 62px; border-radius: 50%; overflow: visible;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--accent) 18%, var(--surface-2));
    border: 2px solid var(--card);
    box-shadow: 0 8px 24px -10px color-mix(in srgb, var(--accent) 70%, transparent);
    color: var(--text); font-size: 22px; font-weight: 500;
    transform: scale(.6); opacity: 0;
    animation: pacAvatar .5s cubic-bezier(.16,1,.3,1) .3s forwards;
  }
  @keyframes pacAvatar { to { transform: scale(1); opacity: 1; } }
  .pac-dev-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
  .pac-dev-initial { line-height: 1; }
  .pac-dev-check {
    position: absolute; bottom: -2px; right: -2px;
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--green-dark); border: 2px solid var(--card);
    display: inline-flex; align-items: center; justify-content: center;
    transform: scale(0);
  }
  .pac-stage.phase-connect .pac-dev-check,
  .pac-stage.phase-done .pac-dev-check { animation: pacCheck .5s cubic-bezier(.16,1,.3,1) .1s forwards; }
  @keyframes pacCheck { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }

  .pac-title {
    margin: 0 0 8px; font-size: 21px; font-weight: 500;
    letter-spacing: -.005em; color: var(--text);
  }
  .pac-sub {
    margin: 0 auto 20px; max-width: 400px;
    font-size: 13.5px; line-height: 1.6; font-weight: 500;
    letter-spacing: .015em; color: var(--text-secondary);
  }
  .pac-sub strong { color: var(--text); font-weight: 500; }

  .pac-actions { display: flex; align-items: center; justify-content: center; gap: 10px; }
  .pac-primary, .pac-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    height: 40px; padding: 0 20px; border-radius: 8px;
    font: inherit; font-size: 13px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer; transition: opacity .12s, transform .12s, background .12s, color .12s, border-color .12s;
  }
  .pac-primary { background: var(--btn-prim); color: var(--btn-prim-text); border: 0; }
  .pac-primary:hover { opacity: .92; }
  .pac-primary:active { transform: scale(.97); }
  .pac-secondary {
    background: transparent; color: var(--text-secondary);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  }
  .pac-secondary:hover { background: color-mix(in srgb, var(--surface-2) 55%, transparent); color: var(--text); }

  @media (max-width: 520px) {
    .pac-actions { flex-direction: column-reverse; }
    .pac-primary, .pac-secondary { width: 100%; justify-content: center; }
  }
`
