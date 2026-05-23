'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { setTheme, getTheme, type ThemeMode } from '@/lib/theme'
import FestagLoader from '@/components/FestagLoader'
import TagroLogo from '@/components/TagroLogo'
import { rememberFestagAccount } from '@/lib/auth-device-memory'

type StepId = 'mode' | 'design' | 'profile' | 'project' | 'team' | 'invite'
type WorkMode = 'alone' | 'existing_team' | 'clients_partners' | 'festag_support'
type WorkspaceMode = 'delivery' | 'team' | 'agency'

const ALL_STEPS: StepId[] = ['mode', 'design', 'profile', 'project', 'team', 'invite']

const WORKSPACE_MODES: Array<{ id: WorkspaceMode; title: string; desc: string }> = [
  { id: 'delivery', title: 'Ich möchte ein Projekt von Festag umsetzen lassen',
    desc: 'Festag plant, steuert und setzt dein Projekt mit geprüften Entwicklern um. Du bekommst Dashboard, Briefings, Meilensteine und transparente Kommunikation.' },
  { id: 'team',     title: 'Ich möchte eigene Projekte und Entwickler steuern',
    desc: 'Festag als internes Betriebssystem für Softwareprojekte, Aufgaben, Briefings, Entwicklersteuerung und Teamkoordination.' },
  { id: 'agency',   title: 'Ich bin Agentur und steuere Kundenprojekte',
    desc: 'Verwalte Kundenprojekte, eigene Entwickler, Kundenbereiche, Briefings und optional White Label unter deiner Marke.' },
]

const THEME_OPTIONS = [
  { id: 'light' as ThemeMode, title: 'Hell',      desc: 'Klar, reduziert und hell für tägliche Arbeit.',     preview: 'light' },
  { id: 'read'  as ThemeMode, title: 'Lesemodus', desc: 'Ruhiger, wärmer und angenehm für lange Berichte.', preview: 'read'  },
  { id: 'dark'  as ThemeMode, title: 'Dunkel',    desc: 'Konzentriert, technisch und kontraststark.',       preview: 'dark'  },
]

const WORK_MODES: Array<{ id: WorkMode; title: string; desc: string }> = [
  { id: 'alone',            title: 'Alleine',                       desc: 'Ich organisiere und steuere das Projekt selbst.' },
  { id: 'existing_team',    title: 'Mit bestehendem Entwicklerteam', desc: 'Wir haben bereits Entwickler oder externe Partner.' },
  { id: 'clients_partners', title: 'Mit Kunden oder mehreren Beteiligten', desc: 'Mehrere Personen sollen Fortschritt und Aufgaben verfolgen.' },
  { id: 'festag_support',   title: 'Unterstützung durch Festag',     desc: 'Wir benötigen technische oder operative Unterstützung.' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [stepIdx, setStepIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // state per step
  const [theme, setLocalTheme] = useState<ThemeMode>('read')
  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState('')
  const [project, setProject] = useState('')
  const [workMode, setWorkMode] = useState<WorkMode | null>(null)
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode | null>(null)
  const [invites, setInvites] = useState('')

  useEffect(() => {
    setLocalTheme(getTheme())
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) { router.replace('/login'); return }
      const uid = session.user.id
      setUserId(uid)
      const meta: any = session.user.user_metadata || {}
      if (meta.full_name || meta.name) setFullName(meta.full_name || meta.name)

      // Resume from saved progress: read onboarding_state + existing profile fields
      const [{ data: state }, { data: profile }, { data: brief }, { data: ws }] = await Promise.all([
        supabase.from('onboarding_state').select('current_step,completed_at').eq('user_id', uid).maybeSingle(),
        supabase.from('profiles').select('full_name,position,work_mode,theme_pref').eq('id', uid).maybeSingle(),
        supabase.from('onboarding_briefs').select('description').eq('user_id', uid).maybeSingle(),
        supabase.from('workspaces').select('id,mode,metadata').eq('primary_owner_id', uid).eq('is_personal', true).maybeSingle(),
      ])
      if (cancelled) return

      if (state?.completed_at) { router.replace('/dashboard'); return }

      // Pre-fill what's already saved
      if (profile?.full_name && !fullName) setFullName(profile.full_name)
      if (profile?.position) setPosition(profile.position)
      if (profile?.work_mode) setWorkMode(profile.work_mode as WorkMode)
      if (brief?.description) setProject(brief.description)
      if (profile?.theme_pref === 'light' || profile?.theme_pref === 'read' || profile?.theme_pref === 'dark') {
        setLocalTheme(profile.theme_pref as ThemeMode)
      }
      // Hydrate workspace mode if the user already passed the question.
      // The mode step persists current_step='design' the moment the user
      // confirms, so anything past that means we trust the stored mode.
      const wsMode = (ws as any)?.mode as WorkspaceMode | undefined
      if (wsMode && state?.current_step && state.current_step !== 'mode') {
        setWorkspaceMode(wsMode)
      }

      // Jump to saved step
      const stepMap: Record<string, number> = { mode:0, design:1, profile:2, project:3, team:4, invite:5 }
      const idx = state?.current_step ? stepMap[state.current_step] : 0
      if (typeof idx === 'number' && idx > 0 && idx < ALL_STEPS.length) setStepIdx(idx)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase])

  // dynamic step list: skip 'invite' when working alone
  const steps: StepId[] = workMode === 'alone'
    ? ALL_STEPS.filter(s => s !== 'invite')
    : ALL_STEPS
  const current = steps[stepIdx]

  function chooseTheme(mode: ThemeMode) {
    setLocalTheme(mode); setTheme(mode)
  }

  function go(delta: number) {
    if (animating) return
    setError('')
    setAnimating(true)
    setTimeout(() => {
      setStepIdx(i => Math.max(0, Math.min(steps.length - 1, i + delta)))
      setAnimating(false)
    }, 180)
  }

  async function persistStep(step: StepId) {
    if (!userId) return
    if (step === 'mode') {
      if (!workspaceMode) return
      await supabase
        .from('workspaces')
        .update({ mode: workspaceMode })
        .eq('primary_owner_id', userId)
        .eq('is_personal', true)
      await supabase.from('onboarding_state').upsert({
        user_id: userId, current_step: 'design', updated_at: new Date().toISOString(),
      })
    } else if (step === 'design') {
      await supabase.from('profiles').update({ theme_pref: theme }).eq('id', userId)
      await supabase.from('onboarding_state').upsert({
        user_id: userId, current_step: 'profile', design_done: true, updated_at: new Date().toISOString(),
      })
    } else if (step === 'profile') {
      await supabase.from('profiles').update({
        full_name: fullName.trim() || null,
        position: position.trim() || null,
      }).eq('id', userId)
      await supabase.from('onboarding_state').upsert({
        user_id: userId, current_step: 'project', profile_done: true, updated_at: new Date().toISOString(),
      })
    } else if (step === 'project') {
      if (project.trim()) {
        await supabase.from('onboarding_briefs').upsert({
          user_id: userId, description: project.trim(), updated_at: new Date().toISOString(),
        })
      }
      await supabase.from('onboarding_state').upsert({
        user_id: userId, current_step: 'team', updated_at: new Date().toISOString(),
      })
    } else if (step === 'team') {
      await supabase.from('profiles').update({ work_mode: workMode }).eq('id', userId)
      await supabase.from('onboarding_state').upsert({
        user_id: userId, current_step: workMode === 'alone' ? 'done' : 'invite', updated_at: new Date().toISOString(),
      })
    } else if (step === 'invite') {
      const emails = invites.split(/[,;\s\n]+/).map(s => s.trim()).filter(s => /\S+@\S+\.\S+/.test(s))
      if (emails.length) {
        await supabase.from('onboarding_invites').insert(
          emails.map(email => ({ user_id: userId, email }))
        )
      }
    }
  }

  async function next() {
    if (current === 'mode' && !workspaceMode) { setError('Bitte wähle, wie du Festag nutzen möchtest.'); return }
    if (current === 'team' && !workMode) { setError('Bitte wähle eine Option.'); return }
    setError('')
    setSubmitting(true)
    try {
      await persistStep(current)
      if (stepIdx < steps.length - 1) {
        go(+1)
      } else {
        // Done
        await supabase.from('onboarding_state').upsert({
          user_id: userId,
          current_step: 'done',
          profile_done: true,
          workspace_done: true,
          design_done: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        // Plant the first Tagro-Memory entries so the bot is never empty
        // on first use. Fire-and-forget; failures must not block redirect.
        try {
          fetch('/api/onboarding/seed-memory', { method: 'POST', credentials: 'include' })
        } catch {}
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          rememberFestagAccount({
            userId: session.user.id,
            email: session.user.email ?? null,
            method: session.user.app_metadata?.provider === 'google' ? 'google' : 'email',
            onboardingCompleted: true,
          })
        }
        setDone(true)
        setTimeout(() => router.replace('/dashboard'), 900)
      }
    } catch (e: any) {
      setError(e?.message || 'Speichern fehlgeschlagen.')
    } finally {
      setSubmitting(false)
    }
  }

  function skip() {
    if (current === 'mode')   return // workspace mode is the architectural choice
    if (current === 'design') return // can't skip the theme
    next()
  }

  const themeAttr = theme === 'read' ? 'read' : theme === 'dark' ? 'dark' : 'light'

  if (done) return <FestagLoader fullscreen label="Festag wird vorbereitet…" />

  return (
    <main className="onb-root" data-theme={themeAttr}>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .onb-root {
          min-height:100dvh; width:100%;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          font-weight:500; letter-spacing:0.01em;
          -webkit-font-smoothing:antialiased; text-rendering:geometricPrecision;
          padding:32px;
          display:flex; align-items:center; justify-content:center;
          transition: background .3s, color .3s;
        }
        .onb-root[data-theme="light"] { background:#EFEFEC; color:#0A0B0A; }
        .onb-root[data-theme="read"]  { background:#E6DFCE; color:#1C1914; }
        .onb-root[data-theme="dark"]  { background:#0F141B; color:#E8E8E5; }

        .onb-shell {
          width:100%; max-width:1080px; min-height:640px;
          display:grid; grid-template-columns:1fr 1fr;
          border-radius:24px; overflow:hidden;
          position:relative;
          transition: background .3s, box-shadow .3s;
        }
        .onb-root[data-theme="light"] .onb-shell { background:#FAFAF9; box-shadow:0 28px 72px -20px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.04); }
        .onb-root[data-theme="read"]  .onb-shell { background:#F7F4EC; box-shadow:0 28px 72px -20px rgba(38,33,24,0.12), 0 1px 2px rgba(38,33,24,0.04); }
        .onb-root[data-theme="dark"]  .onb-shell { background:#141820; box-shadow:0 28px 72px -20px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.3); }

        /* Subtle vertical rule between the two halves (decorative) */
        .onb-shell::after {
          content:''; position:absolute; left:50%; top:14%; bottom:14%; width:1px;
          background:currentColor; opacity:0.06; pointer-events:none;
        }

        .onb-side {
          padding:80px 56px 56px;
          display:flex; flex-direction:column;
          min-height:560px;
        }
        .onb-logo {
          font-family:'Qurova DEMO', serif;
          font-size:24px; font-weight:500; letter-spacing:-.3px;
          margin-bottom:auto;
        }

        .onb-content {
          transition: opacity .18s ease, transform .18s ease;
        }
        .onb-content.animating { opacity:0; transform:translateY(6px); }

        .onb-title {
          font-size:24px; font-weight:500; letter-spacing:-0.01em;
          margin-bottom:4px;
        }
        .onb-lede {
          font-size:13px; font-weight:500; letter-spacing:0.01em;
          opacity:.55; margin-bottom:36px; line-height:1.5;
        }

        .onb-label {
          display:block; font-size:11px; font-weight:500;
          letter-spacing:0.06em; opacity:.55;
          margin:0 0 8px 2px;
        }

        /* INPUTS — minimal 1px border, no fill */
        .onb-row { display:flex; gap:10px; align-items:center; margin-bottom:18px; }
        .onb-avatar {
          width:42px; height:42px; border-radius:12px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          border:1px solid;
          opacity:.7;
          transition:opacity .15s;
        }
        .onb-root[data-theme="light"] .onb-avatar { border-color:rgba(10,11,10,0.12); color:rgba(10,11,10,0.5); }
        .onb-root[data-theme="read"]  .onb-avatar { border-color:rgba(28,25,20,0.16); color:rgba(28,25,20,0.5); }
        .onb-root[data-theme="dark"]  .onb-avatar { border-color:rgba(255,255,255,0.08); color:rgba(255,255,255,0.4); }

        .onb-input, .onb-textarea {
          width:100%; font-family:inherit; font-size:14px; font-weight:500; letter-spacing:0.01em;
          padding:11px 14px; border-radius:10px;
          background:transparent; outline:none; color:inherit;
          border:1px solid;
          transition: border-color .15s, box-shadow .15s;
        }
        .onb-textarea { padding:14px; min-height:104px; resize:vertical; font-size:13.5px; line-height:1.5; }
        .onb-root[data-theme="light"] .onb-input,
        .onb-root[data-theme="light"] .onb-textarea { border-color:rgba(10,11,10,0.12); }
        .onb-root[data-theme="read"]  .onb-input,
        .onb-root[data-theme="read"]  .onb-textarea { border-color:rgba(28,25,20,0.16); }
        .onb-root[data-theme="dark"]  .onb-input,
        .onb-root[data-theme="dark"]  .onb-textarea { border-color:rgba(255,255,255,0.08); }
        .onb-input::placeholder, .onb-textarea::placeholder { opacity:.4; }
        .onb-input:focus, .onb-textarea:focus { border-color:currentColor; }

        /* TEAM ROWS — single-select toggle */
        .onb-team-list { display:flex; flex-direction:column; }
        .onb-team-row {
          display:flex; align-items:center; gap:16px;
          padding:14px 0;
          border-bottom:1px solid;
          cursor:pointer;
        }
        .onb-team-row:last-child { border-bottom:0; }
        .onb-root[data-theme="light"] .onb-team-row { border-color:rgba(10,11,10,0.06); }
        .onb-root[data-theme="read"]  .onb-team-row { border-color:rgba(28,25,20,0.08); }
        .onb-root[data-theme="dark"]  .onb-team-row { border-color:rgba(255,255,255,0.05); }
        .onb-team-text { flex:1; }
        .onb-team-title { font-size:14px; font-weight:500; letter-spacing:0; margin-bottom:2px; }
        .onb-team-desc  { font-size:12px; font-weight:500; letter-spacing:0.01em; opacity:.55; line-height:1.45; }

        /* iOS-style toggle (single-select behaviour) */
        .onb-toggle {
          width:34px; height:20px; border-radius:999px;
          border:1px solid;
          position:relative; flex-shrink:0;
          transition: background .15s, border-color .15s;
        }
        .onb-toggle::after {
          content:''; position:absolute; left:2px; top:50%;
          width:14px; height:14px; border-radius:999px;
          background:currentColor;
          transform: translateY(-50%);
          transition: left .2s cubic-bezier(0.4,0,0.2,1), background .15s, opacity .15s;
          opacity:.5;
        }
        .onb-root[data-theme="light"] .onb-toggle { border-color:rgba(10,11,10,0.14); }
        .onb-root[data-theme="read"]  .onb-toggle { border-color:rgba(28,25,20,0.18); }
        .onb-root[data-theme="dark"]  .onb-toggle { border-color:rgba(255,255,255,0.14); }
        .onb-toggle.on::after { left:16px; opacity:1; }
        .onb-root[data-theme="light"] .onb-toggle.on { background:#5B647D; border-color:#5B647D; }
        .onb-root[data-theme="light"] .onb-toggle.on::after { background:#FFFFFF; }
        .onb-root[data-theme="read"]  .onb-toggle.on { background:#1C1914; border-color:#1C1914; }
        .onb-root[data-theme="read"]  .onb-toggle.on::after { background:#F7F4EC; }
        .onb-root[data-theme="dark"]  .onb-toggle.on { background:#5B647D; border-color:#5B647D; }
        .onb-root[data-theme="dark"]  .onb-toggle.on::after { background:#FFFFFF; }

        /* THEME CARDS */
        .onb-cards { display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; }
        .onb-card {
          background:transparent; border:1.5px solid transparent; border-radius:14px;
          padding:14px; cursor:pointer; text-align:left;
          font-family:inherit; color:inherit;
          transition: border-color .15s, transform .2s;
        }
        .onb-root[data-theme="light"] .onb-card { border-color:rgba(10,11,10,0.06); }
        .onb-root[data-theme="read"]  .onb-card { border-color:rgba(28,25,20,0.08); }
        .onb-root[data-theme="dark"]  .onb-card { border-color:rgba(255,255,255,0.06); }
        .onb-card:hover:not(.selected) { transform:translateY(-2px); }
        .onb-card.selected { border-color:currentColor; border-width:2px; padding:13px; }
        .onb-card-preview {
          width:100%; aspect-ratio:1.7/1; border-radius:8px;
          display:flex; flex-direction:column; justify-content:center;
          padding:14px; gap:5px; margin-bottom:12px;
        }
        .onb-card-bar { height:5px; border-radius:3px; }
        .onb-card-bar.long  { width:74%; }
        .onb-card-bar.mid   { width:54%; }
        .onb-card-bar.short { width:36%; }
        .preview-light  { background:#FFFFFF; }
        .preview-light  .onb-card-bar.long { background:#1C1914; }
        .preview-light  .onb-card-bar.mid  { background:rgba(28,25,20,0.18); }
        .preview-light  .onb-card-bar.short{ background:rgba(28,25,20,0.10); }
        .preview-read   { background:#EFE7D2; }
        .preview-read   .onb-card-bar.long { background:#6F6248; }
        .preview-read   .onb-card-bar.mid  { background:rgba(111,98,72,0.4); }
        .preview-read   .onb-card-bar.short{ background:rgba(111,98,72,0.22); }
        .preview-dark   { background:#0F141B; }
        .preview-dark   .onb-card-bar.long { background:#5B647D; }
        .preview-dark   .onb-card-bar.mid  { background:rgba(152,162,179,0.20); }
        .preview-dark   .onb-card-bar.short{ background:rgba(152,162,179,0.10); }
        .onb-card-title { font-size:14px; font-weight:500; letter-spacing:0; margin-bottom:4px; }
        .onb-card-desc  { font-size:12px; line-height:1.5; font-weight:500; letter-spacing:0.01em; opacity:.55; }

        /* FOOTER row: Überspringen + Weiter */
        .onb-actions { display:flex; align-items:center; gap:24px; margin-top:30px; }
        .onb-error { font-size:12px; color:#d53939; margin-right:auto; }
        .onb-skip {
          font-family:inherit; font-size:13px; font-weight:500; letter-spacing:0.01em;
          background:transparent; border:none; cursor:pointer; color:inherit;
          opacity:.5; padding:0;
          transition: opacity .15s;
        }
        .onb-skip:hover { opacity:.85; }
        .onb-cta {
          font-family:inherit; font-size:13px; font-weight:500; letter-spacing:0.01em;
          padding:10px 22px; border-radius:999px; border:none; cursor:pointer;
          transition: opacity .15s, transform .25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .onb-cta:active:not(:disabled) { transform:scale(0.97); transition: transform 0.08s ease; }
        .onb-cta:disabled { opacity:.5; cursor:not-allowed; }
        .onb-root[data-theme="light"] .onb-cta { background:#5B647D; color:#FFFFFF; }
        .onb-root[data-theme="read"]  .onb-cta { background:#1C1914; color:#F7F4EC; }
        .onb-root[data-theme="dark"]  .onb-cta { background:#5B647D; color:#FFFFFF; }
        .onb-cta:hover:not(:disabled) { opacity:.88; }

        /* PROGRESS DOTS at bottom of shell */
        .onb-progress {
          position:absolute; bottom:36px; left:25%;
          transform:translateX(-50%);
          display:flex; align-items:center; gap:8px;
        }
        .onb-dot {
          width:6px; height:6px; border-radius:999px;
          background:currentColor; opacity:.18;
          transition: width .2s, opacity .2s;
        }
        .onb-dot.active { width:22px; opacity:.7; }
        .onb-dot.done   { opacity:.5; }

        /* DECORATIVE RIGHT PANEL — calm, step-aware preview */
        .onb-decor {
          position:relative;
          padding:56px 48px;
          display:flex; align-items:center; justify-content:center;
        }
        .onb-preview {
          width:100%; max-width:340px;
          transition: opacity .22s ease, transform .22s ease;
        }
        .onb-preview.animating { opacity:0; transform:translateY(8px); }

        /* MODE step — stacked portal cards */
        .ob-mode-stack { position:relative; display:flex; flex-direction:column; gap:14px; align-items:stretch; }
        .ob-mode-card {
          display:flex; align-items:center; gap:12px;
          padding:14px 16px; border-radius:14px;
          border:1px solid;
          transition: transform .35s cubic-bezier(.16,1,.3,1), border-color .2s, background .2s, opacity .2s;
          opacity:.55;
        }
        .onb-root[data-theme="light"] .ob-mode-card { border-color:rgba(10,11,10,0.08); background:#FFFFFF; }
        .onb-root[data-theme="read"]  .ob-mode-card { border-color:rgba(28,25,20,0.10); background:#FFFDF7; }
        .onb-root[data-theme="dark"]  .ob-mode-card { border-color:rgba(255,255,255,0.07); background:#1A2030; }
        .ob-mode-card.on { opacity:1; }
        .onb-root[data-theme="light"] .ob-mode-card.on { border-color:rgba(91,100,125,0.45); }
        .onb-root[data-theme="read"]  .ob-mode-card.on { border-color:rgba(28,25,20,0.30); }
        .onb-root[data-theme="dark"]  .ob-mode-card.on { border-color:rgba(91,100,125,0.55); }
        .ob-mode-dot {
          width:10px; height:10px; border-radius:50%;
          background:currentColor; opacity:.22; flex-shrink:0;
        }
        .ob-mode-card.on .ob-mode-dot { opacity:.7; }
        .ob-mode-title { margin:0; font-size:13px; font-weight:500; letter-spacing:-.005em; }
        .ob-mode-sub   { margin:1px 0 0; font-size:11.5px; font-weight:500; letter-spacing:.015em; opacity:.55; }

        /* DESIGN step — miniature mock */
        .ob-design-mock {
          width:100%; aspect-ratio:1.45/1;
          border-radius:14px; padding:14px;
          display:grid; grid-template-columns:64px 1fr; gap:12px;
          transition: background .2s;
        }
        .ob-design-mock.preview-light { background:#FAFAF9; box-shadow:0 8px 32px -10px rgba(15,23,42,0.10); }
        .ob-design-mock.preview-read  { background:#F1EDE3; box-shadow:0 8px 32px -10px rgba(38,33,24,0.12); }
        .ob-design-mock.preview-dark  { background:#1A2030; box-shadow:0 8px 32px -10px rgba(0,0,0,0.4); }
        .ob-mock-side { display:flex; flex-direction:column; gap:8px; padding-top:4px; }
        .ob-mock-logo { width:22px; height:22px; border-radius:6px; }
        .ob-mock-nav  { height:6px; border-radius:3px; }
        .ob-mock-nav.short { width:60%; }
        .ob-mock-main { display:flex; flex-direction:column; gap:8px; padding-top:4px; }
        .ob-mock-h    { height:10px; width:50%; border-radius:4px; }
        .ob-mock-row  { display:flex; gap:8px; }
        .ob-mock-card { flex:1; height:36px; border-radius:8px; }
        .ob-mock-bar  { height:6px; border-radius:3px; }
        .ob-mock-bar.long  { width:78%; }
        .ob-mock-bar.mid   { width:54%; }
        .ob-mock-bar.short { width:36%; }
        .preview-light .ob-mock-logo,
        .preview-light .ob-mock-h    { background:#1C1914; }
        .preview-light .ob-mock-nav,
        .preview-light .ob-mock-bar  { background:rgba(28,25,20,0.18); }
        .preview-light .ob-mock-card { background:rgba(28,25,20,0.08); }
        .preview-read  .ob-mock-logo,
        .preview-read  .ob-mock-h    { background:#6F6248; }
        .preview-read  .ob-mock-nav,
        .preview-read  .ob-mock-bar  { background:rgba(111,98,72,0.32); }
        .preview-read  .ob-mock-card { background:rgba(111,98,72,0.12); }
        .preview-dark  .ob-mock-logo,
        .preview-dark  .ob-mock-h    { background:#5B647D; }
        .preview-dark  .ob-mock-nav,
        .preview-dark  .ob-mock-bar  { background:rgba(152,162,179,0.20); }
        .preview-dark  .ob-mock-card { background:rgba(152,162,179,0.10); }

        /* PROFILE step */
        .ob-profile-card {
          padding:28px 22px; border-radius:18px;
          border:1px solid;
          text-align:center;
          display:flex; flex-direction:column; align-items:center; gap:10px;
        }
        .onb-root[data-theme="light"] .ob-profile-card { border-color:rgba(10,11,10,0.08); background:#FFFFFF; }
        .onb-root[data-theme="read"]  .ob-profile-card { border-color:rgba(28,25,20,0.10); background:#FFFDF7; }
        .onb-root[data-theme="dark"]  .ob-profile-card { border-color:rgba(255,255,255,0.07); background:#1A2030; }
        .ob-profile-avatar {
          width:64px; height:64px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          border:1px solid; opacity:.7;
          font-size:18px; font-weight:500; letter-spacing:.01em;
        }
        .onb-root[data-theme="light"] .ob-profile-avatar { border-color:rgba(10,11,10,0.14); color:rgba(10,11,10,0.55); }
        .onb-root[data-theme="read"]  .ob-profile-avatar { border-color:rgba(28,25,20,0.18); color:rgba(28,25,20,0.55); }
        .onb-root[data-theme="dark"]  .ob-profile-avatar { border-color:rgba(255,255,255,0.10); color:rgba(255,255,255,0.55); }
        .ob-profile-name { margin:6px 0 0; font-size:14px; font-weight:500; letter-spacing:-.005em; }
        .ob-profile-pos  { margin:1px 0 4px; font-size:12px; font-weight:500; letter-spacing:.015em; opacity:.55; }
        .ob-profile-chip {
          margin-top:4px; padding:3px 9px; border-radius:999px;
          border:1px solid; font-size:10.5px; font-weight:500;
          letter-spacing:.08em; text-transform:uppercase; opacity:.55;
        }
        .onb-root[data-theme="light"] .ob-profile-chip { border-color:rgba(10,11,10,0.10); }
        .onb-root[data-theme="read"]  .ob-profile-chip { border-color:rgba(28,25,20,0.14); }
        .onb-root[data-theme="dark"]  .ob-profile-chip { border-color:rgba(255,255,255,0.10); }

        /* PROJECT step — Tagro presence card */
        .ob-project-card {
          padding:20px 20px 22px; border-radius:18px;
          border:1px solid;
        }
        .onb-root[data-theme="light"] .ob-project-card { border-color:rgba(10,11,10,0.08); background:#FFFFFF; }
        .onb-root[data-theme="read"]  .ob-project-card { border-color:rgba(28,25,20,0.10); background:#FFFDF7; }
        .onb-root[data-theme="dark"]  .ob-project-card { border-color:rgba(255,255,255,0.07); background:#1A2030; }
        .ob-project-head { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
        .ob-project-kicker {
          margin:0; font-size:10.5px; font-weight:500;
          letter-spacing:.14em; text-transform:uppercase; opacity:.55;
        }
        .ob-project-title { margin:2px 0 0; font-size:13px; font-weight:500; letter-spacing:-.005em; }
        .ob-project-list {
          list-style:none; margin:0; padding:0;
          display:flex; flex-direction:column; gap:8px;
          margin-bottom:14px;
        }
        .ob-project-list li {
          display:flex; align-items:center; gap:9px;
          font-size:12.5px; font-weight:500; letter-spacing:.015em;
          opacity:.65;
        }
        .ob-li-dot {
          width:6px; height:6px; border-radius:50%;
          background:currentColor; opacity:.4;
        }
        .ob-project-foot {
          margin:0; padding-top:10px;
          border-top:1px solid;
          font-size:11.5px; font-weight:500; letter-spacing:.015em;
          opacity:.5; line-height:1.5;
        }
        .onb-root[data-theme="light"] .ob-project-foot { border-color:rgba(10,11,10,0.06); }
        .onb-root[data-theme="read"]  .ob-project-foot { border-color:rgba(28,25,20,0.08); }
        .onb-root[data-theme="dark"]  .ob-project-foot { border-color:rgba(255,255,255,0.05); }

        /* TEAM step — small constellation */
        .ob-team-preview {
          display:flex; flex-direction:column; align-items:center; gap:18px;
        }
        .ob-team-graph {
          position:relative; width:220px; height:220px;
          display:flex; align-items:center; justify-content:center;
        }
        .ob-team-center {
          width:48px; height:48px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:14px; font-weight:500; letter-spacing:.01em;
          border:1px solid;
        }
        .onb-root[data-theme="light"] .ob-team-center { background:#FFFFFF; border-color:rgba(10,11,10,0.12); color:rgba(10,11,10,0.7); }
        .onb-root[data-theme="read"]  .ob-team-center { background:#FFFDF7; border-color:rgba(28,25,20,0.16); color:rgba(28,25,20,0.7); }
        .onb-root[data-theme="dark"]  .ob-team-center { background:#1A2030; border-color:rgba(255,255,255,0.12); color:rgba(255,255,255,0.7); }
        .ob-team-node {
          position:absolute; left:50%; top:50%; margin:-12px;
          width:24px; height:24px; border-radius:50%;
          border:1px solid; opacity:.7;
          animation: obTeamPop .45s cubic-bezier(.16,1,.3,1) both;
        }
        .onb-root[data-theme="light"] .ob-team-node { background:#FFFFFF; border-color:rgba(10,11,10,0.10); }
        .onb-root[data-theme="read"]  .ob-team-node { background:#FFFDF7; border-color:rgba(28,25,20,0.12); }
        .onb-root[data-theme="dark"]  .ob-team-node { background:#1A2030; border-color:rgba(255,255,255,0.08); }
        @keyframes obTeamPop { from { opacity:0; transform:translate(0,0) scale(.4); } to { opacity:.7; } }
        .ob-team-caption {
          margin:0; font-size:12px; font-weight:500; letter-spacing:.015em;
          opacity:.6; text-align:center; max-width:240px; line-height:1.5;
        }

        /* INVITE step */
        .ob-invite-preview {
          padding:20px; border-radius:18px;
          border:1px solid;
        }
        .onb-root[data-theme="light"] .ob-invite-preview { border-color:rgba(10,11,10,0.08); background:#FFFFFF; }
        .onb-root[data-theme="read"]  .ob-invite-preview { border-color:rgba(28,25,20,0.10); background:#FFFDF7; }
        .onb-root[data-theme="dark"]  .ob-invite-preview { border-color:rgba(255,255,255,0.07); background:#1A2030; }
        .ob-invite-kicker {
          margin:0; font-size:10.5px; font-weight:500;
          letter-spacing:.14em; text-transform:uppercase; opacity:.55;
        }
        .ob-invite-count { margin:4px 0 14px; font-size:18px; font-weight:500; letter-spacing:-.005em; }
        .ob-invite-list { display:flex; flex-wrap:wrap; gap:6px; }
        .ob-invite-chip {
          display:inline-flex; align-items:center; height:24px;
          padding:0 10px; border-radius:999px;
          border:1px solid; font-size:11.5px; font-weight:500; letter-spacing:.015em;
        }
        .onb-root[data-theme="light"] .ob-invite-chip { border-color:rgba(10,11,10,0.10); }
        .onb-root[data-theme="read"]  .ob-invite-chip { border-color:rgba(28,25,20,0.14); }
        .onb-root[data-theme="dark"]  .ob-invite-chip { border-color:rgba(255,255,255,0.10); }
        .ob-invite-empty {
          font-size:12px; opacity:.4; font-weight:500; letter-spacing:.015em;
        }

        @media (max-width: 880px) {
          .onb-shell { grid-template-columns:1fr; min-height:0; }
          .onb-shell::after { display:none; }
          .onb-decor { display:none; }
          .onb-side { padding:48px 28px 80px; }
          .onb-progress { left:50%; bottom:28px; }
        }
      `}</style>

      <section className="onb-shell" aria-label="Festag Onboarding">
        <aside className="onb-side">
          <div className="onb-logo">festag</div>

          <div className={`onb-content${animating ? ' animating' : ''}`}>
            {current === 'mode' && (
              <>
                <h1 className="onb-title">Wie möchtest du Festag nutzen?</h1>
                <p className="onb-lede">Du kannst später jederzeit weitere Workspaces anlegen oder Erweiterungen aktivieren.</p>

                <div className="onb-team-list" role="radiogroup" aria-label="Workspace-Modus">
                  {WORKSPACE_MODES.map(m => (
                    <div
                      key={m.id}
                      role="radio"
                      aria-checked={workspaceMode === m.id}
                      tabIndex={0}
                      className="onb-team-row"
                      onClick={() => setWorkspaceMode(m.id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setWorkspaceMode(m.id) }}}
                    >
                      <div className="onb-team-text">
                        <div className="onb-team-title">{m.title}</div>
                        <div className="onb-team-desc">{m.desc}</div>
                      </div>
                      <div className={`onb-toggle${workspaceMode === m.id ? ' on' : ''}`} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {current === 'design' && (
              <>
                <h1 className="onb-title">Wähle dein System-Design</h1>
                <p className="onb-lede">
                  Du kannst das später jederzeit in den Einstellungen ändern.
                </p>
                <div className="onb-cards" role="radiogroup" aria-label="Design">
                  {THEME_OPTIONS.map(o => (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={theme === o.id}
                      className={`onb-card${theme === o.id ? ' selected' : ''}`}
                      onClick={() => chooseTheme(o.id)}
                    >
                      <div className={`onb-card-preview preview-${o.preview}`}>
                        <div className="onb-card-bar long" />
                        <div className="onb-card-bar mid" />
                        <div className="onb-card-bar short" />
                      </div>
                      <div className="onb-card-title">{o.title}</div>
                      <div className="onb-card-desc">{o.desc}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {current === 'profile' && (
              <>
                <h1 className="onb-title">Lass uns anfangen</h1>
                <p className="onb-lede">und dein Profil aufsetzen.</p>

                <label className="onb-label">Bild &amp; Name</label>
                <div className="onb-row">
                  <div className="onb-avatar" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M4 20a8 8 0 1 1 16 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <input
                    className="onb-input"
                    type="text"
                    placeholder="Vollständiger Name…"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>

                <label className="onb-label">Position</label>
                <input
                  className="onb-input"
                  type="text"
                  placeholder="z. B. Startupgründer"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                />
              </>
            )}

            {current === 'project' && (
              <>
                <h1 className="onb-title">Woran arbeitest du gerade?</h1>
                <p className="onb-lede">Tagro organisiert die nächsten Schritte.</p>

                <label className="onb-label">Projekt</label>
                <textarea
                  className="onb-textarea"
                  placeholder="z. B. Software zur Buchung unsere Hotelzimmer, internes Tool für Kundenverwaltung, mobile App für unser Startup…"
                  value={project}
                  onChange={e => setProject(e.target.value)}
                />
              </>
            )}

            {current === 'team' && (
              <>
                <h1 className="onb-title">Managed im Team oder alleine?</h1>
                <p className="onb-lede">Lade Co-founder, Mitarbeiter oder Externe mit Teams.</p>

                <div className="onb-team-list" role="radiogroup" aria-label="Team-Modus">
                  {WORK_MODES.map(m => (
                    <div
                      key={m.id}
                      role="radio"
                      aria-checked={workMode === m.id}
                      tabIndex={0}
                      className="onb-team-row"
                      onClick={() => setWorkMode(m.id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setWorkMode(m.id) }}}
                    >
                      <div className="onb-team-text">
                        <div className="onb-team-title">{m.title}</div>
                        <div className="onb-team-desc">{m.desc}</div>
                      </div>
                      <div className={`onb-toggle${workMode === m.id ? ' on' : ''}`} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {current === 'invite' && (
              <>
                <h1 className="onb-title">Lade Mitglieder ein</h1>
                <p className="onb-lede">
                  Lade Mitgründer, Entwickler oder Kunden — <strong style={{ fontWeight: 500, opacity: 1 }}>jetzt oder später</strong> jederzeit ein.
                </p>

                <label className="onb-label">Einladung</label>
                <textarea
                  className="onb-textarea"
                  placeholder="cofounder@firma.de, dev@agentur.de"
                  value={invites}
                  onChange={e => setInvites(e.target.value)}
                />
              </>
            )}

            <div className="onb-actions">
              {error && <span className="onb-error">{error}</span>}
              {!error && <span style={{ marginRight: 'auto' }} />}
              {current !== 'design' && (
                <button type="button" className="onb-skip" onClick={skip} disabled={submitting}>
                  Überspringen
                </button>
              )}
              <button type="button" className="onb-cta" onClick={next} disabled={submitting}>
                {submitting ? 'Speichere…' : stepIdx === steps.length - 1 ? 'Fertig' : 'Weiter'}
              </button>
            </div>
          </div>

          <div className="onb-progress" aria-label={`Schritt ${stepIdx + 1} von ${steps.length}`}>
            {steps.map((s, i) => (
              <span
                key={s}
                className={`onb-dot${i === stepIdx ? ' active' : i < stepIdx ? ' done' : ''}`}
              />
            ))}
          </div>
        </aside>

        <aside className="onb-decor" aria-hidden="true">
          <div className={`onb-preview${animating ? ' animating' : ''}`}>
            {current === 'mode' && (
              <div className="ob-mode-stack">
                {WORKSPACE_MODES.map((m, i) => (
                  <div
                    key={m.id}
                    className={`ob-mode-card${workspaceMode === m.id ? ' on' : ''}`}
                    style={{ transform: `translateY(${i * 14}px) rotate(${(i - 1) * 1.4}deg)`, zIndex: workspaceMode === m.id ? 3 : 3 - i }}
                  >
                    <span className="ob-mode-dot" />
                    <div>
                      <p className="ob-mode-title">{m.id === 'delivery' ? 'Client' : m.id === 'team' ? 'Team' : 'Agentur'}</p>
                      <p className="ob-mode-sub">{m.id === 'delivery' ? 'Festag setzt um' : m.id === 'team' ? 'Eigene Devs steuern' : 'Kunden + White Label'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {current === 'design' && (
              <div className={`ob-design-mock preview-${theme}`} aria-hidden="true">
                <div className="ob-mock-side">
                  <span className="ob-mock-logo" />
                  <span className="ob-mock-nav" />
                  <span className="ob-mock-nav short" />
                  <span className="ob-mock-nav" />
                </div>
                <div className="ob-mock-main">
                  <span className="ob-mock-h" />
                  <div className="ob-mock-row">
                    <span className="ob-mock-card" />
                    <span className="ob-mock-card" />
                  </div>
                  <span className="ob-mock-bar long" />
                  <span className="ob-mock-bar mid" />
                  <span className="ob-mock-bar short" />
                </div>
              </div>
            )}

            {current === 'profile' && (
              <div className="ob-profile-card">
                <div className="ob-profile-avatar">
                  <span>
                    {(fullName.trim() || ' ')
                      .split(/\s+/).filter(Boolean).slice(0, 2)
                      .map(s => s[0]?.toUpperCase()).join('') || '·'}
                  </span>
                </div>
                <p className="ob-profile-name">{fullName.trim() || 'Dein Name'}</p>
                <p className="ob-profile-pos">{position.trim() || 'Deine Rolle'}</p>
                <span className="ob-profile-chip">Profil-Vorschau</span>
              </div>
            )}

            {current === 'project' && (
              <div className="ob-project-card">
                <div className="ob-project-head">
                  <TagroLogo size={26} thinking={project.trim().length > 12} />
                  <div>
                    <p className="ob-project-kicker">Tagro</p>
                    <p className="ob-project-title">
                      {project.trim().length > 12
                        ? 'Struktur wird beim Start abgeleitet…'
                        : 'Wartet auf deine Beschreibung.'}
                    </p>
                  </div>
                </div>
                <ul className="ob-project-list">
                  <li><span className="ob-li-dot" /> Scope & Ziele</li>
                  <li><span className="ob-li-dot" /> Erste prüfbare Aufgaben</li>
                  <li><span className="ob-li-dot" /> Offene Fragen & Risiken</li>
                  <li><span className="ob-li-dot" /> Vorgeschlagene Milestones</li>
                </ul>
                <p className="ob-project-foot">
                  Du kannst alles später anpassen — Tagro übergibt strukturiert, nicht starr.
                </p>
              </div>
            )}

            {current === 'team' && (
              <div className="ob-team-preview">
                <div className="ob-team-graph">
                  <span className="ob-team-center">
                    {(fullName.trim() || ' ')
                      .split(/\s+/).filter(Boolean).slice(0, 2)
                      .map(s => s[0]?.toUpperCase()).join('') || '·'}
                  </span>
                  {(workMode === 'alone' ? [] :
                    workMode === 'existing_team' ? [0, 1, 2] :
                    workMode === 'clients_partners' ? [0, 1, 2, 3] :
                    workMode === 'festag_support' ? [0, 1] :
                    []
                  ).map((_, i, arr) => {
                    const angle = (360 / arr.length) * i - 90
                    const x = Math.cos(angle * Math.PI / 180) * 86
                    const y = Math.sin(angle * Math.PI / 180) * 86
                    return (
                      <span
                        key={i}
                        className="ob-team-node"
                        style={{ transform: `translate(${x}px, ${y}px)` }}
                      />
                    )
                  })}
                </div>
                <p className="ob-team-caption">
                  {workMode === 'alone' ? 'Du alleine — Tagro übernimmt die Struktur.'
                    : workMode === 'existing_team' ? 'Du + dein Entwicklerteam.'
                    : workMode === 'clients_partners' ? 'Du, Kunden und Beteiligte.'
                    : workMode === 'festag_support' ? 'Du + Festag-Support.'
                    : 'Wähle, wer mit dir arbeitet.'}
                </p>
              </div>
            )}

            {current === 'invite' && (() => {
              const emails = invites.split(/[,;\s\n]+/).map(s => s.trim()).filter(s => /\S+@\S+\.\S+/.test(s)).slice(0, 6)
              return (
                <div className="ob-invite-preview">
                  <p className="ob-invite-kicker">Einladungen</p>
                  <p className="ob-invite-count">
                    {emails.length === 0 ? 'Noch niemand' : `${emails.length} ${emails.length === 1 ? 'Einladung' : 'Einladungen'}`}
                  </p>
                  <div className="ob-invite-list">
                    {emails.length === 0 ? (
                      <span className="ob-invite-empty">cofounder@firma.de</span>
                    ) : emails.map(e => (
                      <span key={e} className="ob-invite-chip">{e}</span>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        </aside>
      </section>
    </main>
  )
}
