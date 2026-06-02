'use client'

/**
 * HowFestagWorks — the calm "So funktioniert Festag" widget.
 *
 * Two parts in one component:
 *   1) A compact card that lives at the bottom of the sidebar. It shows a
 *      small, 3D-tilted, gently animated dashboard preview (our own mock —
 *      layered panels, a moving progress bar, a breathing Tagro orb). It is
 *      dismissible and remembers that choice (localStorage).
 *   2) On click it opens a calm, flat modal with a ~15-second looping
 *      explainer that walks the Festag flow in four scenes:
 *        Idee → Tagro zerlegt → Entwickler arbeitet → Statusbericht.
 *      Everything is pure CSS/SVG — no video asset, no external deps.
 *
 * Language stays on-brand: project intelligence, verified progress, calm
 * translation between idea and execution. No surveillance tone.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkle, X } from '@phosphor-icons/react'

const DISMISS_KEY = 'festag.howItWorks.dismissed.v1'

export default function HowFestagWorks() {
  const [dismissed, setDismissed] = useState(true) // hide until we read storage
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  // Esc closes the modal.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!mounted) return null

  return (
    <>
      <style>{HFW_CSS}</style>

      {!dismissed && (
        <div className="hfw-card">
          <button
            type="button"
            className="hfw-card-close"
            aria-label="Ausblenden"
            onClick={(e) => { e.stopPropagation(); dismiss() }}
          >
            <X size={11} weight="bold" />
          </button>

          <button type="button" className="hfw-card-open" onClick={() => setOpen(true)}>
            <div className="hfw-mini" aria-hidden="true">
              <div className="hfw-mini-stage">
                <div className="hfw-mini-panel">
                  <span className="hfw-mini-bar b1" />
                  <span className="hfw-mini-bar b2" />
                  <span className="hfw-mini-progress"><span /></span>
                  <span className="hfw-mini-orb" />
                </div>
              </div>
            </div>
            <div className="hfw-card-text">
              <span className="hfw-card-title">So funktioniert Festag</span>
              <span className="hfw-card-sub">15-Sekunden-Überblick ansehen</span>
            </div>
          </button>
        </div>
      )}

      {open && createPortal(
        <div className="hfw-overlay" onClick={() => setOpen(false)}>
          <div className="hfw-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="hfw-modal-close" aria-label="Schließen" onClick={() => setOpen(false)}>
              <X size={15} weight="bold" />
            </button>

            <div className="hfw-stage" aria-hidden="true">
              <div className="hfw-deck">
                {/* Scene 1 — Idee */}
                <div className="hfw-scene s1">
                  <div className="hfw-panel">
                    <span className="hfw-tag"><Sparkle size={12} weight="fill" /> Deine Idee</span>
                    <span className="hfw-line w80" />
                    <span className="hfw-line w60" />
                    <span className="hfw-line w70" />
                    <span className="hfw-caret" />
                  </div>
                </div>
                {/* Scene 2 — Tagro zerlegt */}
                <div className="hfw-scene s2">
                  <div className="hfw-panel">
                    <span className="hfw-tag accent">Tagro zerlegt</span>
                    <div className="hfw-rows">
                      <span className="hfw-chip d0" />
                      <span className="hfw-chip d1" />
                      <span className="hfw-chip d2" />
                      <span className="hfw-chip d3" />
                    </div>
                    <span className="hfw-orb-big" />
                  </div>
                </div>
                {/* Scene 3 — Entwickler arbeitet */}
                <div className="hfw-scene s3">
                  <div className="hfw-panel">
                    <span className="hfw-tag">Entwickler arbeitet</span>
                    <div className="hfw-track"><span className="hfw-fill" /></div>
                    <div className="hfw-rows">
                      <span className="hfw-task done" />
                      <span className="hfw-task done d1" />
                      <span className="hfw-task d2" />
                    </div>
                  </div>
                </div>
                {/* Scene 4 — Statusbericht */}
                <div className="hfw-scene s4">
                  <div className="hfw-panel">
                    <span className="hfw-tag good">Geprüfter Statusbericht</span>
                    <span className="hfw-line w70" />
                    <span className="hfw-line w90" />
                    <span className="hfw-check"><Sparkle size={14} weight="fill" /></span>
                  </div>
                </div>
              </div>

              {/* progress dots */}
              <div className="hfw-dots">
                <span className="d s1" /><span className="d s2" /><span className="d s3" /><span className="d s4" />
              </div>
            </div>

            <div className="hfw-copy">
              <p className="hfw-kicker">So funktioniert Festag</p>
              <h2 className="hfw-headline">Von der Idee zum geprüften Fortschritt</h2>
              <p className="hfw-body">
                Du beschreibst dein Vorhaben. Tagro übersetzt und zerlegt es in klare
                Schritte, der Entwickler setzt um — und du siehst jederzeit ruhig und
                verständlich, wo dein Projekt steht.
              </p>
              <button type="button" className="hfw-cta" onClick={() => setOpen(false)}>
                Verstanden
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

const HFW_CSS = `
/* ── card in the sidebar ───────────────────────────────────────── */
.hfw-card {
  position:relative; margin:8px 8px 4px; border-radius:12px;
  background:var(--card); border:1px solid var(--border);
  overflow:hidden;
}
.hfw-card-close {
  position:absolute; top:6px; right:6px; z-index:2;
  width:18px; height:18px; border-radius:6px; display:flex; align-items:center; justify-content:center;
  background:transparent; border:none; color:var(--text-muted); cursor:pointer; opacity:.7;
}
.hfw-card-close:hover { background:var(--surface-2); opacity:1; }
.hfw-card-open {
  display:flex; align-items:center; gap:10px; width:100%;
  padding:10px; background:transparent; border:none; cursor:pointer; text-align:left;
}
.hfw-card-open:hover { background:var(--surface-2); }
.hfw-card-text { display:flex; flex-direction:column; gap:2px; min-width:0; }
.hfw-card-title {
  font-size:12px; font-weight:600; color:var(--text);
  letter-spacing:var(--ls-body, .017em); white-space:nowrap;
}
.hfw-card-sub {
  font-size:10.5px; color:var(--text-muted); letter-spacing:var(--ls-body, .017em);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

/* the tiny 3D dashboard mock */
.hfw-mini { width:44px; height:34px; flex-shrink:0; perspective:240px; }
.hfw-mini-stage {
  width:100%; height:100%; transform-style:preserve-3d;
  transform:rotateX(16deg) rotateY(-20deg);
  animation:hfwTilt 7s ease-in-out infinite;
}
@keyframes hfwTilt {
  0%,100% { transform:rotateX(16deg) rotateY(-20deg); }
  50%     { transform:rotateX(12deg) rotateY(-8deg); }
}
.hfw-mini-panel {
  position:relative; width:100%; height:100%; border-radius:6px;
  background:linear-gradient(150deg, var(--surface), var(--surface-2));
  border:1px solid var(--border); box-shadow:0 6px 14px -8px rgba(0,0,0,.4);
  padding:6px;
}
.hfw-mini-bar { display:block; height:2.5px; border-radius:2px; background:var(--text-muted); opacity:.45; margin-bottom:3px; }
.hfw-mini-bar.b1 { width:70%; }
.hfw-mini-bar.b2 { width:46%; }
.hfw-mini-progress { display:block; height:3px; border-radius:2px; background:var(--surface); overflow:hidden; margin-top:3px; }
.hfw-mini-progress > span {
  display:block; height:100%; width:30%; border-radius:2px; background:var(--btn-prim);
  animation:hfwFill 4s ease-in-out infinite;
}
@keyframes hfwFill { 0%{width:22%;} 50%{width:78%;} 100%{width:22%;} }
.hfw-mini-orb {
  position:absolute; right:5px; bottom:5px; width:6px; height:6px; border-radius:50%;
  background:var(--btn-prim); box-shadow:0 0 0 3px color-mix(in srgb, var(--btn-prim) 22%, transparent);
  animation:hfwPulse 3s ease-in-out infinite;
}
@keyframes hfwPulse { 0%,100%{transform:scale(1);opacity:.85;} 50%{transform:scale(1.25);opacity:1;} }

/* ── modal ─────────────────────────────────────────────────────── */
.hfw-overlay {
  position:fixed; inset:0; z-index:1000;
  background:color-mix(in srgb, var(--bg) 62%, rgba(0,0,0,.5));
  backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
  display:flex; align-items:center; justify-content:center; padding:24px;
  animation:hfwFade .25s ease both;
}
@keyframes hfwFade { from{opacity:0;} to{opacity:1;} }
.hfw-modal {
  position:relative; width:100%; max-width:520px; border-radius:18px;
  background:var(--card); border:1px solid var(--border);
  box-shadow:0 30px 80px -30px rgba(0,0,0,.5); overflow:hidden;
  animation:hfwPop .32s cubic-bezier(.16,1,.3,1) both;
}
@keyframes hfwPop { from{opacity:0;transform:translateY(12px) scale(.98);} to{opacity:1;transform:none;} }
.hfw-modal-close {
  position:absolute; top:14px; right:14px; z-index:3;
  width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center;
  background:color-mix(in srgb, var(--card) 70%, transparent); border:1px solid var(--border);
  color:var(--text-muted); cursor:pointer;
}
.hfw-modal-close:hover { background:var(--surface-2); color:var(--text); }

/* animated stage */
.hfw-stage {
  position:relative; height:236px;
  background:radial-gradient(120% 100% at 50% 0%, var(--surface-2), var(--surface));
  border-bottom:1px solid var(--border);
  perspective:900px; overflow:hidden;
}
.hfw-deck {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  transform-style:preserve-3d;
}
.hfw-scene {
  position:absolute; width:300px; opacity:0;
  transform:translateY(14px) rotateX(8deg) scale(.96);
  transform-origin:center;
}
.hfw-panel {
  position:relative; border-radius:14px; padding:18px;
  background:var(--card); border:1px solid var(--border);
  box-shadow:0 24px 50px -28px rgba(0,0,0,.5);
  display:flex; flex-direction:column; gap:10px; min-height:132px;
}
.hfw-tag {
  display:inline-flex; align-items:center; gap:6px; align-self:flex-start;
  font-size:11px; font-weight:600; letter-spacing:var(--ls-body, .017em);
  color:var(--text-secondary); padding:4px 9px; border-radius:7px;
  background:var(--surface-2); border:1px solid var(--border);
}
.hfw-tag.accent { color:var(--btn-prim); background:color-mix(in srgb, var(--btn-prim) 12%, var(--card)); border-color:color-mix(in srgb, var(--btn-prim) 24%, var(--border)); }
.hfw-tag.good { color:var(--green-dark, #28A745); background:color-mix(in srgb, var(--green, #34C759) 14%, var(--card)); border-color:color-mix(in srgb, var(--green, #34C759) 26%, var(--border)); }
.hfw-line { display:block; height:8px; border-radius:5px; background:var(--surface-2); }
.hfw-line.w60 { width:60%; } .hfw-line.w70 { width:70%; } .hfw-line.w80 { width:80%; } .hfw-line.w90 { width:90%; }
.hfw-caret {
  position:absolute; left:18px; bottom:16px; width:2px; height:15px; background:var(--btn-prim);
  animation:hfwBlink 1s steps(2) infinite;
}
@keyframes hfwBlink { 0%,100%{opacity:1;} 50%{opacity:0;} }
.hfw-rows { display:flex; flex-direction:column; gap:7px; }
.hfw-chip { height:11px; border-radius:6px; background:var(--surface-2); }
.hfw-chip.d0 { width:88%; } .hfw-chip.d1 { width:74%; } .hfw-chip.d2 { width:60%; } .hfw-chip.d3 { width:46%; }
.hfw-orb-big {
  position:absolute; right:16px; top:16px; width:14px; height:14px; border-radius:50%;
  background:var(--btn-prim); box-shadow:0 0 0 6px color-mix(in srgb, var(--btn-prim) 16%, transparent);
  animation:hfwPulse 2.6s ease-in-out infinite;
}
.hfw-track { height:8px; border-radius:5px; background:var(--surface-2); overflow:hidden; }
.hfw-fill { display:block; height:100%; border-radius:5px; background:var(--btn-prim); animation:hfwFill3 3.6s ease-in-out infinite; }
@keyframes hfwFill3 { 0%{width:12%;} 50%{width:82%;} 100%{width:12%;} }
.hfw-task { height:10px; border-radius:6px; background:var(--surface-2); width:80%; }
.hfw-task.done { background:color-mix(in srgb, var(--green, #34C759) 40%, var(--surface-2)); }
.hfw-task.d1 { width:64%; } .hfw-task.d2 { width:50%; }
.hfw-check {
  position:absolute; right:16px; top:16px; width:26px; height:26px; border-radius:8px;
  display:flex; align-items:center; justify-content:center; color:#fff;
  background:var(--green, #34C759); animation:hfwPulse 2.6s ease-in-out infinite;
}

/* 15s loop — four scenes, ~3.75s each, sharing one timeline (no delay
   tricks). Each scene owns a quarter of the cycle and cross-fades. */
.hfw-scene.s1 { animation:hfwSc1 15s ease-in-out infinite; }
.hfw-scene.s2 { animation:hfwSc2 15s ease-in-out infinite; }
.hfw-scene.s3 { animation:hfwSc3 15s ease-in-out infinite; }
.hfw-scene.s4 { animation:hfwSc4 15s ease-in-out infinite; }
@keyframes hfwSc1 {
  0%   { opacity:0; transform:translateY(14px) rotateX(8deg) scale(.96); }
  3%   { opacity:1; transform:none; }
  22%  { opacity:1; transform:none; }
  26%,100% { opacity:0; transform:translateY(-14px) rotateX(-8deg) scale(.96); }
}
@keyframes hfwSc2 {
  0%,25%   { opacity:0; transform:translateY(14px) rotateX(8deg) scale(.96); }
  28%  { opacity:1; transform:none; }
  47%  { opacity:1; transform:none; }
  51%,100% { opacity:0; transform:translateY(-14px) rotateX(-8deg) scale(.96); }
}
@keyframes hfwSc3 {
  0%,50%   { opacity:0; transform:translateY(14px) rotateX(8deg) scale(.96); }
  53%  { opacity:1; transform:none; }
  72%  { opacity:1; transform:none; }
  76%,100% { opacity:0; transform:translateY(-14px) rotateX(-8deg) scale(.96); }
}
@keyframes hfwSc4 {
  0%,75%   { opacity:0; transform:translateY(14px) rotateX(8deg) scale(.96); }
  78%  { opacity:1; transform:none; }
  97%  { opacity:1; transform:none; }
  100% { opacity:0; transform:translateY(-14px) rotateX(-8deg) scale(.96); }
}

.hfw-dots { position:absolute; bottom:14px; left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:2; }
.hfw-dots .d { width:6px; height:6px; border-radius:50%; background:var(--border); }
.hfw-dots .d.s1 { animation:hfwDot1 15s steps(1) infinite; }
.hfw-dots .d.s2 { animation:hfwDot2 15s steps(1) infinite; }
.hfw-dots .d.s3 { animation:hfwDot3 15s steps(1) infinite; }
.hfw-dots .d.s4 { animation:hfwDot4 15s steps(1) infinite; }
@keyframes hfwDot1 { 0%,24.9%{ background:var(--btn-prim); } 25%,100%{ background:var(--border); } }
@keyframes hfwDot2 { 0%,24.9%{ background:var(--border);} 25%,49.9%{ background:var(--btn-prim); } 50%,100%{ background:var(--border); } }
@keyframes hfwDot3 { 0%,49.9%{ background:var(--border);} 50%,74.9%{ background:var(--btn-prim); } 75%,100%{ background:var(--border); } }
@keyframes hfwDot4 { 0%,74.9%{ background:var(--border);} 75%,100%{ background:var(--btn-prim); } }

.hfw-copy { padding:22px 24px 24px; }
.hfw-kicker {
  font-size:11px; font-weight:600; letter-spacing:var(--ls-sidebar, .023em);
  text-transform:uppercase; color:var(--text-muted); margin:0 0 8px;
}
.hfw-headline {
  font-size:19px; font-weight:600; color:var(--text);
  letter-spacing:var(--ls-header, .012em); margin:0 0 10px; line-height:1.3;
}
.hfw-body {
  font-size:13.5px; color:var(--text-secondary); line-height:1.65;
  letter-spacing:var(--ls-body, .017em); margin:0 0 20px;
}
.hfw-cta {
  display:inline-flex; align-items:center; justify-content:center;
  padding:10px 18px; border-radius:8px; border:none; cursor:pointer;
  font-size:13.5px; font-weight:600; letter-spacing:var(--ls-body, .017em);
  background:var(--btn-prim); color:var(--btn-prim-text);
}
.hfw-cta:hover { filter:brightness(1.06); }

@media (max-width:560px) {
  .hfw-modal { max-width:none; }
  .hfw-scene { width:84vw; max-width:300px; }
}
`
