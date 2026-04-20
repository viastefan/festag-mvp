'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ── Constants ──
const INDUSTRIES = ['Technologie & Software','E-Commerce & Retail','Marketing & Werbung','Finanzen & Versicherung','Gesundheit & Medizin','Bildung & E-Learning','Immobilien & Bau','Medien & Entertainment','Logistik & Transport','Beratung & Services','Gastronomie & Tourismus','Sonstiges']
const SIZES = [{ value:'freelancer',label:'Freelancer' },{ value:'1-10',label:'1–10 Mitarbeiter' },{ value:'10-50',label:'10–50 Mitarbeiter' },{ value:'50-200',label:'50–200 Mitarbeiter' },{ value:'200+',label:'200+ Mitarbeiter' }]
const LEGAL_FORMS = ['GmbH','UG (haftungsbeschränkt)','AG','GbR','Einzelunternehmen','Freiberufler','OHG','KG','GmbH & Co. KG','e.K.','Sonstiges']
const NOTIF_ITEMS = [
  { key:'ai_updates',     label:'AI Updates & Tagesberichte',   desc:'Wenn Tagro einen neuen Bericht erstellt',          path:'M12 3v4M12 17v4M3 12h4M17 12h4' },
  { key:'dev_activity',   label:'Developer-Aktivität',           desc:'Wenn ein Developer Tasks erledigt',                path:'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { key:'project_status', label:'Projekt-Statuswechsel',         desc:'Bei Phasenwechsel (Planning → Active …)',          path:'M22 12h-4l-3 9L9 3l-3 9H2' },
  { key:'billing',        label:'Rechnungen & Zahlungen',        desc:'Neue Rechnungen oder Zahlungsbestätigungen',       path:'M2 5h20v14H2zM2 10h20' },
]
type Tab = 'profile'|'company'|'security'|'integrations'
type NotifPrefs = { ai_updates:boolean; dev_activity:boolean; billing:boolean; project_status:boolean }

export default function SettingsPage() {
  // ── Profile
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [email,     setEmail]     = useState('')
  const [role,      setRole]      = useState('client')
  const [createdAt, setCreatedAt] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string|null>(null)
  // ── Company
  const [companyName,     setCN]  = useState('')
  const [companyDesc,     setCD]  = useState('')
  const [companyIndustry, setCI]  = useState('')
  const [companySize,     setCS]  = useState('')
  const [companyWebsite,  setCW]  = useState('')
  const [legalForm,       setLF]  = useState('')
  const [vatNumber,       setVAT] = useState('')
  const [taxNumber,       setTAX] = useState('')
  const [companyAddress,  setCA]  = useState('')
  const [companyCity,     setCIT] = useState('')
  const [companyZip,      setZIP] = useState('')
  // ── Security
  const [curPwd,    setCurPwd]  = useState('')
  const [newPwd,    setNewPwd]  = useState('')
  const [confPwd,   setConfPwd] = useState('')
  const [pwdMsg,    setPwdMsg]  = useState<{type:'ok'|'err';text:string}|null>(null)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [devices,   setDevices] = useState<any[]>([])
  // ── Integrations
  const [webhooks,  setWebhooks]  = useState<any[]>([])
  const [apiKeys,   setApiKeys]   = useState<any[]>([])
  const [newWHName, setNewWHName] = useState('')
  const [newWHUrl,  setNewWHUrl]  = useState('')
  const [newKeyName,setNewKeyName]= useState('')
  const [intLoading,setIntLoading]= useState(false)
  const [generatedKey, setGeneratedKey] = useState<string|null>(null)
  // ── Notifications
  const [notifs, setNotifs] = useState<NotifPrefs>({ ai_updates:true, dev_activity:true, billing:false, project_status:true })
  const [pushOk,  setPushOk]  = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  // ── UI
  const [tab,     setTab]     = useState<Tab>('profile')
  const [userId,  setUserId]  = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saveMsg, setSaveMsg] = useState<'ok'|'err'|null>(null)
  const [avatarUp,setAvatarUp]= useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href='/login'; return }
      const uid = data.session.user.id
      setUserId(uid); setEmail(data.session.user.email??'')
      const [{ data: p }, { data: devs }, { data: whs }, { data: keys }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('login_devices').select('*').eq('user_id', uid).order('last_seen', { ascending:false }),
        supabase.from('webhooks').select('*').eq('user_id', uid).order('created_at'),
        supabase.from('api_keys').select('id,name,key_prefix,scopes,last_used,created_at,revoked').eq('user_id', uid).eq('revoked',false).order('created_at'),
      ])
      if (p) {
        setFirstName(p.first_name??''); setLastName(p.last_name??'')
        setPhone(p.phone??''); setRole(p.role??'client'); setCreatedAt(p.created_at??'')
        setAvatarUrl(p.avatar_url??null)
        setCN(p.company_name??''); setCD(p.company_desc??''); setCI(p.company_industry??'')
        setCS(p.company_size??''); setCW(p.company_website??''); setLF(p.legal_form??'')
        setVAT(p.vat_number??''); setTAX(p.tax_number??''); setCA(p.company_address??'')
        setCIT(p.company_city??''); setZIP(p.company_zip??'')
        if (p.notif_prefs) setNotifs(p.notif_prefs as NotifPrefs)
      }
      setDevices(devs??[]); setWebhooks(whs??[]); setApiKeys(keys??[])
      setLoading(false)
    })
    setPushSupported('Notification' in window)
    // Register current device
    registerDevice()
  }, [])

  async function registerDevice() {
    const uid = (await supabase.auth.getUser()).data.user?.id
    if (!uid) return
    const ua = navigator.userAgent
    const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser'
    const os = ua.includes('Mac') ? 'macOS' : ua.includes('Windows') ? 'Windows' : ua.includes('iPhone')||ua.includes('iPad') ? 'iOS' : ua.includes('Android') ? 'Android' : 'Unknown'
    const devName = `${browser} auf ${os}`
    // Upsert device by user+browser+os combo (approximate)
    await supabase.from('login_devices').upsert({
      user_id: uid, device_name: devName, browser, os,
      last_seen: new Date().toISOString(), is_current: true,
    }, { onConflict: 'user_id,device_name' })
  }

  async function save() {
    setSaving(true); setSaveMsg(null)
    const displayName = [firstName,lastName].filter(Boolean).join(' ')||null
    const { error } = await supabase.from('profiles').update({
      first_name:firstName||null, last_name:lastName||null, full_name:displayName,
      phone:phone||null, company_name:companyName||null, company_desc:companyDesc||null,
      company_industry:companyIndustry||null, company_size:companySize||null,
      company_website:companyWebsite||null, legal_form:legalForm||null,
      vat_number:vatNumber||null, tax_number:taxNumber||null,
      company_address:companyAddress||null, company_city:companyCity||null,
      company_zip:companyZip||null, notif_prefs:notifs,
    }).eq('id', userId)
    setSaving(false); setSaveMsg(error?'err':'ok')
    setTimeout(() => setSaveMsg(null), 2800)
  }

  async function uploadAvatar(file: File) {
    setAvatarUp(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert:true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = publicUrl + '?v=' + Date.now()
      await supabase.from('profiles').update({ avatar_url:url }).eq('id', userId)
      setAvatarUrl(url)
    }
    setAvatarUp(false)
  }

  async function changePassword() {
    if (!newPwd || newPwd !== confPwd) { setPwdMsg({ type:'err', text:'Passwörter stimmen nicht überein.' }); return }
    if (newPwd.length < 8) { setPwdMsg({ type:'err', text:'Mindestens 8 Zeichen.' }); return }
    setPwdSaving(true); setPwdMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setPwdSaving(false)
    if (error) { setPwdMsg({ type:'err', text: error.message }); return }
    setPwdMsg({ type:'ok', text:'Passwort erfolgreich geändert.' })
    setCurPwd(''); setNewPwd(''); setConfPwd('')
    // Log in activity feed
    await supabase.from('activity_feed').insert({ user_id:userId, actor_role:'system', event_type:'password_changed', title:'Passwort geändert', icon:'🔐' })
    setTimeout(() => setPwdMsg(null), 3000)
  }

  async function removeDevice(id: string) {
    await supabase.from('login_devices').delete().eq('id', id)
    setDevices(devices.filter(d => d.id !== id))
  }

  async function createWebhook() {
    if (!newWHName || !newWHUrl) return
    setIntLoading(true)
    const { data } = await supabase.from('webhooks').insert({ user_id:userId, name:newWHName, url:newWHUrl }).select().single()
    if (data) setWebhooks(prev => [...prev, data])
    setNewWHName(''); setNewWHUrl(''); setIntLoading(false)
  }

  async function deleteWebhook(id: string) {
    await supabase.from('webhooks').delete().eq('id', id)
    setWebhooks(webhooks.filter(w => w.id !== id))
  }

  async function createApiKey() {
    if (!newKeyName) return
    setIntLoading(true)
    // Generate a secure random key (in production, do this server-side)
    const raw = 'fstg_' + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2,'0')).join('')
    const prefix = raw.slice(0, 12)
    // Store hash (in prod: bcrypt server-side — here we store prefix only for demo)
    const { data } = await supabase.from('api_keys').insert({ user_id:userId, name:newKeyName, key_hash:raw, key_prefix:prefix }).select().single()
    if (data) { setApiKeys(prev => [...prev, data]); setGeneratedKey(raw) }
    setNewKeyName(''); setIntLoading(false)
  }

  async function revokeKey(id: string) {
    await supabase.from('api_keys').update({ revoked:true }).eq('id', id)
    setApiKeys(apiKeys.filter(k => k.id !== id))
  }

  async function toggleNotif(key: keyof NotifPrefs) {
    const updated = { ...notifs, [key]: !notifs[key] }
    setNotifs(updated)
    await supabase.from('profiles').update({ notif_prefs:updated }).eq('id', userId)
  }

  async function enablePush() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return
    const token = `web_${userId}_${Date.now()}`
    await supabase.rpc('upsert_push_token', { p_token:token, p_platform:'web', p_device:navigator.userAgent.slice(0,80) })
    setPushOk(true)
  }

  const logout = async () => { await supabase.auth.signOut(); window.location.href='/login' }
  const displayName = [firstName,lastName].filter(Boolean).join(' ')
  const initial = (firstName||email||'U').charAt(0).toUpperCase()

  if (loading) return (
    <div style={{ display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh' }}>
      <div style={{ width:28,height:28,border:'2px solid var(--border)',borderTopColor:'var(--text)',borderRadius:'50%',animation:'spin .8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ maxWidth:680 }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
        .card { background:#fff; border:1px solid var(--border); border-radius:20px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.05); margin-bottom:14px; }
        .card-hd { padding:16px 24px; border-bottom:1px solid var(--border); background:var(--bg); display:flex; align-items:center; justify-content:space-between; }
        .card-bd { padding:22px 24px; display:flex; flex-direction:column; gap:14px; }
        .inp { width:100%;padding:11px 14px;background:#FAFAFA;border:1px solid var(--border);border-radius:12px;font-size:15px;outline:none;color:var(--text);box-sizing:border-box;transition:all .15s;font-family:inherit;font-weight:500; }
        .inp:focus { border-color:var(--border-strong);box-shadow:0 0 0 3px rgba(15,23,42,.05);background:#fff; }
        .inp:disabled { background:var(--surface-2);color:var(--text-muted);cursor:not-allowed; }
        .inp::placeholder { color:#CBD5E1; }
        .txta { width:100%;padding:11px 14px;background:#FAFAFA;border:1px solid var(--border);border-radius:12px;font-size:15px;outline:none;color:var(--text);box-sizing:border-box;resize:vertical;min-height:90px;font-family:inherit;font-weight:500;transition:all .15s;line-height:1.55; }
        .txta:focus { border-color:var(--border-strong);box-shadow:0 0 0 3px rgba(15,23,42,.05);background:#fff; }
        .sel { width:100%;padding:11px 14px;background:#FAFAFA;border:1px solid var(--border);border-radius:12px;font-size:15px;outline:none;color:var(--text);box-sizing:border-box;cursor:pointer;font-family:inherit;font-weight:500;appearance:none;transition:all .15s; }
        .sel:focus { border-color:var(--border-strong); background:#fff; }
        .btn { display:inline-flex;align-items:center;gap:8px;padding:11px 20px;background:var(--text);color:#fff;border:none;border-radius:12px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(15,23,42,.15);transition:all .15s; }
        .btn:hover { opacity:.88;transform:translateY(-1px);box-shadow:0 4px 16px rgba(15,23,42,.2); }
        .btn:disabled { opacity:.4;cursor:default;transform:none; }
        .btn-ghost { display:inline-flex;align-items:center;gap:7px;padding:9px 16px;background:transparent;color:var(--text);border:1px solid var(--border);border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s; }
        .btn-ghost:hover { background:var(--surface-2);border-color:var(--border-strong); }
        .btn-red { display:inline-flex;align-items:center;gap:6px;padding:7px 13px;background:var(--red-bg);color:var(--red);border:1px solid #FECACA;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s; }
        .btn-red:hover { background:#FEE2E2; }
        .lbl { font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px; }
        .tog { width:46px;height:26px;border-radius:13px;position:relative;cursor:pointer;transition:background .2s;border:none;flex-shrink:0; }
        .tog-th { position:absolute;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:left .2s cubic-bezier(.4,0,.2,1); }
        .tab-row { display:flex;background:var(--surface-2);border-radius:14px;padding:4px;gap:3px;margin-bottom:16px; }
        .tab-btn { flex:1;padding:9px 12px;border-radius:11px;border:none;cursor:pointer;font-size:13px;font-weight:500;font-family:inherit;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:6px; }
        .tab-on  { background:#fff;color:var(--text);font-weight:700;box-shadow:0 2px 8px rgba(15,23,42,.1); }
        .tab-off { background:transparent;color:var(--text-muted); }
        .tab-off:hover { color:var(--text);background:rgba(255,255,255,.5); }
        .row-2 { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .row-3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px; }
        .sel-wrap { position:relative; }
        .sel-wrap::after { content:'';position:absolute;right:13px;top:50%;transform:translateY(-50%);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #94A3B8;pointer-events:none; }
        .ai-badge { display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:6px;font-size:10px;font-weight:700;color:#007AFF;letter-spacing:.04em; }
        .notif-row { padding:14px 24px;display:flex;gap:14px;align-items:center; }
        .dev-card { background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:12px 16px;display:flex;gap:12px;align-items:center; }
        .wh-row { background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:12px 16px;display:flex;gap:10px;align-items:center; }
        .chip { display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:.04em; }
        .chip-green { background:var(--green-bg);color:var(--green-dark);border:1px solid var(--green-border); }
        .chip-gray  { background:var(--surface-2);color:var(--text-muted);border:1px solid var(--border); }
        .key-box { background:#0F172A;border-radius:10px;padding:10px 14px;font-family:monospace;font-size:13px;color:#4ade80;word-break:break-all;letter-spacing:.05em; }
        @media(max-width:640px) { .row-2,.row-3 { grid-template-columns:1fr; } }
        @keyframes spin { to{transform:rotate(360deg);} }
      `}</style>

      {/* Page header */}
      <div className="animate-fade-up" style={{ marginBottom:24 }}>
        <h1 style={{ marginBottom:4 }}>Einstellungen</h1>
        <p style={{ fontSize:14,color:'var(--text-secondary)' }}>Profil · Unternehmen · Sicherheit · Integrationen</p>
      </div>

      {/* Avatar card */}
      <div className="animate-fade-up-1" style={{ background:'#fff',border:'1px solid var(--border)',borderRadius:22,padding:'22px 26px',marginBottom:16,display:'flex',gap:20,alignItems:'center',boxShadow:'0 8px 30px rgba(0,0,0,.04)' }}>
        {/* Avatar */}
        <div style={{ position:'relative',width:76,height:76,flexShrink:0,cursor:'pointer' }} onClick={() => fileRef.current?.click()}>
          {avatarUp ? (
            <div style={{ width:76,height:76,borderRadius:'50%',background:'var(--surface-2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <div style={{ width:22,height:22,border:'3px solid #CBD5E1',borderTopColor:'var(--text)',borderRadius:'50%',animation:'spin .7s linear infinite' }} />
            </div>
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width:76,height:76,borderRadius:'50%',objectFit:'cover',border:'3px solid #fff',boxShadow:'0 4px 16px rgba(0,0,0,.12)' }} />
          ) : (
            <div style={{ width:76,height:76,borderRadius:'50%',background:'linear-gradient(135deg,#E2E8F0,#F1F5F9)',border:'3px solid #fff',boxShadow:'0 4px 16px rgba(0,0,0,.07)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:700,color:'var(--text)' }}>{initial}</div>
          )}
          <div style={{ position:'absolute',bottom:0,right:0,width:24,height:24,background:'var(--text)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #fff',boxShadow:'0 2px 8px rgba(0,0,0,.2)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={e => { const f=e.target.files?.[0]; if(f) uploadAvatar(f) }} />
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ fontSize:18,fontWeight:700,color:'var(--text)',margin:'0 0 3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
            {displayName || email.split('@')[0] || 'Mein Profil'}
          </p>
          <p style={{ fontSize:13,color:'var(--text-muted)',margin:'0 0 8px',textTransform:'capitalize' }}>
            {role} {createdAt && `· Seit ${new Date(createdAt).toLocaleDateString('de',{ month:'long',year:'numeric' })}`}
          </p>
          <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
            <span className="chip chip-green">● AKTIV</span>
            <span className="chip chip-gray" style={{ cursor:'pointer' }} onClick={() => fileRef.current?.click()}>Foto ändern</span>
          </div>
        </div>
        <button onClick={logout} className="btn-red" style={{ alignSelf:'flex-start' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Abmelden
        </button>
      </div>

      {/* Tab row */}
      <div className="tab-row animate-fade-up-2">
        {([
          { key:'profile',      label:'Profil',        icon:'M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 20c0-4 4-6 8-6s8 2 8 6' },
          { key:'company',      label:'Unternehmen',   icon:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
          { key:'security',     label:'Sicherheit',    icon:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
          { key:'integrations', label:'Integrationen', icon:'M18 20V10M12 20V4M6 20v-6' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`tab-btn ${tab===t.key?'tab-on':'tab-off'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tab===t.key?2.2:1.8} strokeLinecap="round" strokeLinejoin="round"><path d={t.icon}/></svg>
            <span className="hide-mobile">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ─── PROFIL TAB ─── */}
      {tab==='profile' && (
        <div className="card animate-fade-up">
          <div className="card-hd"><p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.08em',margin:0 }}>PERSÖNLICHE DATEN</p></div>
          <div className="card-bd">
            <div className="row-2">
              <div><label className="lbl">Vorname</label><input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Max" className="inp"/></div>
              <div><label className="lbl">Nachname</label><input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Mustermann" className="inp"/></div>
            </div>
            <div><label className="lbl">Telefonnummer</label>
              <div style={{ position:'relative' }}>
                <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+49 151 12345678" className="inp" type="tel" style={{ paddingLeft:40 }}/>
                <svg style={{ position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.09 5.18 2 2 0 0 1 4.09 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 10.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z"/></svg>
              </div>
            </div>
            <div><label className="lbl">E-Mail</label><input value={email} disabled className="inp"/><p style={{ fontSize:11,color:'var(--text-muted)',marginTop:5 }}>E-Mail kann nicht geändert werden.</p></div>

            {/* Notification toggles in profile tab too */}
            <div style={{ borderTop:'1px solid var(--border)',paddingTop:16,marginTop:4 }}>
              <p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.08em',marginBottom:12 }}>BENACHRICHTIGUNGEN</p>
              {NOTIF_ITEMS.map((n,i) => {
                const on = notifs[n.key as keyof NotifPrefs]
                return (
                  <div key={n.key} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<3?'1px solid var(--border)':'none' }}>
                    <div>
                      <p style={{ fontSize:13.5,fontWeight:600,color:'var(--text)',margin:0 }}>{n.label}</p>
                      <p style={{ fontSize:12,color:'var(--text-muted)',margin:'2px 0 0' }}>{n.desc}</p>
                    </div>
                    <button className="tog" onClick={() => toggleNotif(n.key as keyof NotifPrefs)} style={{ background:on?'var(--green)':'var(--border)' }}>
                      <div className="tog-th" style={{ left:on?23:3 }} />
                    </button>
                  </div>
                )
              })}

              {/* Push permission */}
              {pushSupported && !pushOk && (
                <div style={{ marginTop:14,background:'var(--text)',borderRadius:14,padding:'14px 18px',display:'flex',gap:14,alignItems:'center' }}>
                  <p style={{ fontSize:13,fontWeight:600,color:'#fff',flex:1,margin:0 }}>Push-Benachrichtigungen aktivieren</p>
                  <button onClick={enablePush} style={{ padding:'8px 14px',background:'#fff',color:'var(--text)',border:'none',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer' }}>Aktivieren</button>
                </div>
              )}
              {pushOk && <div style={{ marginTop:10,padding:'10px 14px',background:'var(--green-bg)',border:'1px solid var(--green-border)',borderRadius:10,fontSize:13,color:'var(--green-dark)',fontWeight:600 }}>✓ Push-Benachrichtigungen aktiv</div>}
            </div>

            <SaveBtn saving={saving} saveMsg={saveMsg} onClick={save} />
          </div>
        </div>
      )}

      {/* ─── UNTERNEHMEN TAB ─── */}
      {tab==='company' && (
        <div className="card animate-fade-up">
          <div className="card-hd">
            <p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.08em',margin:0 }}>UNTERNEHMENSDATEN</p>
            <span className="ai-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>AI-KONTEXT</span>
          </div>
          <div className="card-bd">
            <div className="row-2">
              <div><label className="lbl">Firmenname</label><input value={companyName} onChange={e=>setCN(e.target.value)} placeholder="Meine GmbH" className="inp"/></div>
              <div className="sel-wrap"><label className="lbl">Rechtsform</label><select value={legalForm} onChange={e=>setLF(e.target.value)} className="sel"><option value="">Rechtsform…</option>{LEGAL_FORMS.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
            </div>

            <div>
              <label className="lbl" style={{ display:'flex',justifyContent:'space-between' }}>
                Unternehmensbeschreibung
                <span style={{ fontSize:10,color:'#007AFF',fontWeight:700 }}>Wichtig für AI ✦</span>
              </label>
              <textarea value={companyDesc} onChange={e=>setCD(e.target.value)} placeholder="Beschreibe dein Unternehmen, deine Kunden und Ziele. Je mehr Detail, desto besser kann Tagro deine Projekte planen…" className="txta" style={{ minHeight:100 }}/>
              <p style={{ fontSize:11,color:'var(--text-muted)',marginTop:4 }}>{companyDesc.length} Zeichen · Mindestens 100 empfohlen</p>
            </div>

            <div className="row-2">
              <div className="sel-wrap"><label className="lbl">Branche</label><select value={companyIndustry} onChange={e=>setCI(e.target.value)} className="sel"><option value="">Branche wählen…</option>{INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}</select></div>
              <div className="sel-wrap"><label className="lbl">Unternehmensgröße</label><select value={companySize} onChange={e=>setCS(e.target.value)} className="sel"><option value="">Größe…</option>{SIZES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
            </div>

            <div>
              <label className="lbl">Website</label>
              <div style={{ position:'relative' }}>
                <input value={companyWebsite} onChange={e=>setCW(e.target.value)} placeholder="Noch keine Website? Festag kümmert sich darum!" className="inp" type="url" style={{ paddingLeft:40 }}/>
                <svg style={{ position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>
              </div>
              {!companyWebsite && <p style={{ fontSize:11,color:'var(--green-dark)',marginTop:5,fontWeight:600 }}>✦ Kein Problem — Festag baut deine Website!</p>}
            </div>

            {/* Address */}
            <div>
              <label className="lbl">Adresse</label>
              <input value={companyAddress} onChange={e=>setCA(e.target.value)} placeholder="Musterstraße 1" className="inp" style={{ marginBottom:8 }}/>
              <div className="row-3" style={{ gap:8 }}>
                <input value={companyZip} onChange={e=>setZIP(e.target.value)} placeholder="PLZ" className="inp"/>
                <div style={{ gridColumn:'2 / 4' }}><input value={companyCity} onChange={e=>setCIT(e.target.value)} placeholder="Stadt" className="inp" style={{ width:'100%' }}/></div>
              </div>
            </div>

            {/* Legal / Tax */}
            <div style={{ borderTop:'1px solid var(--border)',paddingTop:16 }}>
              <p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.08em',marginBottom:12 }}>STEUER & RECHT</p>
              <div className="row-2">
                <div><label className="lbl">USt-IdNr. (Umsatzsteuer-ID)</label><input value={vatNumber} onChange={e=>setVAT(e.target.value)} placeholder="DE123456789" className="inp"/></div>
                <div><label className="lbl">Steuernummer</label><input value={taxNumber} onChange={e=>setTAX(e.target.value)} placeholder="12/345/67890" className="inp"/></div>
              </div>
              <p style={{ fontSize:11,color:'var(--text-muted)',marginTop:6 }}>Wird für Rechnungen und Verträge verwendet. Optional.</p>
            </div>

            <SaveBtn saving={saving} saveMsg={saveMsg} onClick={save} />
          </div>
        </div>
      )}

      {/* ─── SICHERHEIT TAB ─── */}
      {tab==='security' && (
        <div className="animate-fade-up" style={{ display:'flex',flexDirection:'column',gap:14 }}>
          {/* Password change */}
          <div className="card">
            <div className="card-hd"><p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.08em',margin:0 }}>PASSWORT ÄNDERN</p></div>
            <div className="card-bd">
              <div><label className="lbl">Neues Passwort</label><input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Mindestens 8 Zeichen" className="inp" autoComplete="new-password"/></div>
              <div><label className="lbl">Passwort bestätigen</label><input type="password" value={confPwd} onChange={e=>setConfPwd(e.target.value)} placeholder="Wiederholen" className="inp" autoComplete="new-password" onKeyDown={e=>e.key==='Enter'&&changePassword()}/></div>
              {pwdMsg && <div style={{ padding:'10px 14px',borderRadius:10,fontSize:13,fontWeight:600,background:pwdMsg.type==='ok'?'var(--green-bg)':'var(--red-bg)',color:pwdMsg.type==='ok'?'var(--green-dark)':'var(--red)',border:`1px solid ${pwdMsg.type==='ok'?'var(--green-border)':'#FECACA'}` }}>{pwdMsg.text}</div>}
              <button onClick={changePassword} disabled={pwdSaving||!newPwd||!confPwd} className="btn" style={{ alignSelf:'flex-start' }}>
                {pwdSaving ? <><span style={{ width:13,height:13,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite' }}/>Ändert…</> : <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Passwort ändern</>}
              </button>
            </div>
          </div>

          {/* Devices */}
          <div className="card">
            <div className="card-hd">
              <p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.08em',margin:0 }}>AKTIVE GERÄTE</p>
              <span style={{ fontSize:11,color:'var(--text-muted)' }}>{devices.length} {devices.length===1?'Gerät':'Geräte'}</span>
            </div>
            <div style={{ padding:'14px 20px',display:'flex',flexDirection:'column',gap:10 }}>
              {devices.length===0 ? (
                <p style={{ fontSize:13,color:'var(--text-muted)',textAlign:'center',padding:'16px 0',margin:0 }}>Noch keine Geräte registriert</p>
              ) : devices.map(d => (
                <div key={d.id} className="dev-card">
                  <div style={{ width:38,height:38,borderRadius:10,background:d.is_current?'var(--green-bg)':'var(--surface-2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${d.is_current?'var(--green-border)':'var(--border)'}` }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={d.is_current?'var(--green-dark)':'#94A3B8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {d.os==='iOS'||d.os==='Android' ? <path d="M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"/> : <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>}
                    </svg>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:13,fontWeight:600,color:'var(--text)',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.device_name}</p>
                    <p style={{ fontSize:11,color:'var(--text-muted)',margin:'2px 0 0' }}>Zuletzt: {new Date(d.last_seen).toLocaleDateString('de',{ day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit' })}</p>
                  </div>
                  {d.is_current ? <span className="chip chip-green">Dieses Gerät</span> : (
                    <button onClick={() => removeDevice(d.id)} className="btn-red">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      Entfernen
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── INTEGRATIONEN TAB ─── */}
      {tab==='integrations' && (
        <div className="animate-fade-up" style={{ display:'flex',flexDirection:'column',gap:14 }}>

          {/* Coming services */}
          <div className="card">
            <div className="card-hd"><p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.08em',margin:0 }}>DIENSTE</p></div>
            <div style={{ padding:'14px 20px',display:'flex',flexDirection:'column',gap:10 }}>
              {[
                { name:'Slack',     icon:'💬', desc:'Projektbenachrichtigungen in Slack',  status:'coming' },
                { name:'Zapier',    icon:'⚡', desc:'Automatisierungen & Workflows',        status:'coming' },
                { name:'Notion',    icon:'📄', desc:'Projekte & Tasks in Notion sync',      status:'coming' },
                { name:'GitHub',    icon:'🐙', desc:'Repository verknüpfen',               status:'coming' },
                { name:'E-Mail',    icon:'📧', desc:'SMTP / SendGrid Integration',         status:'coming' },
              ].map(s => (
                <div key={s.name} style={{ background:'var(--bg)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 16px',display:'flex',gap:12,alignItems:'center' }}>
                  <span style={{ fontSize:22,flexShrink:0 }}>{s.icon}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13,fontWeight:600,color:'var(--text)',margin:0 }}>{s.name}</p>
                    <p style={{ fontSize:11,color:'var(--text-muted)',margin:'2px 0 0' }}>{s.desc}</p>
                  </div>
                  <span className="chip chip-gray">Coming Soon</span>
                </div>
              ))}
            </div>
          </div>

          {/* Webhooks */}
          <div className="card">
            <div className="card-hd">
              <div><p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.08em',margin:0 }}>WEBHOOKS</p><p style={{ fontSize:11,color:'var(--text-muted)',margin:'3px 0 0' }}>Events via HTTP POST an deine URL senden</p></div>
              <span style={{ fontSize:12,color:'var(--text-muted)' }}>{webhooks.length} aktiv</span>
            </div>
            <div style={{ padding:'18px 20px',display:'flex',flexDirection:'column',gap:10 }}>
              {webhooks.map(w => (
                <div key={w.id} className="wh-row">
                  <div style={{ width:8,height:8,borderRadius:'50%',background:w.active?'var(--green)':'var(--border)',flexShrink:0,animation:w.active?'pulse 2s infinite':'none' }} />
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:13,fontWeight:600,color:'var(--text)',margin:0 }}>{w.name}</p>
                    <p style={{ fontSize:11,color:'var(--text-muted)',margin:'2px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{w.url}</p>
                  </div>
                  <button onClick={() => deleteWebhook(w.id)} className="btn-red">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              ))}
              {/* Add webhook */}
              <div style={{ display:'flex',flexDirection:'column',gap:8,borderTop:webhooks.length?'1px solid var(--border)':'none',paddingTop:webhooks.length?10:0 }}>
                <div className="row-2">
                  <div><label className="lbl">Name</label><input value={newWHName} onChange={e=>setNewWHName(e.target.value)} placeholder="Mein Webhook" className="inp" style={{ fontSize:14 }}/></div>
                  <div><label className="lbl">URL</label><input value={newWHUrl} onChange={e=>setNewWHUrl(e.target.value)} placeholder="https://…" className="inp" style={{ fontSize:14 }}/></div>
                </div>
                <button onClick={createWebhook} disabled={intLoading||!newWHName||!newWHUrl} className="btn" style={{ alignSelf:'flex-start' }}>
                  {intLoading?'…':'+ Webhook hinzufügen'}
                </button>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="card">
            <div className="card-hd">
              <div><p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.08em',margin:0 }}>API KEYS</p><p style={{ fontSize:11,color:'var(--text-muted)',margin:'3px 0 0' }}>Für Zapier, externe Tools oder eigene Integrationen</p></div>
            </div>
            <div style={{ padding:'18px 20px',display:'flex',flexDirection:'column',gap:10 }}>
              {generatedKey && (
                <div>
                  <p style={{ fontSize:12,fontWeight:600,color:'var(--green-dark)',marginBottom:8 }}>✓ API Key erstellt — nur einmal sichtbar!</p>
                  <div className="key-box">{generatedKey}</div>
                  <p style={{ fontSize:11,color:'var(--text-muted)',marginTop:6 }}>Kopiere diesen Key jetzt. Er wird nicht erneut angezeigt.</p>
                  <button onClick={() => { navigator.clipboard.writeText(generatedKey); setGeneratedKey(null) }} className="btn" style={{ marginTop:8,alignSelf:'flex-start' }}>Kopieren & Schließen</button>
                </div>
              )}
              {apiKeys.map(k => (
                <div key={k.id} className="wh-row">
                  <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--green)',flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13,fontWeight:600,color:'var(--text)',margin:0 }}>{k.name}</p>
                    <p style={{ fontSize:11,color:'var(--text-muted)',margin:'2px 0 0',fontFamily:'monospace' }}>{k.key_prefix}…</p>
                  </div>
                  {k.last_used && <span style={{ fontSize:11,color:'var(--text-muted)' }}>zuletzt {new Date(k.last_used).toLocaleDateString('de')}</span>}
                  <button onClick={() => revokeKey(k.id)} className="btn-red">Widerrufen</button>
                </div>
              ))}
              <div style={{ display:'flex',gap:8,borderTop:apiKeys.length?'1px solid var(--border)':'none',paddingTop:apiKeys.length?10:0 }}>
                <input value={newKeyName} onChange={e=>setNewKeyName(e.target.value)} placeholder="Key-Name (z.B. Zapier)" className="inp" style={{ flex:1,fontSize:14 }}/>
                <button onClick={createApiKey} disabled={intLoading||!newKeyName} className="btn">
                  {intLoading?'…':'+ Key erstellen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SaveBtn({ saving, saveMsg, onClick }: { saving:boolean; saveMsg:'ok'|'err'|null; onClick:()=>void }) {
  return (
    <button onClick={onClick} disabled={saving} className="btn" style={{ alignSelf:'flex-start', marginTop:4 }}>
      {saving ? <><span style={{ width:13,height:13,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite' }}/>Speichert…</> :
       saveMsg==='ok' ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>Gespeichert</> :
       saveMsg==='err' ? 'Fehler — erneut versuchen' : 'Speichern'}
    </button>
  )
}
