'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Guten Haffee.'
  if (h >= 12 && h < 14) return 'Guten Hunger.'
  if (h >= 14 && h < 18) return 'Auf ein Feierabend Bier.'
  return 'Guten Abend.'
}

function getGreetingSub() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Lass uns heute etwas bauen.'
  if (h >= 12 && h < 14) return 'Zeit, Fortschritt zu machen.'
  if (h >= 14 && h < 18) return 'Dein Projekt wartet auf dich.'
  return 'Starte oder melde dich an.'
}

type View = 'home'|'login'|'register'|'dev'
const BLOCKS: Record<View,{w:number,h:number}[]> = {
  home:    [{w:76,h:5},{w:112,h:8},{w:68,h:6},{w:98,h:11},{w:120,h:7},{w:80,h:9},{w:104,h:10},{w:88,h:8},{w:116,h:9},{w:72,h:7},{w:96,h:13},{w:84,h:7}],
  login:   [{w:82,h:6},{w:110,h:9},{w:70,h:7},{w:100,h:11},{w:118,h:8},{w:76,h:10},{w:106,h:6},{w:84,h:9},{w:114,h:7},{w:74,h:11},{w:94,h:8},{w:88,h:8}],
  register:[{w:94,h:7},{w:72,h:8},{w:116,h:10},{w:80,h:9},{w:68,h:7},{w:102,h:11},{w:86,h:9},{w:112,h:8},{w:76,h:12},{w:98,h:7},{w:88,h:6},{w:104,h:6}],
  dev:     [{w:108,h:8},{w:78,h:10},{w:114,h:7},{w:86,h:9},{w:66,h:8},{w:100,h:11},{w:82,h:9},{w:96,h:10},{w:120,h:6},{w:74,h:8},{w:92,h:7},{w:88,h:7}],
}


function PixelBlocksMobile() {
  const rows = [
    { bottom: 0,   h: 20,  w: '100%' },
    { bottom: 20,  h: 13,  w: '84%'  },
    { bottom: 33,  h: 10,  w: '94%'  },
    { bottom: 43,  h: 8,   w: '68%'  },
    { bottom: 51,  h: 6,   w: '88%'  },
    { bottom: 57,  h: 5,   w: '56%'  },
    { bottom: 62,  h: 4,   w: '74%'  },
    { bottom: 66,  h: 3,   w: '42%'  },
    { bottom: 69,  h: 2,   w: '28%'  },
  ]
  return (
    <>
      {rows.map((b, i) => (
        <div key={i} className="px-mob" style={{
          position: 'absolute',
          left: 0, bottom: `${b.bottom}px`,
          width: b.w, height: `${b.h}px`,
          background: 'var(--bg)',
          animationDelay: `${i * 0.06}s`,
          zIndex: 3,
        }}/>
      ))}
    </>
  )
}

function PixelBlocks({ view }: { view: View }) {
  let top = 0
  const positioned = BLOCKS[view].map(b => { const t = top; top += b.h; return { ...b, top: t } })
  return (
    <>
      <style>{`@keyframes blkIn{from{opacity:0;transform:translateX(56px);}to{opacity:1;transform:translateX(0);}} .px-blk{position:absolute;right:-1px;pointer-events:none;animation:blkIn .48s cubic-bezier(.16,1,.3,1) both;}`}</style>
      {positioned.map((b, i) => (
        <div key={i} className="px-blk" style={{ top: `calc(${b.top}% - 1px)`, height: `calc(${b.h}% + 2px)`, width: b.w + 1, background: 'var(--bg)', animationDelay: `${i * 0.022}s` }}/>
      ))}
    </>
  )
}

function ImagePanel({ view }: { view: View }) {
  // Hero-Image: bevorzugt /brand/hero-team.jpg (kuratiertes Expertenteam-Visual).
  // Fallback auf /bg-office.jpg, falls die Datei noch nicht eingespielt ist.
  // Kein Stockfoto-Look — Erzählung: koordiniertes Expertenteam.
  return (
    <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
      <img
        src="/brand/hero-team.jpg"
        alt=""
        onError={e => { (e.currentTarget as HTMLImageElement).src = '/bg-office.jpg' }}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center 35%',
          display: 'block',
          filter: 'saturate(1.05) contrast(1.02)',
        }}
      />
      {/* Seriöser, ruhiger Verlauf — weniger "Kino", mehr Premium */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(8,12,14,0.78) 0%, rgba(8,12,14,0.42) 55%, rgba(8,12,14,0.08) 100%), linear-gradient(to top, rgba(8,12,14,0.82) 0%, transparent 50%)',
        pointerEvents: 'none',
      }}/>
      <PixelBlocks view={view}/>
      <div style={{ position: 'absolute', top: 30, left: 36, zIndex: 2 }}>
        <img src="/brand/logo.svg" alt="festag" style={{ height: 21, filter: 'brightness(0) invert(1)', opacity: .92 }}/>
      </div>
      <div style={{ position: 'absolute', bottom: 56, left: 48, right: '16%', zIndex: 2 }}>
        <h2 style={{ fontSize: 46, fontWeight: 700, color: '#fff', lineHeight: 1.08, letterSpacing: '-.8px', marginBottom: 16, textShadow: '0 2px 30px rgba(0,0,0,.6)' }}>
          {view==='home' ? <>Software&shy;produktion ohne Chaos.</> :
           view==='login' ? <>Schön,<br/>dass du wieder da bist.</> :
           view==='register' ? <>Willkommen<br/>bei Festag.</> :
           <>Empfange Tasks.<br/>Liefere kontrolliert.</>}
        </h2>
        <p style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,.66)', lineHeight: 1.6, maxWidth: 420 }}>
          {view==='dev' ? 'Festag steuert Tasks und Status. Du fokussierst dich auf den Code.' :
           view==='home' ? 'Ein kuratiertes Expertenteam plus AI-orchestrierte Struktur. Klar, kontrolliert, geliefert.' :
           'Von der Idee zum fertigen Produkt — strukturiert, transparent, verifiziert.'}
        </p>
      </div>
      <p style={{ position: 'absolute', bottom: 18, left: 48, fontSize: 10, color: 'rgba(255,255,255,.28)', letterSpacing: '.05em', zIndex: 2, lineHeight: 1.5 }}>
        ©2026 Festag · Stefan Dirnberger
      </p>
    </div>
  )
}

function FInput({ label, value, onChange, type='text', placeholder='', autoFocus=false, onSubmit }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; autoFocus?: boolean; onSubmit?: () => void
}) {
  const [f, setF] = useState(false)
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: f ? 'var(--btn-prim)' : 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, transition: 'color .15s' }}>{label}</label>
      <input type={type} value={value} autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        onKeyDown={e => { if (e.key === 'Enter' && onSubmit) { e.preventDefault(); onSubmit() } }}
        placeholder={placeholder}
        style={{ width: '100%', padding: '14px 16px', background: f ? 'var(--inp-focus)' : 'var(--inp)', border: `1.5px solid ${f ? 'var(--inp-focus-border)' : 'var(--inp-border)'}`, borderRadius: 13, fontSize: 16, color: 'var(--text)', outline: 'none', transition: 'all .15s', boxShadow: f ? '0 0 0 3px var(--glow)' : 'none', fontFamily: 'inherit', fontWeight: 500, caretColor: 'var(--btn-prim)' }}/>
    </div>
  )
}

function PrimaryBtn({ label, onClick, loading=false, disabled=false }: { label: string; onClick: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{ width: '100%', padding: '16px 24px', background: disabled ? 'var(--card)' : 'var(--btn-prim)', color: disabled ? 'var(--text-muted)' : 'var(--btn-prim-text)', fontSize: 16, fontWeight: 700, borderRadius: 8, border: 'none', cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit', letterSpacing: '-.1px', transition: 'all .18s', boxShadow: disabled ? 'none' : '0 2px 16px var(--glow)', opacity: disabled ? .5 : 1 }}>
      {loading ? <span style={{ width: 18, height: 18, border: '2.5px solid rgba(128,128,128,.3)', borderTopColor: 'var(--btn-prim-text)', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }}/> : label}
    </button>
  )
}

function SecondaryBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: '100%', padding: '16px 24px', background: h ? 'var(--card)' : 'var(--inp)', color: 'var(--text)', fontSize: 16, fontWeight: 700, borderRadius: 8, border: '1.5px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', letterSpacing: '-.1px', transition: 'all .15s' }}>
      {label}
    </button>
  )
}

function SocialBtn({ label, onClick, icon, black=false }: { label: string; onClick: () => void; icon: React.ReactNode; black?: boolean }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: '100%', padding: '14px 18px', background: black ? (h ? '#222827' : '#181D1C') : (h ? 'var(--card)' : 'var(--inp)'), border: black ? 'none' : `1.5px solid ${h ? 'var(--border-strong)' : 'var(--border)'}`, borderRadius: 13, color: black ? '#fff' : 'var(--text)', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
      {icon}{label}
    </button>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '.08em' }}>ODER</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
    </div>
  )
}

const GOOGLE_ICON = <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
const APPLE_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>

const MOBILE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0;}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
  @keyframes pxRise{from{opacity:0;transform:translateY(100px);}to{opacity:1;transform:translateY(0);}}
  input::placeholder{color:var(--text-muted);opacity:1;}
  body{background:var(--bg)!important;}
  .l-wrap{display:flex;min-height:100dvh;background:var(--bg);}
  .l-left{display:none;}
  .l-right{flex:1;display:flex;flex-direction:column;background:var(--bg);}
  .frm{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both;}
  .px-mob{pointer-events:none;animation:pxRise .9s cubic-bezier(.16,1,.3,1) both;}
  .mob-hero{display:block;position:absolute;top:0;left:0;right:0;height:56dvh;overflow:hidden;z-index:0;}
  .mob-grad{position:absolute;inset:0;pointer-events:none;z-index:1;background:linear-gradient(180deg,transparent 0%,transparent 25%,var(--bg) 100%);}
  .mob-page{position:relative;min-height:100dvh;width:100%;display:flex;flex-direction:column;background:var(--bg);overflow:hidden;}
  .mob-logo{position:absolute;top:calc(env(safe-area-inset-top) + 24px);left:22px;z-index:5;height:20px;opacity:.92;filter:brightness(0) invert(1);}
  [data-theme="light"] .mob-logo{filter:none;opacity:.85;}
  .mob-cta{position:relative;z-index:2;margin-top:auto;padding:0 22px calc(env(safe-area-inset-bottom) + 32px);}
  .form-scroll{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:calc(env(safe-area-inset-top) + 28px) 22px calc(env(safe-area-inset-bottom) + 36px);overflow-y:auto;-webkit-overflow-scrolling:touch;min-height:100dvh;}
  @media(min-width:769px){
    .mob-hero{display:none!important;}
    .mob-page{flex:1;display:flex;flex-direction:column;background:var(--bg);}
    .mob-cta{flex:1;padding:56px;margin-top:0;display:flex;flex-direction:column;justify-content:center;}
    .l-left{display:flex;flex:1.2;min-width:0;}
    .l-right{width:480px;flex:none;background:var(--bg);display:flex;flex-direction:column;}
    .form-scroll{padding:0 56px;justify-content:center;align-items:stretch;min-height:100vh;}
  }
`

export default function LoginPage() {
  const [view, setView] = useState<View>('home')
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('')
  const [devUser, setDevUser] = useState(''); const [devPin, setDevPin] = useState('')
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const [socLoad, setSocLoad] = useState<string|null>(null)
  const sb = createClient()

  function reset() { setError(''); setEmail(''); setPw(''); setPw2('') }
  function go(v: View) { reset(); setView(v); window.scrollTo(0,0) }

  async function doLogin() {
    setError('')
    if (!email || !pw) return setError('Bitte alle Felder ausfüllen.')
    setLoading(true)
    const { error: e } = await sb.auth.signInWithPassword({ email, password: pw })
    setLoading(false)
    if (e) return setError('E-Mail oder Passwort falsch.')
    window.location.href = '/dashboard'
  }

  async function doRegister() {
    setError('')
    if (!email || !pw) return setError('Bitte alle Felder ausfüllen.')
    if (pw !== pw2) return setError('Passwörter stimmen nicht überein.')
    if (pw.length < 8) return setError('Passwort muss mindestens 8 Zeichen haben.')
    setLoading(true)
    const { data, error: e } = await sb.auth.signUp({ email, password: pw })
    if (e) { setError(e.message); setLoading(false); return }
    await sb.auth.signInWithPassword({ email, password: pw })
    setLoading(false)
    window.location.href = '/onboarding'
  }

  async function doSocial(provider: 'google'|'apple') {
    setSocLoad(provider)
    const redirect = view === 'register'
      ? `${window.location.origin}/onboarding`
      : `${window.location.origin}/dashboard`
    const { error: e } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: redirect } })
    if (e) { setError(e.message); setSocLoad(null) }
  }

  async function doDev() {
    setError('')
    if (!devUser || !devPin) return setError('Nutzername und PIN eingeben.')
    setLoading(true)
    const { data, error: e } = await sb.rpc('verify_dev_pin', { username_input: devUser.trim().toLowerCase(), pin_input: devPin.trim() })
    setLoading(false)
    if (e || !data?.length) return setError('Ungültiger Nutzername oder PIN.')
    localStorage.setItem('festag_dev_session', JSON.stringify({ user_id: data[0].user_id, user_email: data[0].user_email, user_role: data[0].user_role, expires: Date.now() + 8*60*60*1000 }))
    window.location.href = '/dev'
  }

  const greeting = getGreeting()

  if (view === 'home') return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', fontFamily: "'Inter',sans-serif", WebkitFontSmoothing: 'antialiased' }}>
      <style>{MOBILE_CSS}</style>
      <ThemeToggle/>
      <div className="l-wrap">
        <div className="l-left"><ImagePanel view="home"/></div>
        <div className="l-right">
          <div className="mob-page">
            <div className="mob-hero">
              <img
                src="/brand/hero-team.jpg"
                alt=""
                onError={e => { (e.currentTarget as HTMLImageElement).src = '/bg-office.jpg' }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%' }}
              />
              <div className="mob-grad"/>
              <PixelBlocksMobile/>
            </div>
            <img src="/brand/logo.svg" alt="festag" className="mob-logo desk-hide"/>
            <style>{`@media(min-width:769px){.desk-hide{display:none!important;}}`}</style>
            <div className="mob-cta">
              <div style={{ display: 'none' }} className="desk-only">
                <style>{`@media(min-width:769px){.desk-only{display:block!important;}}`}</style>
                <img src="/brand/logo.svg" alt="festag" style={{ height: 20, marginBottom: 44, display: 'block', filter: 'var(--logo-filter,none)' }}/>
                <h1 style={{ fontSize: 34, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.7px', lineHeight: 1.15, marginBottom: 10 }}>{greeting}</h1>
                <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 40, lineHeight: 1.6, fontWeight: 500 }}>{getGreetingSub()}</p>
              </div>
              <div className="mob-text" style={{ marginBottom: 28 }}>
                <style>{`@media(min-width:769px){.mob-text{display:none!important;}}`}</style>
                <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1.08, letterSpacing: '-.7px', marginBottom: 12 }}>Kein Informations&shy;verlust.<br/>Mit Festag AI.</h1>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.55 }}>Von der Idee zum fertigen Produkt —<br/>AI steuert, Menschen liefern.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <PrimaryBtn label="Kostenlos starten →" onClick={() => go('register')}/>
                <SecondaryBtn label="Anmelden" onClick={() => go('login')}/>
              </div>
              {/* Einladungspin: dezenter Inline-Link, keine zweite Marketing-Aktion. */}
              <p style={{ marginTop: 18, marginBottom: 0, textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>
                Einladungspin?{' '}
                <a href="/redeem" style={{ color: 'var(--text-secondary)', fontWeight: 600, textDecoration: 'underline', textDecorationColor: 'var(--border-strong)', textUnderlineOffset: 3 }}>
                  Einlösen
                </a>
              </p>
              <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, opacity: .42, letterSpacing: '.06em', textTransform: 'uppercase' }}>Beta · v0.9</span>
                <span onClick={() => go('dev')} style={{ fontSize: 11.5, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, opacity: .55, WebkitTapHighlightColor: 'transparent' }}>Dev-Zugang</span>
              </div>
              <p style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 18, letterSpacing: '.02em', fontWeight: 500, opacity: .45, lineHeight: 1.6 }}>Datenschutzkonform · Server in Deutschland<br/>Keine Kreditkarte erforderlich</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const isDev = view === 'dev'; const isReg = view === 'register'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', fontFamily: "'Inter',sans-serif", WebkitFontSmoothing: 'antialiased', display: 'flex' }}>
      <style>{MOBILE_CSS}</style>
      <ThemeToggle/>
      <div className="l-left"><ImagePanel view={view}/></div>
      <div className="l-right">
        <div className="form-scroll">
          <div className="frm" style={{ width: '100%', maxWidth: 400 }}>
            <button onClick={() => go('home')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, fontFamily: 'inherit', fontWeight: 600, WebkitTapHighlightColor: 'transparent' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg> Zurück
            </button>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.65px', lineHeight: 1.1, marginBottom: 8 }}>{isDev ? 'Systemzugang.' : isReg ? 'Konto erstellen.' : greeting}</h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 26, lineHeight: 1.55, fontWeight: 500 }}>{isDev ? 'Nur für verifizierte Festag Developer.' : isReg ? 'Starte ohne Informationsverlust.' : 'Melde dich an, um fortzufahren.'}</p>
            {error && <div style={{ padding: '12px 16px', background: 'var(--red-bg)', border: '1px solid rgba(220,70,70,.2)', borderRadius: 12, fontSize: 14, color: 'var(--red)', marginBottom: 18, lineHeight: 1.5 }}>{error}</div>}
            
            {view === 'login' && (<>
              <FInput label="E-Mail" value={email} onChange={setEmail} type="email" placeholder="deine@email.com" autoFocus onSubmit={doLogin}/>
              <FInput label="Passwort" value={pw} onChange={setPw} type="password" placeholder="Dein Passwort" onSubmit={doLogin}/>
              <div style={{ marginTop: 8, marginBottom: 18 }}><PrimaryBtn label="Anmelden →" onClick={doLogin} loading={loading}/></div>
              <Divider/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SocialBtn label="Mit Google anmelden" onClick={() => doSocial('google')} icon={GOOGLE_ICON}/>
                <SocialBtn label="Mit Apple anmelden" onClick={() => doSocial('apple')} icon={APPLE_ICON} black/>
              </div>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 28 }}>Noch kein Konto? <span onClick={() => go('register')} style={{ color: 'var(--btn-prim)', fontWeight: 700, cursor: 'pointer' }}>Registrieren</span></p>
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)', marginTop: 10 }}>Sie haben einen Einladungspin erhalten? <a href="/redeem" style={{ color: 'var(--btn-prim)', fontWeight: 700, textDecoration: 'none' }}>PIN einlösen</a></p>
            </>)}

            {view === 'register' && (<>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
                <SocialBtn label="Mit Google registrieren" onClick={() => doSocial('google')} icon={GOOGLE_ICON}/>
                <SocialBtn label="Mit Apple ID registrieren" onClick={() => doSocial('apple')} icon={APPLE_ICON} black/>
              </div>
              <Divider/>
              <FInput label="E-Mail" value={email} onChange={setEmail} type="email" placeholder="deine@email.com" onSubmit={doRegister}/>
              <FInput label="Passwort" value={pw} onChange={setPw} type="password" placeholder="Mindestens 8 Zeichen" onSubmit={doRegister}/>
              <FInput label="Passwort bestätigen" value={pw2} onChange={setPw2} type="password" placeholder="Erneut eingeben" onSubmit={doRegister}/>
              <div style={{ marginTop: 8 }}><PrimaryBtn label="Konto erstellen →" onClick={doRegister} loading={loading}/></div>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 24 }}>Bereits ein Konto? <span onClick={() => go('login')} style={{ color: 'var(--btn-prim)', fontWeight: 700, cursor: 'pointer' }}>Einloggen</span></p>
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)', marginTop: 10 }}>
                <span onClick={() => go('dev')} style={{ color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>Dev-Zugang</span>
              </p>
            </>)}

            {view === 'dev' && (<>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 15px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 24 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite', flexShrink: 0 }}/> <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>Kein öffentlicher Zugang · Zuteilung durch Admin</p></div>
              <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}`}</style>
              <FInput label="Nutzername" value={devUser} onChange={setDevUser} placeholder="dein-username" autoFocus onSubmit={doDev}/>
              <FInput label="PIN" value={devPin} onChange={v => setDevPin(v.replace(/\D/g,'').slice(0,8))} type="password" placeholder="Numerischer PIN" onSubmit={doDev}/>
              <div style={{ marginTop: 8 }}><PrimaryBtn label="Einloggen →" onClick={doDev} loading={loading}/></div>
            </>)}
          </div>
        </div>
      </div>
    </div>
  )
}
