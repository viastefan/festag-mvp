'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import SettingsRightPanel from '@/components/SettingsRightPanel'

const INDUSTRIES = ['Technologie & Software','E-Commerce & Retail','Marketing & Werbung','Finanzen & Versicherung','Gesundheit & Medizin','Bildung & E-Learning','Immobilien & Bau','Medien & Entertainment','Logistik & Transport','Beratung & Services','Gastronomie & Tourismus','Sonstiges']
const SIZES = [{v:'freelancer',l:'Freelancer'},{v:'1-10',l:'1–10'},{v:'10-50',l:'10–50'},{v:'50-200',l:'50–200'},{v:'200+',l:'200+'}]
const LEGAL = ['GmbH','UG (haftungsbeschränkt)','AG','GbR','Einzelunternehmen','Freiberufler','OHG','KG','GmbH & Co. KG','e.K.','Sonstiges']
type Tab = 'profile'|'company'|'security'|'integrations'
type Notifs = { ai_updates:boolean; dev_activity:boolean; billing:boolean; project_status:boolean }

export default function SettingsPage() {
  // ── STATE ──────────────────────────────────────────
  const [uid,       setUid]       = useState('')
  const [email,     setEmail]     = useState('')
  const [role,      setRole]      = useState('client')
  const [joinDate,  setJoinDate]  = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string|null>(null)
  const [uploading, setUploading] = useState(false)

  // profile fields
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')

  // company fields
  const [compName, setCompName] = useState('')
  const [compDesc, setCompDesc] = useState('')
  const [compInd,  setCompInd]  = useState('')
  const [compSize, setCompSize] = useState('')
  const [compWeb,  setCompWeb]  = useState('')
  const [legalForm,setLegalForm]= useState('')
  const [vat,      setVat]      = useState('')
  const [tax,      setTax]      = useState('')
  const [addr,     setAddr]     = useState('')
  const [city,     setCity]     = useState('')
  const [zip,      setZip]      = useState('')

  // security
  const [newPwd,  setNewPwd]  = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg,    setPwdMsg]    = useState<{t:'ok'|'err',m:string}|null>(null)
  const [devices,   setDevices]   = useState<any[]>([])

  // integrations
  const [webhooks,    setWebhooks]    = useState<any[]>([])
  const [apiKeys,     setApiKeys]     = useState<any[]>([])
  const [newWHName,   setNewWHName]   = useState('')
  const [newWHUrl,    setNewWHUrl]    = useState('')
  const [newKeyName,  setNewKeyName]  = useState('')
  const [generatedKey,setGeneratedKey]= useState<string|null>(null)
  const [intBusy,     setIntBusy]     = useState(false)

  // notifications
  const [notifs, setNotifs] = useState<Notifs>({ ai_updates:true, dev_activity:true, billing:false, project_status:true })
  const [pushOk,   setPushOk]   = useState(false)
  const [pushSup,  setPushSup]  = useState(false)

  // ui
  const [tab,     setTab]     = useState<Tab>('profile')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState<'ok'|'err'|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sb = createClient()

  // ── LOAD ──────────────────────────────────────────
  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href='/login'; return }
      const u = data.session.user
      setUid(u.id); setEmail(u.email??'')
      const [{ data:p }, { data:devs }, { data:whs }, { data:keys }] = await Promise.all([
        sb.from('profiles').select('*').eq('id', u.id).single(),
        sb.from('login_devices').select('*').eq('user_id', u.id).order('last_seen',{ascending:false}).limit(5),
        sb.from('webhooks').select('*').eq('user_id', u.id).order('created_at'),
        sb.from('api_keys').select('id,name,key_prefix,scopes,last_used,created_at').eq('user_id', u.id).eq('revoked',false),
      ])
      if (p) {
        setFirstName(p.first_name??''); setLastName(p.last_name??''); setPhone(p.phone??'')
        setRole(p.role??'client'); setJoinDate(p.created_at??''); setAvatarUrl(p.avatar_url??null)
        setCompName(p.company_name??''); setCompDesc(p.company_desc??''); setCompInd(p.company_industry??'')
        setCompSize(p.company_size??''); setCompWeb(p.company_website??''); setLegalForm(p.legal_form??'')
        setVat(p.vat_number??''); setTax(p.tax_number??''); setAddr(p.company_address??'')
        setCity(p.company_city??''); setZip(p.company_zip??'')
        if (p.notif_prefs) setNotifs(p.notif_prefs as Notifs)
      }
      setDevices(devs??[]); setWebhooks(whs??[]); setApiKeys(keys??[])

      // Register current device
      const ua = navigator.userAgent
      const browser = ua.includes('Edg') ? 'Edge' : ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser'
      const os = ua.includes('iPhone')||ua.includes('iPad') ? 'iOS' : ua.includes('Android') ? 'Android' : ua.includes('Mac') ? 'macOS' : ua.includes('Win') ? 'Windows' : 'Linux'
      await sb.from('login_devices').upsert({ user_id:u.id, device_name:`${browser} auf ${os}`, browser, os, last_seen:new Date().toISOString(), is_current:true }, { onConflict:'user_id,device_name' })
      setLoading(false)
    })
    setPushSup('Notification' in window)
  }, [])

  // ── SAVE PROFILE ──────────────────────────────────
  async function save() {
    if (!uid) return
    setSaving(true); setSaved(null)
    const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || null
    const payload: any = {
      first_name:   firstName.trim()||null,
      last_name:    lastName.trim()||null,
      full_name:    displayName,
      phone:        phone.trim()||null,
      company_name: compName.trim()||null,
      company_desc: compDesc.trim()||null,
      company_industry: compInd||null,
      company_size: compSize||null,
      company_website: compWeb.trim()||null,
      legal_form:   legalForm||null,
      vat_number:   vat.trim()||null,
      tax_number:   tax.trim()||null,
      company_address: addr.trim()||null,
      company_city: city.trim()||null,
      company_zip:  zip.trim()||null,
      notif_prefs:  notifs,
    }

    // Use upsert to handle cases where profile row might not exist
    const { error } = await sb.from('profiles').upsert({ id: uid, email, ...payload }, { onConflict: 'id' })

    setSaving(false)
    if (error) {
      console.error('Save error:', error)
      setSaved('err')
    } else {
      setSaved('ok')
    }
    setTimeout(() => setSaved(null), 3000)
  }

  // ── AVATAR UPLOAD ──────────────────────────────────
  async function uploadAvatar(file: File) {
    if (!file || !uid) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${uid}/avatar.${ext}`
      const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { console.error('Upload error:', upErr); setUploading(false); return }

      const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path)
      const freshUrl = `${publicUrl}?v=${Date.now()}`

      const { error: dbErr } = await sb.from('profiles').upsert({ id: uid, email, avatar_url: freshUrl }, { onConflict: 'id' })
      if (dbErr) { console.error('DB error:', dbErr) }
      setAvatarUrl(freshUrl)
    } catch (e) { console.error('Avatar error:', e) }
    setUploading(false)
  }

  // ── PASSWORD ──────────────────────────────────────
  async function changePassword() {
    if (newPwd !== confPwd) { setPwdMsg({ t:'err', m:'Passwörter stimmen nicht überein.' }); return }
    if (newPwd.length < 8) { setPwdMsg({ t:'err', m:'Mindestens 8 Zeichen erforderlich.' }); return }
    setPwdSaving(true); setPwdMsg(null)
    const { error } = await sb.auth.updateUser({ password: newPwd })
    setPwdSaving(false)
    if (error) { setPwdMsg({ t:'err', m: error.message }); return }
    setPwdMsg({ t:'ok', m:'Passwort erfolgreich geändert.' })
    setNewPwd(''); setConfPwd('')
    setTimeout(() => setPwdMsg(null), 3000)
  }

  // ── NOTIFICATIONS ──────────────────────────────────
  async function toggleNotif(k: keyof Notifs) {
    const updated = { ...notifs, [k]: !notifs[k] }
    setNotifs(updated)
    await sb.from('profiles').update({ notif_prefs: updated }).eq('id', uid)
  }

  async function enablePush() {
    if (!('Notification' in window)) return
    const p = await Notification.requestPermission()
    if (p !== 'granted') return
    const token = `web_${uid}_${Date.now()}`
    await sb.rpc('upsert_push_token', { p_token: token, p_platform: 'web', p_device: navigator.userAgent.slice(0, 80) })
    setPushOk(true)
  }

  // ── WEBHOOKS + KEYS ──────────────────────────────
  async function createWebhook() {
    if (!newWHName || !newWHUrl) return
    setIntBusy(true)
    const { data } = await sb.from('webhooks').insert({ user_id:uid, name:newWHName, url:newWHUrl }).select().single()
    if (data) setWebhooks(prev => [...prev, data])
    setNewWHName(''); setNewWHUrl(''); setIntBusy(false)
  }
  async function deleteWebhook(id: string) {
    await sb.from('webhooks').delete().eq('id', id)
    setWebhooks(webhooks.filter(w => w.id !== id))
  }
  async function createApiKey() {
    if (!newKeyName) return
    setIntBusy(true)
    const raw = 'fstg_' + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b=>b.toString(16).padStart(2,'0')).join('')
    const prefix = raw.slice(0, 12)
    const { data } = await sb.from('api_keys').insert({ user_id:uid, name:newKeyName, key_hash:raw, key_prefix:prefix }).select().single()
    if (data) { setApiKeys(prev=>[...prev,data]); setGeneratedKey(raw) }
    setNewKeyName(''); setIntBusy(false)
  }
  async function revokeKey(id: string) {
    await sb.from('api_keys').update({ revoked:true }).eq('id', id)
    setApiKeys(apiKeys.filter(k => k.id !== id))
  }
  async function removeDevice(id: string) {
    await sb.from('login_devices').delete().eq('id', id)
    setDevices(devices.filter(d => d.id !== id))
  }

  const logout = async () => { await sb.auth.signOut(); window.location.href='/login' }
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0]
  const initial = (firstName || email || 'U').charAt(0).toUpperCase()

  if (loading) return (
    <div style={{ display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh' }}>
      <div style={{ width:28,height:28,border:'2px solid #E2E8F0',borderTopColor:'#0F172A',borderRadius:'50%',animation:'spin .8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ display:'flex', gap:28, alignItems:'flex-start', width:'100%' }}>
      {/* Left column — settings forms */}
      <div style={{ flex:'1 1 0', minWidth:0 }}>
      <style>{`
        .s-card { background:#fff;border:1px solid #EEF2F7;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(15,23,42,.04);margin-bottom:12px; }
        .s-hd { padding:15px 22px;border-bottom:1px solid #F1F5F9;background:#FAFBFD;display:flex;align-items:center;justify-content:space-between; }
        .s-hd-label { font-size:10.5px;font-weight:700;color:#94A3B8;letter-spacing:.1em; }
        .s-bd { padding:20px 22px;display:flex;flex-direction:column;gap:14px; }
        .inp { width:100%;padding:11px 14px;background:#F8FAFC;border:1.5px solid #EEF2F7;border-radius:12px;font-size:15px;outline:none;color:#0F172A;box-sizing:border-box;font-family:inherit;font-weight:500;transition:border-color .15s,box-shadow .15s,background .15s; }
        .inp:focus { border-color:#CBD5E1;background:#fff;box-shadow:0 0 0 3px rgba(15,23,42,.05); }
        .inp:disabled { background:#F1F5F9;color:#94A3B8;cursor:not-allowed; }
        .inp::placeholder { color:#C1CAD7; }
        .txta { width:100%;padding:11px 14px;background:#F8FAFC;border:1.5px solid #EEF2F7;border-radius:12px;font-size:15px;outline:none;color:#0F172A;box-sizing:border-box;resize:vertical;min-height:96px;font-family:inherit;font-weight:500;transition:all .15s;line-height:1.6; }
        .txta:focus { border-color:#CBD5E1;background:#fff;box-shadow:0 0 0 3px rgba(15,23,42,.05); }
        .sel-wrap { position:relative; }
        .sel { width:100%;padding:11px 38px 11px 14px;background:#F8FAFC;border:1.5px solid #EEF2F7;border-radius:12px;font-size:15px;outline:none;color:#0F172A;box-sizing:border-box;cursor:pointer;font-family:inherit;font-weight:500;appearance:none;transition:all .15s; }
        .sel:focus { border-color:#CBD5E1;background:#fff; }
        .sel-arr { position:absolute;right:13px;top:50%;transform:translateY(-50%);pointer-events:none;color:#94A3B8; }
        .btn-primary { display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:#0F172A;color:#fff;border:none;border-radius:12px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(15,23,42,.18);transition:all .15s; }
        .btn-primary:hover { opacity:.88;transform:translateY(-1px);box-shadow:0 4px 16px rgba(15,23,42,.22); }
        .btn-primary:disabled { opacity:.4;cursor:default;transform:none; }
        .btn-ghost { display:inline-flex;align-items:center;gap:7px;padding:8px 14px;background:transparent;color:#475569;border:1.5px solid #E2E8F0;border-radius:10px;font-size:12.5px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s; }
        .btn-ghost:hover { background:#F8FAFC;border-color:#CBD5E1; }
        .btn-danger { display:inline-flex;align-items:center;gap:6px;padding:7px 13px;background:#FEF2F2;color:#EF4444;border:1.5px solid #FECACA;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s; }
        .btn-danger:hover { background:#FEE2E2; }
        .lbl { font-size:12px;font-weight:600;color:#64748B;display:block;margin-bottom:6px;letter-spacing:.01em; }
        .row2 { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .row3 { display:grid;grid-template-columns:80px 1fr;gap:8px; }
        .tog { width:44px;height:24px;border-radius:12px;position:relative;cursor:pointer;transition:background .2s;border:none;flex-shrink:0; }
        .tog-th { position:absolute;top:2px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:left .18s cubic-bezier(.4,0,.2,1); }
        /* Tabs */
        .tab-row { display:flex;background:#F1F5F9;border-radius:16px;padding:4px;gap:3px;margin-bottom:14px; }
        .tab-btn { flex:1;padding:9px 8px;border-radius:12px;border:none;cursor:pointer;font-size:13px;font-weight:500;font-family:inherit;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:6px; }
        .tab-on  { background:#fff;color:#0F172A;font-weight:700;box-shadow:0 2px 8px rgba(15,23,42,.08); }
        .tab-off { background:transparent;color:#94A3B8; }
        .tab-off:hover { color:#475569;background:rgba(255,255,255,.5); }
        /* Integration cards */
        .int-card { background:#FAFBFD;border:1.5px solid #EEF2F7;border-radius:14px;padding:14px 16px;display:flex;gap:13px;align-items:center;transition:all .15s; }
        .int-card:hover { border-color:#CBD5E1;background:#fff;box-shadow:0 2px 12px rgba(15,23,42,.04); }
        .int-logo { width:42px;height:42px;border-radius:11px;background:#fff;border:1.5px solid #EEF2F7;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        /* Device card */
        .dev-card { background:#FAFBFD;border:1.5px solid #EEF2F7;border-radius:12px;padding:12px 15px;display:flex;gap:12px;align-items:center; }
        .webhook-row { background:#FAFBFD;border:1.5px solid #EEF2F7;border-radius:12px;padding:11px 15px;display:flex;gap:10px;align-items:center; }
        .chip { display:inline-block;padding:2px 8px;border-radius:6px;font-size:10.5px;font-weight:700;letter-spacing:.04em; }
        .chip-green { background:#ECFDF5;color:#059669;border:1px solid #A7F3D0; }
        .chip-gray { background:#F1F5F9;color:#64748B;border:1px solid #E2E8F0; }
        .chip-blue { background:#EFF6FF;color:#2563EB;border:1px solid #BFDBFE; }
        .ai-badge { display:inline-flex;align-items:center;gap:4px;padding:3px 9px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;font-size:10px;font-weight:700;color:#2563EB;letter-spacing:.04em; }
        .key-box { background:#0F172A;border-radius:10px;padding:12px 16px;font-family:'SF Mono',monospace;font-size:12.5px;color:#4ade80;word-break:break-all;letter-spacing:.04em;line-height:1.6; }
        @media(max-width:600px) { .row2,.row3 { grid-template-columns:1fr; } }
        @keyframes spin { to{transform:rotate(360deg);} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);} }
        .fade-in { animation:fadeUp .25s ease both; }
      `}</style>

      {/* Page header */}
      <div className="animate-fade-up" style={{ marginBottom:22 }}>
        <h1 style={{ marginBottom:3 }}>Einstellungen</h1>
        <p style={{ fontSize:14,color:'#64748B' }}>Profil · Unternehmen · Sicherheit · Integrationen</p>
      </div>

      {/* ── AVATAR CARD ──────────────────────────────────── */}
      <div className="s-card animate-fade-up-1" style={{ marginBottom:14 }}>
        <div style={{ padding:'20px 22px',display:'flex',gap:18,alignItems:'center',flexWrap:'wrap' }}>
          {/* Avatar */}
          <div style={{ position:'relative',flexShrink:0 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ width:72,height:72,borderRadius:'50%',cursor:'pointer',overflow:'hidden',position:'relative',border:'3px solid #fff',boxShadow:'0 0 0 2px #EEF2F7, 0 4px 16px rgba(0,0,0,.10)' }}
            >
              {uploading ? (
                <div style={{ width:'100%',height:'100%',background:'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <div style={{ width:20,height:20,border:'2.5px solid #CBD5E1',borderTopColor:'#0F172A',borderRadius:'50%',animation:'spin .7s linear infinite' }} />
                </div>
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',display:'block' }} />
              ) : (
                <div style={{ width:'100%',height:'100%',background:'linear-gradient(135deg,#E2E8F0,#F1F5F9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:700,color:'#0F172A' }}>{initial}</div>
              )}
            </div>
            {/* Edit badge */}
            <div onClick={() => fileRef.current?.click()} style={{ position:'absolute',bottom:1,right:1,width:22,height:22,background:'#0F172A',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'2px solid #fff',boxShadow:'0 2px 8px rgba(0,0,0,.2)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={e => { const f=e.target.files?.[0]; if(f) uploadAvatar(f); e.target.value='' }} />

          {/* User info */}
          <div style={{ flex:1,minWidth:140 }}>
            <p style={{ fontSize:17,fontWeight:700,color:'#0F172A',margin:'0 0 2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:220 }}>
              {displayName}
            </p>
            <p style={{ fontSize:12.5,color:'#94A3B8',margin:'0 0 8px',textTransform:'capitalize' }}>
              {role}{joinDate && ` · Seit ${new Date(joinDate).toLocaleDateString('de',{month:'short',year:'numeric'})}`}
            </p>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap',alignItems:'center' }}>
              <span className="chip chip-green" style={{ display:'flex',alignItems:'center',gap:5 }}>
                <span style={{ width:5,height:5,borderRadius:'50%',background:'#10B981',animation:'pulse 2s infinite' }} />
                AKTIV
              </span>
              <button onClick={() => fileRef.current?.click()} className="btn-ghost" style={{ fontSize:11.5,padding:'4px 10px' }}>
                Foto ändern
              </button>
            </div>
          </div>

          {/* Logout */}
          <button onClick={logout} className="btn-danger" style={{ alignSelf:'flex-start' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Abmelden
          </button>
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────── */}
      <div className="tab-row animate-fade-up-2">
        {([
          { k:'profile',      l:'Profil',        icon:'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6' },
          { k:'company',      l:'Unternehmen',   icon:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
          { k:'security',     l:'Sicherheit',    icon:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
          { k:'integrations', l:'Integrationen', icon:'M18 20V10M12 20V4M6 20v-6' },
        ] as const).map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`tab-btn ${tab===t.k?'tab-on':'tab-off'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tab===t.k?2.2:1.7} strokeLinecap="round" strokeLinejoin="round"><path d={t.icon}/></svg>
            <span className="hide-mobile">{t.l}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          TAB: PROFIL
      ══════════════════════════════════════════════════ */}
      {tab==='profile' && (
        <div className="fade-in">
          <div className="s-card">
            <div className="s-hd"><span className="s-hd-label">PERSÖNLICHE DATEN</span></div>
            <div className="s-bd">
              <div className="row2">
                <div><label className="lbl">Vorname</label><input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Max" className="inp"/></div>
                <div><label className="lbl">Nachname</label><input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Mustermann" className="inp"/></div>
              </div>
              <div>
                <label className="lbl">Telefonnummer</label>
                <div style={{ position:'relative' }}>
                  <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+49 151 12345678" className="inp" type="tel" style={{ paddingLeft:40 }}/>
                  <svg style={{ position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.09 5.18 2 2 0 0 1 4.09 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 10.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z"/></svg>
                </div>
              </div>
              <div>
                <label className="lbl">E-Mail</label>
                <input value={email} disabled className="inp"/>
                <p style={{ fontSize:11,color:'#94A3B8',marginTop:5 }}>E-Mail kann nicht geändert werden.</p>
              </div>

              {/* Notifications inline */}
              <div style={{ borderTop:'1px solid #F1F5F9',paddingTop:16 }}>
                <p style={{ fontSize:10.5,fontWeight:700,color:'#94A3B8',letterSpacing:'.1em',marginBottom:12 }}>BENACHRICHTIGUNGEN</p>
                {[
                  { k:'ai_updates',     l:'AI Updates & Tagesberichte',  d:'Wenn Tagro Berichte erstellt' },
                  { k:'dev_activity',   l:'Developer-Aktivität',          d:'Tasks erledigt oder aktiv' },
                  { k:'project_status', l:'Projekt-Statuswechsel',        d:'Phasenwechsel in deinem Projekt' },
                  { k:'billing',        l:'Rechnungen & Zahlungen',       d:'Neue Rechnungen oder Bestätigungen' },
                ].map((n,i) => {
                  const on = notifs[n.k as keyof Notifs]
                  return (
                    <div key={n.k} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 0',borderBottom:i<3?'1px solid #F8FAFC':'none' }}>
                      <div>
                        <p style={{ fontSize:13.5,fontWeight:600,color:'#0F172A',margin:0 }}>{n.l}</p>
                        <p style={{ fontSize:11.5,color:'#94A3B8',margin:'2px 0 0' }}>{n.d}</p>
                      </div>
                      <button className="tog" onClick={()=>toggleNotif(n.k as keyof Notifs)} style={{ background:on?'#10B981':'#E2E8F0' }}>
                        <div className="tog-th" style={{ left:on?22:2 }} />
                      </button>
                    </div>
                  )
                })}
                {pushSup && !pushOk && (
                  <div style={{ marginTop:14,background:'#0F172A',borderRadius:14,padding:'13px 16px',display:'flex',gap:13,alignItems:'center' }}>
                    <p style={{ fontSize:13,fontWeight:600,color:'#fff',flex:1,margin:0,lineHeight:1.4 }}>Push-Benachrichtigungen aktivieren</p>
                    <button onClick={enablePush} style={{ padding:'7px 14px',background:'#fff',color:'#0F172A',border:'none',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0 }}>Aktivieren</button>
                  </div>
                )}
                {pushOk && <div style={{ marginTop:10,padding:'10px 14px',background:'#ECFDF5',border:'1px solid #A7F3D0',borderRadius:10,fontSize:13,color:'#059669',fontWeight:600 }}>✓ Push aktiv auf diesem Gerät</div>}
              </div>

              <SaveBtn saving={saving} saved={saved} onClick={save} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: UNTERNEHMEN
      ══════════════════════════════════════════════════ */}
      {tab==='company' && (
        <div className="fade-in">
          <div className="s-card">
            <div className="s-hd">
              <span className="s-hd-label">UNTERNEHMENSDATEN</span>
              <span className="ai-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>AI-KONTEXT</span>
            </div>
            <div className="s-bd">
              <div className="row2">
                <div><label className="lbl">Firmenname</label><input value={compName} onChange={e=>setCompName(e.target.value)} placeholder="Meine GmbH" className="inp"/></div>
                <div className="sel-wrap">
                  <label className="lbl">Rechtsform</label>
                  <select value={legalForm} onChange={e=>setLegalForm(e.target.value)} className="sel"><option value="">Wählen…</option>{LEGAL.map(l=><option key={l} value={l}>{l}</option>)}</select>
                  <svg className="sel-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>

              <div>
                <label className="lbl" style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  Unternehmensbeschreibung
                  <span style={{ fontSize:10.5,color:'#2563EB',fontWeight:700 }}>✦ Wichtig für AI</span>
                </label>
                <textarea value={compDesc} onChange={e=>setCompDesc(e.target.value)} placeholder="Was macht dein Unternehmen? Wer sind deine Kunden? Tagro nutzt diese Infos um Projekte besser zu verstehen und zu planen…" className="txta" style={{ minHeight:100 }}/>
                <p style={{ fontSize:11,color:'#94A3B8',marginTop:4 }}>{compDesc.length} Zeichen</p>
              </div>

              <div className="row2">
                <div className="sel-wrap">
                  <label className="lbl">Branche</label>
                  <select value={compInd} onChange={e=>setCompInd(e.target.value)} className="sel"><option value="">Branche…</option>{INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}</select>
                  <svg className="sel-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
                <div className="sel-wrap">
                  <label className="lbl">Unternehmensgröße</label>
                  <select value={compSize} onChange={e=>setCompSize(e.target.value)} className="sel"><option value="">Größe…</option>{SIZES.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}</select>
                  <svg className="sel-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>

              <div>
                <label className="lbl">Website</label>
                <div style={{ position:'relative' }}>
                  <input value={compWeb} onChange={e=>setCompWeb(e.target.value)} placeholder="Noch keine Website? Festag kümmert sich darum!" className="inp" type="url" style={{ paddingLeft:40 }}/>
                  <svg style={{ position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10A15.3 15.3 0 0 1 8 12 15.3 15.3 0 0 1 12 2z"/></svg>
                </div>
                {!compWeb && <p style={{ fontSize:11.5,color:'#059669',marginTop:5,fontWeight:600 }}>✦ Keine Website? Festag baut sie für dich!</p>}
              </div>

              {/* Address */}
              <div>
                <label className="lbl">Adresse</label>
                <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="Musterstraße 1" className="inp" style={{ marginBottom:8 }}/>
                <div className="row3">
                  <input value={zip} onChange={e=>setZip(e.target.value)} placeholder="PLZ" className="inp"/>
                  <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Stadt" className="inp"/>
                </div>
              </div>

              {/* Legal / Tax */}
              <div style={{ borderTop:'1px solid #F1F5F9',paddingTop:16 }}>
                <p style={{ fontSize:10.5,fontWeight:700,color:'#94A3B8',letterSpacing:'.1em',marginBottom:12 }}>STEUER & RECHT</p>
                <div className="row2">
                  <div><label className="lbl">USt-IdNr.</label><input value={vat} onChange={e=>setVat(e.target.value)} placeholder="DE123456789" className="inp"/></div>
                  <div><label className="lbl">Steuernummer</label><input value={tax} onChange={e=>setTax(e.target.value)} placeholder="12/345/67890" className="inp"/></div>
                </div>
                <p style={{ fontSize:11,color:'#94A3B8',marginTop:6 }}>Für Rechnungen und Verträge. Optional.</p>
              </div>

              <SaveBtn saving={saving} saved={saved} onClick={save} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: SICHERHEIT
      ══════════════════════════════════════════════════ */}
      {tab==='security' && (
        <div className="fade-in" style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <div className="s-card">
            <div className="s-hd"><span className="s-hd-label">PASSWORT ÄNDERN</span></div>
            <div className="s-bd">
              <div>
                <label className="lbl">Neues Passwort</label>
                <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Mindestens 8 Zeichen" className="inp" autoComplete="new-password"/>
              </div>
              <div>
                <label className="lbl">Passwort bestätigen</label>
                <input type="password" value={confPwd} onChange={e=>setConfPwd(e.target.value)} placeholder="Wiederholen" className="inp" autoComplete="new-password" onKeyDown={e=>e.key==='Enter'&&changePassword()}/>
              </div>
              {pwdMsg && (
                <div style={{ padding:'10px 14px',borderRadius:10,fontSize:13,fontWeight:600,background:pwdMsg.t==='ok'?'#ECFDF5':'#FEF2F2',color:pwdMsg.t==='ok'?'#059669':'#EF4444',border:`1px solid ${pwdMsg.t==='ok'?'#A7F3D0':'#FECACA'}` }}>{pwdMsg.m}</div>
              )}
              <button onClick={changePassword} disabled={pwdSaving||!newPwd||!confPwd} className="btn-primary" style={{ alignSelf:'flex-start' }}>
                {pwdSaving
                  ? <><span style={{ width:13,height:13,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite' }}/>Ändert…</>
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Passwort ändern</>}
              </button>
            </div>
          </div>

          <div className="s-card">
            <div className="s-hd">
              <span className="s-hd-label">AKTIVE GERÄTE</span>
              <span style={{ fontSize:11.5,color:'#94A3B8' }}>{devices.length} Gerät{devices.length!==1?'e':''}</span>
            </div>
            <div style={{ padding:'12px 18px',display:'flex',flexDirection:'column',gap:8 }}>
              {devices.length===0
                ? <p style={{ fontSize:13,color:'#94A3B8',textAlign:'center',padding:'16px 0',margin:0 }}>Noch keine Geräte</p>
                : devices.map(d => (
                  <div key={d.id} className="dev-card">
                    <div style={{ width:40,height:40,borderRadius:11,background:d.is_current?'#ECFDF5':'#F1F5F9',border:`1.5px solid ${d.is_current?'#A7F3D0':'#E2E8F0'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={d.is_current?'#059669':'#94A3B8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {d.os==='iOS'||d.os==='Android'
                          ? <path d="M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"/>
                          : <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>}
                      </svg>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ fontSize:13,fontWeight:600,color:'#0F172A',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.device_name}</p>
                      <p style={{ fontSize:11,color:'#94A3B8',margin:'2px 0 0' }}>Zuletzt: {new Date(d.last_seen).toLocaleDateString('de',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                    </div>
                    {d.is_current
                      ? <span className="chip chip-green">Dieses Gerät</span>
                      : <button onClick={()=>removeDevice(d.id)} className="btn-danger" style={{ fontSize:11 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    }
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: INTEGRATIONEN
      ══════════════════════════════════════════════════ */}
      {tab==='integrations' && (
        <div className="fade-in" style={{ display:'flex',flexDirection:'column',gap:12 }}>

          {/* Services */}
          <div className="s-card">
            <div className="s-hd">
              <div>
                <span className="s-hd-label">DIENSTE & AUTOMATISIERUNGEN</span>
                <p style={{ fontSize:11.5,color:'#94A3B8',margin:'3px 0 0' }}>Fortschrittlich & bald verfügbar — Verbinde dein Festag-Konto</p>
              </div>
            </div>
            <div style={{ padding:'12px 18px',display:'flex',flexDirection:'column',gap:8 }}>
              {[
                { name:'Slack',   logo:'/brand/slack.svg',   desc:'Tasks & Updates direkt in deinen Slack-Workspace senden',   features:['Task-Benachrichtigungen','AI-Berichte als Message','Team-Channel Sync'] },
                { name:'Zapier',  logo:'/brand/zapier.svg',  desc:'Tausende Apps automatisch mit Festag verbinden',            features:['5000+ App-Verbindungen','Custom Trigger & Actions','No-Code Workflows'] },
                { name:'Notion',  logo:'/brand/notion.svg',  desc:'Projekte, Tasks & Dokumente in Notion synchronisieren',     features:['Bidirektionaler Sync','Datenbank-Integration','Automatische Updates'] },
                { name:'GitHub',  logo:'/brand/github.svg',  desc:'Code-Repositories verknüpfen & Deployments tracken',        features:['PR → Task-Verknüpfung','Deployment-Status','Code-Review Tracking'] },
                { name:'Gmail',   logo:'/brand/gmail.svg',   desc:'E-Mail Benachrichtigungen & Kundenkommunikation',           features:['Automatische E-Mails','Kunden-Updates','Rechnungsversand'] },
              ].map((s, idx) => (
                <div key={s.name} className="int-card" style={{ cursor:'default' }}>
                  <div className="int-logo" style={{ background:s.name==='Notion'?'#000':'#fff',flexShrink:0 }}>
                    <img src={s.logo} alt={s.name} style={{ width:24,height:24,objectFit:'contain' }}/>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:3 }}>
                      <p style={{ fontSize:13.5,fontWeight:700,color:'#0F172A',margin:0 }}>{s.name}</p>
                      <span className="chip chip-blue" style={{ fontSize:9.5 }}>Kommt</span>
                    </div>
                    <p style={{ fontSize:12,color:'#64748B',margin:'0 0 6px',lineHeight:1.4 }}>{s.desc}</p>
                    <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
                      {s.features.map(f => (
                        <span key={f} style={{ fontSize:10.5,color:'#475569',background:'#F1F5F9',border:'1px solid #EEF2F7',borderRadius:6,padding:'2px 7px',fontWeight:500 }}>{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Webhooks */}
          <div className="s-card">
            <div className="s-hd">
              <div><span className="s-hd-label">WEBHOOKS</span><p style={{ fontSize:11.5,color:'#94A3B8',margin:'3px 0 0' }}>Events via HTTP POST senden</p></div>
              <span style={{ fontSize:11.5,color:'#94A3B8' }}>{webhooks.length} aktiv</span>
            </div>
            <div style={{ padding:'14px 18px',display:'flex',flexDirection:'column',gap:8 }}>
              {webhooks.map(w => (
                <div key={w.id} className="webhook-row">
                  <div style={{ width:7,height:7,borderRadius:'50%',background:w.active?'#10B981':'#E2E8F0',flexShrink:0 }} />
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:13,fontWeight:600,color:'#0F172A',margin:0 }}>{w.name}</p>
                    <p style={{ fontSize:11,color:'#94A3B8',margin:'1px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{w.url}</p>
                  </div>
                  <button onClick={()=>deleteWebhook(w.id)} className="btn-danger" style={{ fontSize:11,padding:'5px 9px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              ))}
              <div style={{ borderTop:webhooks.length?'1px solid #F1F5F9':'none',paddingTop:webhooks.length?10:0,display:'flex',flexDirection:'column',gap:8 }}>
                <div className="row2">
                  <div><label className="lbl">Name</label><input value={newWHName} onChange={e=>setNewWHName(e.target.value)} placeholder="Mein Webhook" className="inp" style={{ fontSize:14 }}/></div>
                  <div><label className="lbl">URL</label><input value={newWHUrl} onChange={e=>setNewWHUrl(e.target.value)} placeholder="https://…" className="inp" style={{ fontSize:14 }}/></div>
                </div>
                <button onClick={createWebhook} disabled={intBusy||!newWHName||!newWHUrl} className="btn-primary" style={{ alignSelf:'flex-start' }}>
                  {intBusy?'…':'+ Webhook hinzufügen'}
                </button>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="s-card">
            <div className="s-hd"><div><span className="s-hd-label">API KEYS</span><p style={{ fontSize:11.5,color:'#94A3B8',margin:'3px 0 0' }}>Für Zapier, externe Tools oder eigene Integrationen</p></div></div>
            <div style={{ padding:'14px 18px',display:'flex',flexDirection:'column',gap:8 }}>
              {generatedKey && (
                <div className="fade-in">
                  <p style={{ fontSize:12,fontWeight:700,color:'#059669',marginBottom:8 }}>✓ Key erstellt — nur einmal sichtbar!</p>
                  <div className="key-box">{generatedKey}</div>
                  <button onClick={()=>{navigator.clipboard.writeText(generatedKey);setGeneratedKey(null)}} className="btn-primary" style={{ marginTop:8 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Kopieren & Schließen
                  </button>
                </div>
              )}
              {apiKeys.map(k => (
                <div key={k.id} className="webhook-row">
                  <div style={{ width:7,height:7,borderRadius:'50%',background:'#10B981',flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13,fontWeight:600,color:'#0F172A',margin:0 }}>{k.name}</p>
                    <p style={{ fontSize:11,color:'#94A3B8',margin:'1px 0 0',fontFamily:'monospace' }}>{k.key_prefix}…</p>
                  </div>
                  {k.last_used && <span style={{ fontSize:11,color:'#94A3B8' }}>{new Date(k.last_used).toLocaleDateString('de')}</span>}
                  <button onClick={()=>revokeKey(k.id)} className="btn-danger" style={{ fontSize:11 }}>Widerrufen</button>
                </div>
              ))}
              <div style={{ display:'flex',gap:8,borderTop:apiKeys.length?'1px solid #F1F5F9':'none',paddingTop:apiKeys.length?10:0 }}>
                <input value={newKeyName} onChange={e=>setNewKeyName(e.target.value)} placeholder="Key-Name (z.B. Zapier)" className="inp" style={{ flex:1,fontSize:14 }}/>
                <button onClick={createApiKey} disabled={intBusy||!newKeyName} className="btn-primary">
                  {intBusy?'…':'+ Key erstellen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      {/* Right column — info panel (desktop only) */}
      <div className="hide-mobile" style={{ width:300, flexShrink:0, position:'sticky', top:36, alignSelf:'flex-start' }}>
        <SettingsRightPanel />
      </div>
    </div>
  )
}

function SaveBtn({ saving, saved, onClick }: { saving:boolean; saved:'ok'|'err'|null; onClick:()=>void }) {
  return (
    <button onClick={onClick} disabled={saving} className="btn-primary" style={{ alignSelf:'flex-start', marginTop:4 }}>
      {saving
        ? <><span style={{ width:13,height:13,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite' }}/>Speichert…</>
        : saved==='ok'
          ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>Gespeichert!</>
          : saved==='err'
            ? '⚠ Fehler — erneut versuchen'
            : 'Speichern'}
    </button>
  )
}
