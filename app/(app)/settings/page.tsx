'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import SettingsRightPanel from '@/components/SettingsRightPanel'
import { broadcastProfileSync } from '@/lib/profile-sync'
import { getDensityMode, getFontMode, getTheme, setDensityMode, setFontMode, setTheme } from '@/lib/theme'
import type { DensityMode, FontMode, ThemeMode } from '@/lib/theme'
import { getVoicePreferences, setVoicePreferences } from '@/lib/voice'
import type { VoicePreferences } from '@/lib/voice'

const INDUSTRIES = ['Technologie & Software','E-Commerce & Retail','Marketing & Werbung','Finanzen & Versicherung','Gesundheit & Medizin','Bildung & E-Learning','Immobilien & Bau','Medien & Entertainment','Logistik & Transport','Beratung & Services','Gastronomie & Tourismus','Sonstiges']
const SIZES = [{v:'freelancer',l:'Freelancer'},{v:'1-10',l:'1–10'},{v:'10-50',l:'10–50'},{v:'50-200',l:'50–200'},{v:'200+',l:'200+'}]
const LEGAL = ['GmbH','UG (haftungsbeschränkt)','AG','GbR','Einzelunternehmen','Freiberufler','OHG','KG','GmbH & Co. KG','e.K.','Sonstiges']
type Tab = 'profile'|'workspace'|'company'|'appearance'|'ai'|'skills'|'members'|'security'|'billing'|'integrations'|'audit'

const SKILL_CATALOG = [
  // Frontend
  'React','Next.js','Vue','Svelte','TypeScript','Tailwind CSS','Figma',
  // Backend
  'Node.js','Python','Go','Rust','Supabase','PostgreSQL','REST APIs','GraphQL',
  // Mobile
  'Swift','SwiftUI','Kotlin','React Native','Flutter',
  // AI / Data
  'OpenAI / Anthropic API','Vector DBs','Prompt Engineering','LangChain','RAG',
  // DevOps
  'Vercel','AWS','Docker','GitHub Actions',
  // Design
  'UI Design','UX Research','Branding','Motion Design',
  // Languages
  'Deutsch','English','Français','Español',
]
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

  // skills/availability (used by Tagro AI for dev matching)
  const [bio,        setBio]        = useState('')
  const [skills,     setSkills]     = useState<string[]>([])
  const [hourlyRate, setHourlyRate] = useState('')
  const [availability, setAvailability] = useState<'full_time'|'part_time'|'on_demand'|'unavailable'>('full_time')
  const [timezone,   setTimezone]   = useState('Europe/Berlin')
  const [skillsSaving, setSkillsSaving] = useState(false)
  const [skillsSaved,  setSkillsSaved]  = useState<'ok'|'err'|null>(null)

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
  const [pwdOtp,    setPwdOtp]    = useState('')
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

  // appearance + AI preferences
  const [themeMode, setThemeModeState] = useState<ThemeMode>('read')
  const [fontMode, setFontModeState] = useState<FontMode>('aeonik')
  const [densityMode, setDensityModeState] = useState<DensityMode>('comfortable')
  const [voicePrefs, setVoicePrefs] = useState<VoicePreferences>(() => getVoicePreferences())

  // ui
  const [tab,     setTab]     = useState<Tab>('profile')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState<'ok'|'err'|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sb = createClient()

  // ── LOAD ──────────────────────────────────────────
  useEffect(() => {
    setThemeModeState(getTheme())
    setFontModeState(getFontMode())
    setDensityModeState(getDensityMode())
    setVoicePrefs(getVoicePreferences())
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
        setBio(p.bio??''); setSkills(Array.isArray(p.skills) ? p.skills : [])
        setHourlyRate(p.hourly_rate ? String(p.hourly_rate) : '')
        if (['full_time','part_time','on_demand','unavailable'].includes(p.availability)) setAvailability(p.availability)
        if (p.timezone) setTimezone(p.timezone)
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
      broadcastProfileSync({
        firstName: firstName.trim() || null,
        fullName: displayName,
      })
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
      broadcastProfileSync({ avatarUrl: freshUrl })
    } catch (e) { console.error('Avatar error:', e) }
    setUploading(false)
  }

  // ── PASSWORD via email verification ──────────────────
  const [pwdStep, setPwdStep] = useState<'form'|'sent'>('form')

  async function changePassword() {
    if (newPwd !== confPwd) { setPwdMsg({ t:'err', m:'Passwörter stimmen nicht überein.' }); return }
    if (newPwd.length < 8) { setPwdMsg({ t:'err', m:'Mindestens 8 Zeichen erforderlich.' }); return }
    setPwdSaving(true); setPwdMsg(null)
    // Step 1: Send OTP to email for verification
    const { error: otpErr } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    })
    setPwdSaving(false)
    if (otpErr) { setPwdMsg({ t:'err', m: otpErr.message }); return }
    // Store new password temporarily and show confirmation step
    setPwdStep('sent')
    setPwdMsg({ t:'ok', m:`Bestätigungslink wurde an ${email} gesendet. Klicke auf den Link um dein Passwort zu ändern.` })
  }

  async function confirmPasswordChange(otp: string) {
    if (!otp || otp.length < 6) { setPwdMsg({ t:'err', m:'Bitte gib den 6-stelligen Code ein.' }); return }
    setPwdSaving(true); setPwdMsg(null)
    // Verify OTP then update password
    const { error: verifyErr } = await sb.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (verifyErr) { setPwdMsg({ t:'err', m:'Ungültiger Code. Bitte erneut versuchen.' }); setPwdSaving(false); return }
    const { error: updateErr } = await sb.auth.updateUser({ password: newPwd })
    setPwdSaving(false)
    if (updateErr) { setPwdMsg({ t:'err', m: updateErr.message }); return }
    // Log security event
    await sb.from('security_events').insert({ user_id: uid, event_type:'password_changed', metadata:{ method:'otp_email' } })
    setPwdMsg({ t:'ok', m:'✓ Passwort erfolgreich geändert.' })
    setNewPwd(''); setConfPwd(''); setPwdStep('form')
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
  const settingsNav = [
    { group:'Account', items:[
      { k:'profile' as Tab, l:'Profil' },
      { k:'workspace' as Tab, l:'Workspace' },
      { k:'company' as Tab, l:'Unternehmen' },
    ]},
    { group:'System', items:[
      { k:'appearance' as Tab, l:'Design & Darstellung' },
      { k:'ai' as Tab, l:'Tagro AI & Audio' },
      ...(role==='dev'||role==='admin' ? [{ k:'skills' as Tab, l:'Developer Profil' }] : []),
    ]},
    { group:'Administration', items:[
      { k:'members' as Tab, l:'Mitglieder & Rollen' },
      { k:'security' as Tab, l:'Sicherheit' },
      { k:'billing' as Tab, l:'Abrechnung & Plan' },
      { k:'integrations' as Tab, l:'Integrationen' },
      { k:'audit' as Tab, l:'Audit Log' },
    ]},
  ]

  if (loading) return (
    <div style={{ display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh' }}>
      <div style={{ width:28,height:28,border:'2px solid #E2E8F0',borderTopColor:'var(--text)',borderRadius:'50%',animation:'spin .8s linear infinite' }} />
    </div>
  )

  return (
    <>
    <div className="page-content-full settings-canvas" style={{ width:'100%' }}>
    <div className="settings-hero">
      <div>
        <p className="settings-kicker">Client Workspace Administration</p>
        <h1 className="settings-title">Einstellungen</h1>
        <p className="settings-sub">Verwalte Profil, Workspace, Design, Tagro Audio, Sicherheit und Integrationen an einem ruhigen Ort.</p>
      </div>
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <span className="chip chip-green" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 10px' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)' }} />
          Workspace aktiv
        </span>
        <button className="btn-ghost" onClick={() => setTab('audit')}>Letzte Änderungen</button>
      </div>
    </div>
    <div className="settings-shell">
      <nav className="settings-nav" aria-label="Einstellungen Navigation">
        {settingsNav.map((section) => (
          <div key={section.group}>
            <p className="settings-nav-label">{section.group}</p>
            {section.items.map((item) => (
              <button
                key={item.k}
                type="button"
                className={`settings-nav-btn ${tab === item.k ? 'is-active' : ''}`}
                onClick={() => setTab(item.k)}
              >
                <span className="settings-nav-dot" />
                <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.l}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Main column — settings forms */}
      <div className="settings-main">
      <style>{`
        .settings-shell { display:grid; grid-template-columns:216px minmax(0,1fr) 300px; gap:18px; align-items:start; }
        .settings-nav { position:sticky; top:24px; display:flex; flex-direction:column; gap:3px; padding:10px; border-radius:18px; background:color-mix(in srgb, var(--surface) 80%, transparent); border:1px solid color-mix(in srgb, var(--border) 76%, transparent); box-shadow:0 18px 48px rgba(0,0,0,.04); backdrop-filter:blur(22px) saturate(160%); -webkit-backdrop-filter:blur(22px) saturate(160%); }
        .settings-nav-label { margin:10px 10px 6px; color:var(--text-muted); font-size:10px; font-weight:760; letter-spacing:.1em; text-transform:uppercase; }
        .settings-nav-btn { display:flex; align-items:center; gap:9px; min-height:34px; padding:0 10px; border-radius:11px; color:var(--text-secondary); background:transparent; font:inherit; font-size:12.5px; font-weight:620; text-align:left; transition:background .16s cubic-bezier(.16,1,.3,1), color .16s cubic-bezier(.16,1,.3,1), transform .16s cubic-bezier(.16,1,.3,1); }
        .settings-nav-btn:hover { background:color-mix(in srgb, var(--surface-2) 84%, transparent); color:var(--text); }
        .settings-nav-btn.is-active { background:var(--surface-2); color:var(--text); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--border) 58%, transparent); }
        .settings-nav-dot { width:6px; height:6px; border-radius:999px; background:var(--text-muted); opacity:.35; flex-shrink:0; }
        .settings-nav-btn.is-active .settings-nav-dot { background:var(--accent); opacity:1; }
        .settings-overview { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin:0 0 14px; }
        .settings-metric { min-height:76px; border-radius:18px; background:color-mix(in srgb, var(--surface) 86%, transparent); border:1px solid color-mix(in srgb, var(--border) 72%, transparent); padding:14px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 10px 30px rgba(0,0,0,.032); }
        .settings-metric span { color:var(--text-muted); font-size:10.5px; font-weight:720; letter-spacing:.06em; text-transform:uppercase; }
        .settings-metric strong { color:var(--text); font-size:20px; line-height:1; letter-spacing:-.04em; }
        .s-card { background:color-mix(in srgb, var(--surface) 88%, transparent);border:1px solid color-mix(in srgb, var(--border) 76%, transparent);border-radius:18px;overflow:hidden;box-shadow:0 16px 42px rgba(0,0,0,.035);margin-bottom:14px;backdrop-filter:blur(18px) saturate(150%);-webkit-backdrop-filter:blur(18px) saturate(150%); }
        .s-hd { padding:18px 22px 14px;border-bottom:1px solid color-mix(in srgb, var(--border) 54%, transparent);background:transparent;display:flex;align-items:center;justify-content:space-between;gap:16px; }
        .s-hd-label { font-size:10.5px;font-weight:760;color:var(--text-muted);letter-spacing:.105em;text-transform:uppercase; }
        .s-bd { padding:20px 22px 22px;display:flex;flex-direction:column;gap:15px; }
        .inp { width:100%;padding:11px 14px;background:color-mix(in srgb, var(--inp) 88%, transparent);border:1px solid var(--inp-border);border-radius:13px;font-size:14px;outline:none;color:var(--text);box-sizing:border-box;font-family:inherit;font-weight:560;transition:border-color .15s,box-shadow .15s,background .15s; }
        .inp:focus { border-color:var(--inp-focus-border);background:var(--inp-focus);box-shadow:0 0 0 3px color-mix(in srgb, var(--focus-ring) 38%, transparent); }
        .inp:disabled { background:var(--card);color:var(--text-muted);cursor:not-allowed; }
        .inp::placeholder { color:var(--text-muted);opacity:.7; }
        .txta { width:100%;padding:11px 14px;background:color-mix(in srgb, var(--inp) 88%, transparent);border:1px solid var(--inp-border);border-radius:13px;font-size:14px;outline:none;color:var(--text);box-sizing:border-box;resize:vertical;min-height:96px;font-family:inherit;font-weight:560;transition:all .15s;line-height:1.6; }
        .txta:focus { border-color:var(--inp-focus-border);background:var(--inp-focus);box-shadow:0 0 0 3px color-mix(in srgb, var(--focus-ring) 38%, transparent); }
        .sel-wrap { position:relative; }
        .sel { width:100%;padding:11px 38px 11px 14px;background:color-mix(in srgb, var(--inp) 88%, transparent);border:1px solid var(--inp-border);border-radius:13px;font-size:14px;outline:none;color:var(--text);box-sizing:border-box;cursor:pointer;font-family:inherit;font-weight:560;appearance:none;transition:all .15s; }
        .sel:focus { border-color:var(--inp-focus-border);background:var(--inp-focus); }
        .sel-arr { position:absolute;right:13px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--text-muted); }
        .btn-primary { display:inline-flex;align-items:center;gap:8px;padding:9px 16px;background:var(--btn-prim);color:var(--btn-prim-text);border:none;border-radius:12px;font-size:12.5px;font-weight:720;cursor:pointer;font-family:inherit;box-shadow:var(--shadow-sm);transition:opacity .15s,transform .15s,box-shadow .15s; }
        .btn-primary:hover { opacity:.9;transform:translateY(-1px);box-shadow:var(--shadow); }
        .btn-primary:disabled { opacity:.4;cursor:default;transform:none; }
        .btn-ghost { display:inline-flex;align-items:center;gap:7px;padding:8px 13px;background:transparent;color:var(--text-secondary);border:1px solid var(--border);border-radius:11px;font-size:12px;font-weight:650;cursor:pointer;font-family:inherit;transition:all .15s; }
        .btn-ghost:hover { background:var(--card);border-color:var(--border-strong); }
        .btn-danger { display:inline-flex;align-items:center;gap:6px;padding:7px 12px;background:var(--red-bg);color:var(--red);border:1px solid color-mix(in srgb, var(--red) 52%, transparent);border-radius:10px;font-size:12px;font-weight:680;cursor:pointer;font-family:inherit;transition:all .15s;opacity:.9; }
        .btn-danger:hover { opacity:1; }
        .lbl { font-size:11.5px;font-weight:720;color:var(--text-secondary);display:block;margin-bottom:6px;letter-spacing:.01em; }
        .row2 { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .row3 { display:grid;grid-template-columns:80px 1fr;gap:8px; }
        .tog { width:44px;height:24px;border-radius:12px;position:relative;cursor:pointer;transition:background .2s;border:none;flex-shrink:0; }
        .tog-th { position:absolute;top:2px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:left .18s cubic-bezier(.4,0,.2,1); }
        .tab-row { display:none; }
        .tab-btn { flex:1;padding:9px 8px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:500;font-family:inherit;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:6px; }
        .tab-on  { background:var(--surface);color:var(--text);font-weight:700;box-shadow:var(--shadow-xs); }
        .tab-off { background:transparent;color:var(--text-muted); }
        .int-card { background:color-mix(in srgb, var(--card) 72%, transparent);border:1px solid var(--border);border-radius:14px;padding:14px 16px;display:flex;gap:13px;align-items:center;transition:all .15s; }
        .int-card:hover { border-color:var(--border-strong);background:var(--surface);box-shadow:var(--shadow-xs); }
        .int-logo { width:42px;height:42px;border-radius:11px;background:var(--surface-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .dev-card { background:color-mix(in srgb, var(--card) 76%, transparent);border:1px solid var(--border);border-radius:13px;padding:12px 15px;display:flex;gap:12px;align-items:center; }
        .webhook-row { background:color-mix(in srgb, var(--card) 76%, transparent);border:1px solid var(--border);border-radius:13px;padding:11px 15px;display:flex;gap:10px;align-items:center; }
        .chip { display:inline-block;padding:2px 8px;border-radius:6px;font-size:10.5px;font-weight:700;letter-spacing:.04em; }
        .chip-green { background:var(--green-bg);color:var(--green-dark);border:1px solid var(--green-border); }
        .chip-gray { background:var(--surface-2);color:var(--text-secondary);border:1px solid var(--border); }
        .chip-blue { background:var(--surface-2);color:var(--text);border:1px solid var(--border); }
        .ai-badge { display:inline-flex;align-items:center;gap:4px;padding:3px 9px;background:var(--card);border:1px solid var(--border);border-radius:6px;font-size:10px;font-weight:700;color:var(--text-secondary);letter-spacing:.04em; }
        .key-box { background:var(--surface-2);border-radius:10px;padding:12px 16px;font-family:'SF Mono',monospace;font-size:12.5px;color:var(--green);word-break:break-all;letter-spacing:.04em;line-height:1.6; }
        .pref-grid { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px; }
        .pref-tile { border:1px solid var(--border);border-radius:15px;background:color-mix(in srgb, var(--card) 78%, transparent);padding:14px;text-align:left;min-height:96px;transition:background .16s,border-color .16s,transform .16s; }
        .pref-tile:hover { background:var(--surface-2);transform:translateY(-1px); }
        .pref-tile.is-active { border-color:var(--text);box-shadow:inset 0 0 0 1px var(--text); }
        .pref-tile strong { display:block;color:var(--text);font-size:13.5px;margin-bottom:5px; }
        .pref-tile span { display:block;color:var(--text-muted);font-size:11.5px;line-height:1.45; }
        .member-table { border:1px solid color-mix(in srgb, var(--border) 58%, transparent); border-radius:16px; overflow:hidden; background:color-mix(in srgb, var(--card) 56%, transparent); }
        .member-row { display:grid; grid-template-columns:minmax(190px,1.45fr) 112px 112px 124px 104px 42px; gap:14px; align-items:center; min-height:56px; padding:0 14px; border-bottom:1px solid color-mix(in srgb, var(--border) 36%, transparent); }
        .member-row:last-child { border-bottom:0; }
        .member-row.is-head { min-height:40px; color:var(--text-muted); font-size:10px; font-weight:780; letter-spacing:.08em; text-transform:uppercase; }
        .member-avatar { width:28px; height:28px; border-radius:999px; display:flex; align-items:center; justify-content:center; background:var(--surface-2); border:1px solid var(--border); font-size:11px; font-weight:800; color:var(--text); flex-shrink:0; }
        .seat-pill { display:inline-flex; width:max-content; align-items:center; gap:6px; padding:4px 8px; border-radius:999px; background:var(--surface-2); border:1px solid var(--border); color:var(--text-secondary); font-size:11px; font-weight:700; }
        .audit-row { display:grid;grid-template-columns:124px minmax(0,1fr) 96px;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid color-mix(in srgb, var(--border) 42%, transparent); }
        .audit-row:last-child { border-bottom:0; }
        @media(max-width:1180px) { .settings-shell { grid-template-columns:190px minmax(0,1fr); } .settings-side { display:none; } }
        @media(max-width:820px) { .settings-shell { grid-template-columns:1fr; } .settings-nav { position:static; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); } .settings-nav-label { grid-column:1/-1; } .settings-overview,.pref-grid { grid-template-columns:1fr 1fr; } }
        @media(max-width:980px) { .member-row { grid-template-columns:minmax(180px,1fr) 96px 96px 42px; } .member-row > :nth-child(4), .member-row > :nth-child(5) { display:none; } }
        @media(max-width:600px) { .row2,.row3,.settings-overview,.pref-grid { grid-template-columns:1fr; } .member-row { grid-template-columns:minmax(0,1fr) 42px; } .member-row > :nth-child(2), .member-row > :nth-child(3), .member-row > :nth-child(4), .member-row > :nth-child(5) { display:none; } }
        @keyframes spin { to{transform:rotate(360deg);} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);} }
        .fade-in { animation:fadeUp .25s ease both; }
      `}</style>

      <div className="settings-overview animate-fade-up-1">
        {[
          { label:'Rolle', value: role === 'dev' ? 'Developer' : role === 'admin' ? 'Admin' : 'Client' },
          { label:'Theme', value: themeMode === 'read' ? 'Read' : themeMode === 'dark' ? 'Dark' : themeMode === 'light' ? 'Light' : themeMode },
          { label:'Audio', value: voicePrefs.enabled ? 'Manuell' : 'Aus' },
          { label:'Sicherheit', value: devices.length ? `${devices.length} Geräte` : 'Aktiv' },
        ].map((metric) => (
          <div key={metric.label} className="settings-metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      {/* ── AVATAR CARD ──────────────────────────────────── */}
      <div className="s-card animate-fade-up-1" style={{ marginBottom:14 }}>
        <div style={{ padding:'20px 22px',display:'flex',gap:18,alignItems:'center',flexWrap:'wrap' }}>
          {/* Avatar */}
          <div style={{ position:'relative',flexShrink:0 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ width:72,height:72,borderRadius:'50%',cursor:'pointer',overflow:'hidden',position:'relative',border:'3px solid var(--surface)',boxShadow:'0 0 0 2px var(--border), var(--shadow)',boxSizing:'border-box',flexShrink:0 }}
            >
              {uploading ? (
                <div style={{ width:'100%',height:'100%',background:'var(--surface-2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <div style={{ width:20,height:20,border:'2.5px solid #CBD5E1',borderTopColor:'var(--text)',borderRadius:'50%',animation:'spin .7s linear infinite' }} />
                </div>
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',display:'block' }} />
              ) : (
                <div style={{ width:'100%',height:'100%',background:'var(--surface-2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:700,color:'var(--text)' }}>{initial}</div>
              )}
            </div>
            {/* Edit badge */}
            <div onClick={() => fileRef.current?.click()} style={{ position:'absolute',bottom:1,right:1,width:22,height:22,background:'var(--accent)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'2px solid var(--surface)',boxShadow:'0 2px 8px rgba(0,0,0,.2)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={e => { const f=e.target.files?.[0]; if(f) uploadAvatar(f); e.target.value='' }} />

          {/* User info */}
          <div style={{ flex:1,minWidth:140 }}>
            <p style={{ fontSize:17,fontWeight:700,color:'var(--text)',margin:'0 0 2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:220 }}>
              {displayName}
            </p>
            <p style={{ fontSize:12.5,color:'var(--text-muted)',margin:'0 0 8px',textTransform:'capitalize' }}>
              {role}{joinDate && ` · Seit ${new Date(joinDate).toLocaleDateString('de',{month:'short',year:'numeric'})}`}
            </p>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap',alignItems:'center' }}>
              <span className="chip chip-green" style={{ display:'flex',alignItems:'center',gap:5 }}>
                <span style={{ width:5,height:5,borderRadius:'50%',background:'var(--green)',animation:'pulse 2s infinite' }} />
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
          { k:'profile',      l:'Profil',        icon:'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6', show: true },
          { k:'skills',       l:'Skills',        icon:'M13 2L3 14h9l-1 8 10-12h-9l1-8z',                                show: role==='dev'||role==='admin' },
          { k:'company',      l:'Unternehmen',   icon:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',                  show: true },
          { k:'security',     l:'Sicherheit',    icon:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',                     show: true },
          { k:'integrations', l:'Integrationen', icon:'M18 20V10M12 20V4M6 20v-6',                                       show: true },
        ] as const).filter(t => t.show).map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`tab-btn ${tab===t.k?'tab-on':'tab-off'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tab===t.k?2.2:1.7} strokeLinecap="round" strokeLinejoin="round"><path d={t.icon}/></svg>
            <span className="hide-mobile">{t.l}</span>
          </button>
        ))}
      </div>

      {tab==='workspace' && (
        <div className="fade-in">
          <div className="s-card">
            <div className="s-hd">
              <div>
                <span className="s-hd-label">WORKSPACE GENERAL</span>
                <p style={{ fontSize:12,color:'var(--text-muted)',margin:'4px 0 0' }}>Basisdaten für deinen Festag Arbeitskontext.</p>
              </div>
              <span className="chip chip-green">Client Panel</span>
            </div>
            <div className="s-bd">
              <div className="row2">
                <div><label className="lbl">Workspace Name</label><input value={compName || displayName} onChange={e=>setCompName(e.target.value)} placeholder="Stefan Workspace" className="inp"/></div>
                <div>
                  <label className="lbl">Workspace Typ</label>
                  <div className="sel-wrap">
                    <select className="sel" value={compSize || 'personal'} onChange={e=>setCompSize(e.target.value)}>
                      <option value="personal">Personal / Founder</option>
                      <option value="agency">Agency Workspace</option>
                      <option value="enterprise">Enterprise Workspace</option>
                    </select>
                    <span className="sel-arr">⌄</span>
                  </div>
                </div>
              </div>
              <div><label className="lbl">Workspace Beschreibung</label><textarea value={compDesc} onChange={e=>setCompDesc(e.target.value)} className="txta" placeholder="Wofür nutzt du Festag? Projekte, Kunden, interne Tools oder Team-Delivery…" /></div>
              <div className="pref-grid">
                {[
                  ['Projektsteuerung','Projekte, Tasks und Statusberichte als täglicher Kern.'],
                  ['Client Transparenz','Berichte, Entscheidungen und verständliche Updates.'],
                  ['Team Execution','Developer, Rollen und technische Übergaben später in Teams.'],
                ].map(([title, text]) => (
                  <div key={title} className="pref-tile">
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <SaveBtn saving={saving} saved={saved} onClick={save} />
            </div>
          </div>
        </div>
      )}

      {tab==='appearance' && (
        <div className="fade-in">
          <div className="s-card">
            <div className="s-hd">
              <div>
                <span className="s-hd-label">DESIGN SYSTEM</span>
                <p style={{ fontSize:12,color:'var(--text-muted)',margin:'4px 0 0' }}>Theme, Schrift und Dichte wirken global im Client Workspace.</p>
              </div>
            </div>
            <div className="s-bd">
              <div>
                <label className="lbl">Interface Theme</label>
                <div className="pref-grid">
                  {([
                    { mode:'light' as ThemeMode, title:'Light', desc:'Klar, hell und modern.' },
                    { mode:'dark' as ThemeMode, title:'Dark', desc:'Ruhige Production-Control-Ästhetik.' },
                    { mode:'read' as ThemeMode, title:'Read Mode', desc:'Warm, editorial und ideal für Berichte.' },
                    { mode:'pure-light' as ThemeMode, title:'Pure Light', desc:'Reduzierter Weißraum für Tabellen.' },
                    { mode:'magic-blue' as ThemeMode, title:'Magic Blue', desc:'Technischer, dunkler AI-Modus.' },
                    { mode:'classic-dark' as ThemeMode, title:'Classic Dark', desc:'Kontraststark und ruhig.' },
                  ]).map((option) => (
                    <button
                      key={option.mode}
                      type="button"
                      className={`pref-tile ${themeMode === option.mode ? 'is-active' : ''}`}
                      onClick={() => {
                        setThemeModeState(option.mode)
                        setTheme(option.mode)
                      }}
                    >
                      <strong>{option.title}</strong>
                      <span>{option.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="row2">
                <div>
                  <label className="lbl">Schrift</label>
                  <div className="pref-grid" style={{ gridTemplateColumns:'repeat(2,minmax(0,1fr))' }}>
                    {([
                      { mode:'aeonik' as FontMode, title:'Aeonik', desc:'Festag Standard. Editorial und eigenständig.' },
                      { mode:'sf-pro' as FontMode, title:'SF Pro', desc:'Apple-artig, systemnah und kompakt.' },
                    ]).map((option) => (
                      <button
                        key={option.mode}
                        type="button"
                        className={`pref-tile ${fontMode === option.mode ? 'is-active' : ''}`}
                        onClick={() => {
                          setFontModeState(option.mode)
                          setFontMode(option.mode)
                        }}
                      >
                        <strong>{option.title}</strong>
                        <span>{option.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="lbl">Dichte</label>
                  <div className="pref-grid" style={{ gridTemplateColumns:'repeat(2,minmax(0,1fr))' }}>
                    {([
                      { mode:'comfortable' as DensityMode, title:'Comfortable', desc:'Mehr Luft für Projektarbeit.' },
                      { mode:'compact' as DensityMode, title:'Compact', desc:'Dichter für Tabellen und Listen.' },
                    ]).map((option) => (
                      <button
                        key={option.mode}
                        type="button"
                        className={`pref-tile ${densityMode === option.mode ? 'is-active' : ''}`}
                        onClick={() => {
                          setDensityModeState(option.mode)
                          setDensityMode(option.mode)
                        }}
                      >
                        <strong>{option.title}</strong>
                        <span>{option.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab==='ai' && (
        <div className="fade-in">
          <div className="s-card">
            <div className="s-hd">
              <div>
                <span className="s-hd-label">TAGRO AI & AUDIO</span>
                <p style={{ fontSize:12,color:'var(--text-muted)',margin:'4px 0 0' }}>Audio ist optional, manuell und nie Always-Listening.</p>
              </div>
              <span className="chip chip-gray">Production Intelligence</span>
            </div>
            <div className="s-bd">
              {([
                ['enabled','Audio Briefings erlauben','Tagro darf kurze Executive Briefings abspielen.'],
                ['statusReportsEnabled','Statusberichte anhören','Statusberichte werden als kurze Zusammenfassung vorgelesen.'],
                ['projectBriefingsEnabled','Projektbriefings anhören','Projektfortschritt, Blocker und nächste Schritte als Audio.'],
                ['speechInputEnabled','Spracheingabe erlauben','Vorbereitet, standardmäßig aus. Kein Always Listening.'],
              ] as const).map(([key, title, desc]) => {
                const on = Boolean(voicePrefs[key])
                return (
                  <div key={key} className="dev-card" style={{ justifyContent:'space-between' }}>
                    <div>
                      <p style={{ margin:0, color:'var(--text)', fontSize:13.5, fontWeight:700 }}>{title}</p>
                      <p style={{ margin:'3px 0 0', color:'var(--text-muted)', fontSize:12 }}>{desc}</p>
                    </div>
                    <button className="tog" onClick={() => {
                      const next = setVoicePreferences({ [key]: !on } as Partial<VoicePreferences>)
                      setVoicePrefs(next)
                    }} style={{ background:on?'var(--text)':'var(--border-strong)' }}>
                      <span className="tog-th" style={{ left:on?22:2, background:on?'var(--bg)':'#fff' }} />
                    </button>
                  </div>
                )
              })}
              <div className="row2">
                <div>
                  <label className="lbl">Auto-Briefings</label>
                  <div className="sel-wrap">
                    <select className="sel" value={voicePrefs.autoBriefings} onChange={e => {
                      const next = setVoicePreferences({ autoBriefings: e.target.value as VoicePreferences['autoBriefings'] })
                      setVoicePrefs(next)
                    }}>
                      <option value="off">Aus</option>
                      <option value="manual">Nur manuell</option>
                      <option value="daily_prepared">Täglich vorbereitet</option>
                    </select>
                    <span className="sel-arr">⌄</span>
                  </div>
                </div>
                <div>
                  <label className="lbl">Sprechtempo</label>
                  <input className="inp" type="range" min="0.75" max="1.25" step="0.05" value={voicePrefs.rate} onChange={e => {
                    const next = setVoicePreferences({ rate: Number(e.target.value) })
                    setVoicePrefs(next)
                  }} />
                  <p style={{ margin:'4px 0 0', color:'var(--text-muted)', fontSize:11 }}>{voicePrefs.rate.toFixed(2)}x</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <p style={{ fontSize:11,color:'var(--text-muted)',marginTop:5 }}>E-Mail kann nicht geändert werden.</p>
              </div>

              {/* Notifications inline */}
              <div style={{ borderTop:'1px solid var(--border)',paddingTop:16 }}>
                <p style={{ fontSize:10.5,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.1em',marginBottom:12 }}>BENACHRICHTIGUNGEN</p>
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
                        <p style={{ fontSize:13.5,fontWeight:600,color:'var(--text)',margin:0 }}>{n.l}</p>
                        <p style={{ fontSize:11.5,color:'var(--text-muted)',margin:'2px 0 0' }}>{n.d}</p>
                      </div>
                      <button className="tog" onClick={()=>toggleNotif(n.k as keyof Notifs)} style={{ background:on?'var(--green)':'var(--border-strong)' }}>
                        <div className="tog-th" style={{ left:on?22:2 }} />
                      </button>
                    </div>
                  )
                })}
                {pushSup && !pushOk && (
                  <div style={{ marginTop:14,background:'var(--accent)',borderRadius:12,padding:'13px 16px',display:'flex',gap:13,alignItems:'center' }}>
                    <p style={{ fontSize:13,fontWeight:600,color:'var(--accent-text)',flex:1,margin:0,lineHeight:1.4 }}>Push-Benachrichtigungen aktivieren</p>
                    <button onClick={enablePush} style={{ padding:'7px 14px',background:'var(--btn-prim)',color:'var(--btn-prim-text)',border:'none',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0 }}>Aktivieren</button>
                  </div>
                )}
                {pushOk && <div style={{ marginTop:10,padding:'10px 14px',background:'var(--green-bg)',border:'1px solid var(--green-border)',borderRadius:10,fontSize:13,color:'var(--green-dark)',fontWeight:600 }}>✓ Push aktiv auf diesem Gerät</div>}
              </div>

              <SaveBtn saving={saving} saved={saved} onClick={save} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: SKILLS & VERFÜGBARKEIT (dev/admin only)
      ══════════════════════════════════════════════════ */}
      {tab==='skills' && (
        <div className="fade-in">
          <div className="s-card">
            <div className="s-hd">
              <span className="s-hd-label">DEV PROFIL FÜR TAGRO AI</span>
            </div>
            <div className="s-bd">
              <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:'0 0 14px', lineHeight:1.55 }}>
                Tagro nutzt diese Daten, um dich mit passenden Projekten zu matchen. Je präziser, desto bessere Vorschläge.
              </p>

              <div>
                <label className="lbl">Bio · was machst du am liebsten?</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="inp" style={{ resize:'vertical', minHeight:78 }}
                  placeholder="z.B. 'Senior Full-Stack Dev mit Fokus auf SaaS-Plattformen und Stripe-Integrationen. 8 Jahre Erfahrung mit React + Node.'"/>
                <p style={{ fontSize:11, color:'var(--text-muted)', margin:'4px 0 0' }}>
                  {bio.length}/400 — Tagro liest das wie ein Recruiter.
                </p>
              </div>

              <div>
                <label className="lbl">Skills · klick zum Hinzufügen</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                  {skills.map(s => (
                    <button key={s} onClick={() => setSkills(skills.filter(x => x !== s))} style={{ padding:'5px 11px 5px 13px', background:'var(--text)', color:'var(--bg)', border:'none', borderRadius:18, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                      {s}
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  ))}
                  {skills.length === 0 && (
                    <p style={{ fontSize:12, color:'var(--text-muted)', margin:0, fontStyle:'italic' }}>Keine Skills ausgewählt — wähle aus dem Katalog unten.</p>
                  )}
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, padding:10, background:'var(--surface-2)', borderRadius:10 }}>
                  {SKILL_CATALOG.filter(c => !skills.includes(c)).map(s => (
                    <button key={s} onClick={() => setSkills([...skills, s])} style={{ padding:'4px 10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, fontSize:11.5, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="row2">
                <div>
                  <label className="lbl">Stundensatz · €/h</label>
                  <input value={hourlyRate} onChange={e => setHourlyRate(e.target.value.replace(/[^\d.]/g, ''))} placeholder="85" className="inp"/>
                </div>
                <div>
                  <label className="lbl">Verfügbarkeit</label>
                  <select value={availability} onChange={e => setAvailability(e.target.value as any)} className="inp">
                    <option value="full_time">Vollzeit (40h+/Woche)</option>
                    <option value="part_time">Teilzeit (15-30h/Woche)</option>
                    <option value="on_demand">Auf Anfrage</option>
                    <option value="unavailable">Aktuell nicht verfügbar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="lbl">Zeitzone</label>
                <select value={timezone} onChange={e => setTimezone(e.target.value)} className="inp">
                  <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                </select>
              </div>

              <button onClick={async () => {
                setSkillsSaving(true); setSkillsSaved(null)
                const { error } = await sb.from('profiles').update({
                  bio: bio || null,
                  skills,
                  hourly_rate: hourlyRate ? Number(hourlyRate) : null,
                  availability,
                  timezone,
                }).eq('id', uid)
                setSkillsSaving(false)
                setSkillsSaved(error ? 'err' : 'ok')
                setTimeout(() => setSkillsSaved(null), 2400)
              }}
                style={{ marginTop:6, padding:'12px 18px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:11, fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:8 }}>
                {skillsSaving ? 'Speichert…' : skillsSaved === 'ok' ? '✓ Gespeichert' : skillsSaved === 'err' ? 'Fehler' : 'Skills speichern'}
              </button>

              <div style={{ marginTop:14, padding:'12px 14px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10 }}>
                <p style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', letterSpacing:'.07em', margin:'0 0 4px' }}>TAGRO MATCHING</p>
                <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:0, lineHeight:1.55 }}>
                  Mit deinem Profil matched Tagro AI Projekte automatisch nach Stack-Fit, Verfügbarkeit und Stundensatz. Das Match wird im Pool-Modus angezeigt.
                </p>
              </div>
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
                  <span style={{ fontSize:10.5,color:'var(--text-secondary)',fontWeight:700 }}>✦ Wichtig für AI</span>
                </label>
                <textarea value={compDesc} onChange={e=>setCompDesc(e.target.value)} placeholder="Was macht dein Unternehmen? Wer sind deine Kunden? Tagro nutzt diese Infos um Projekte besser zu verstehen und zu planen…" className="txta" style={{ minHeight:100 }}/>
                <p style={{ fontSize:11,color:'var(--text-muted)',marginTop:4 }}>{compDesc.length} Zeichen</p>
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
                {!compWeb && <p style={{ fontSize:11.5,color:'var(--green-dark)',marginTop:5,fontWeight:600 }}>✦ Keine Website? Festag baut sie für dich!</p>}
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
              <div style={{ borderTop:'1px solid var(--border)',paddingTop:16 }}>
                <p style={{ fontSize:10.5,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.1em',marginBottom:12 }}>STEUER & RECHT</p>
                <div className="row2">
                  <div><label className="lbl">USt-IdNr.</label><input value={vat} onChange={e=>setVat(e.target.value)} placeholder="DE123456789" className="inp"/></div>
                  <div><label className="lbl">Steuernummer</label><input value={tax} onChange={e=>setTax(e.target.value)} placeholder="12/345/67890" className="inp"/></div>
                </div>
                <p style={{ fontSize:11,color:'var(--text-muted)',marginTop:6 }}>Für Rechnungen und Verträge. Optional.</p>
              </div>

              <SaveBtn saving={saving} saved={saved} onClick={save} />
            </div>
          </div>
        </div>
      )}

      {tab==='members' && (
        <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="s-card">
            <div className="s-hd">
              <div>
                <span className="s-hd-label">MITGLIEDER & ROLLEN</span>
                <p style={{ fontSize:12,color:'var(--text-muted)',margin:'4px 0 0' }}>Client-seitige Workspace-Zugriffe. Interne Festag-Developer bleiben getrennt.</p>
              </div>
              <button className="btn-primary">Mitglied einladen</button>
            </div>
            <div className="s-bd">
              <div className="pref-grid">
                {[
                  ['Aktive Mitglieder', '1 Owner · 0 Developer · Viewer frei'],
                  ['Seat Logik', 'Aktive Mitarbeit benötigt Seat. Lesen kann eingeschränkt frei bleiben.'],
                  ['Sichtbarkeit', 'Developer sehen nur freigegebene Projekte und technische Kontexte.'],
                ].map(([title, text]) => (
                  <div key={title} className="pref-tile">
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <div className="member-table" role="table" aria-label="Workspace Mitglieder">
                <div className="member-row is-head" role="row">
                  <span>Mitglied</span>
                  <span>Rolle</span>
                  <span>Seat</span>
                  <span>Zugriff</span>
                  <span>Status</span>
                  <span />
                </div>
                {[
                  {
                    name: displayName,
                    mail: email,
                    role: role === 'admin' ? 'Admin' : role === 'dev' ? 'Developer' : 'Owner',
                    seat: 'Aktiv',
                    access: 'Gesamter Workspace',
                    status: 'Online',
                    initials: initial,
                  },
                  {
                    name: 'Tagro Vorschlag',
                    mail: 'Noch nicht eingeladen',
                    role: 'Lead Developer',
                    seat: 'Benötigt',
                    access: 'Projektbasiert',
                    status: 'Entwurf',
                    initials: 'T',
                  },
                  {
                    name: 'Client Viewer',
                    mail: 'Read-only Beispiel',
                    role: 'Viewer',
                    seat: 'Frei',
                    access: 'Status & Dokumente',
                    status: 'Vorlage',
                    initials: 'V',
                  },
                ].map((member) => (
                  <div key={`${member.name}-${member.role}`} className="member-row" role="row">
                    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                      <span className="member-avatar">{member.initials}</span>
                      <div style={{ minWidth:0 }}>
                        <p style={{ margin:0, color:'var(--text)', fontSize:13.5, fontWeight:760, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{member.name}</p>
                        <p style={{ margin:'2px 0 0', color:'var(--text-muted)', fontSize:11.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{member.mail}</p>
                      </div>
                    </div>
                    <span style={{ color:'var(--text-secondary)', fontSize:12.5, fontWeight:680 }}>{member.role}</span>
                    <span className="seat-pill">
                      <span style={{ width:6, height:6, borderRadius:'50%', background:member.seat === 'Aktiv' ? 'var(--green)' : member.seat === 'Benötigt' ? '#F59E0B' : 'var(--text-muted)' }} />
                      {member.seat}
                    </span>
                    <span style={{ color:'var(--text-secondary)', fontSize:12.5, fontWeight:620 }}>{member.access}</span>
                    <span className="chip chip-gray" style={{ width:'max-content' }}>{member.status}</span>
                    <button className="btn-ghost" aria-label={`Aktionen für ${member.name}`} style={{ width:32, height:32, padding:0, justifyContent:'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5h.01M12 12h.01M12 19h.01"/></svg>
                    </button>
                  </div>
                ))}
              </div>

              <div className="dev-card" style={{ alignItems:'flex-start' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop:2, flexShrink:0 }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-5"/>
                </svg>
                <div>
                  <p style={{ margin:0, color:'var(--text)', fontSize:13.5, fontWeight:760 }}>Einladungen bleiben client-seitig.</p>
                  <p style={{ margin:'4px 0 0', color:'var(--text-muted)', fontSize:12.5, lineHeight:1.55 }}>Agency-, Enterprise- und Developer-Zugriffe werden später über Teams und PIN-Flows verfeinert, ohne interne Festag-Operations offenzulegen.</p>
                </div>
              </div>
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
            <div className="s-hd">
              <div>
                <span className="s-hd-label">PASSWORT ÄNDERN</span>
                <p style={{ fontSize:11.5,color:'var(--text-muted)',margin:'3px 0 0' }}>Änderung wird per E-Mail bestätigt</p>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 10px',background:'var(--green-bg)',border:'1px solid var(--green-border)',borderRadius:8 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span style={{ fontSize:10.5,fontWeight:700,color:'var(--green-dark)',letterSpacing:'.04em' }}>VERIFIZIERT</span>
              </div>
            </div>
            <div className="s-bd">
              {pwdStep==='form' ? (
                <>
                  <div style={{ background:'var(--card)',border:'1.5px solid var(--border)',borderRadius:12,padding:'12px 16px',display:'flex',gap:10,alignItems:'flex-start' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0,marginTop:1 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    <p style={{ fontSize:12.5,color:'var(--text-secondary)',margin:0,lineHeight:1.5 }}>
                      Nach dem Absenden erhältst du einen Bestätigungslink an <strong style={{ color:'var(--text)' }}>{email}</strong>. Erst nach Bestätigung wird das Passwort geändert.
                    </p>
                  </div>
                  <div>
                    <label className="lbl">Neues Passwort</label>
                    <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Mindestens 8 Zeichen" className="inp" autoComplete="new-password"/>
                  </div>
                  <div>
                    <label className="lbl">Passwort bestätigen</label>
                    <input type="password" value={confPwd} onChange={e=>setConfPwd(e.target.value)} placeholder="Wiederholen" className="inp" autoComplete="new-password" onKeyDown={e=>e.key==='Enter'&&changePassword()}/>
                  </div>
                  {pwdMsg && (
                    <div style={{ padding:'10px 14px',borderRadius:10,fontSize:13,fontWeight:500,background:pwdMsg.t==='ok'?'var(--green-bg)':'var(--red-bg)',color:pwdMsg.t==='ok'?'var(--green-dark)':'var(--red)',border:`1px solid ${pwdMsg.t==='ok'?'var(--green-border)':'rgba(239,68,68,0.3)'}` }}>{pwdMsg.m}</div>
                  )}
                  <button onClick={changePassword} disabled={pwdSaving||!newPwd||!confPwd} className="btn-primary" style={{ alignSelf:'flex-start' }}>
                    {pwdSaving
                      ? <><span style={{ width:13,height:13,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite' }}/>Sende E-Mail…</>
                      : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Bestätigungs-E-Mail senden</>}
                  </button>
                </>
              ) : (
                <>
                  {/* Sent state — show OTP input */}
                  <div style={{ background:'var(--green-bg)',border:'1.5px solid var(--green-border)',borderRadius:12,padding:'14px 16px',display:'flex',gap:10,alignItems:'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.09 5.18 2 2 0 0 1 4.09 3h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 10.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 17z"/></svg>
                    <div>
                      <p style={{ fontSize:13,fontWeight:600,color:'var(--green-dark)',margin:0 }}>E-Mail gesendet an {email}</p>
                      <p style={{ fontSize:12,color:'var(--green-dark)',margin:'2px 0 0',opacity:.8 }}>Gib den 6-stelligen Code aus der E-Mail ein</p>
                    </div>
                  </div>
                  <div>
                    <label className="lbl">Bestätigungscode (6 Stellen)</label>
                    <input
                      value={pwdOtp}
                      onChange={e=>setPwdOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                      placeholder="000000"
                      className="inp"
                      inputMode="numeric"
                      maxLength={6}
                      style={{ letterSpacing:'0.3em',fontSize:20,textAlign:'center',fontWeight:700 }}
                      onKeyDown={e=>e.key==='Enter'&&confirmPasswordChange(pwdOtp)}
                    />
                  </div>
                  {pwdMsg && (
                    <div style={{ padding:'10px 14px',borderRadius:10,fontSize:13,fontWeight:500,background:pwdMsg.t==='ok'?'var(--green-bg)':'var(--red-bg)',color:pwdMsg.t==='ok'?'var(--green-dark)':'var(--red)',border:`1px solid ${pwdMsg.t==='ok'?'var(--green-border)':'rgba(239,68,68,0.3)'}` }}>{pwdMsg.m}</div>
                  )}
                  <div style={{ display:'flex',gap:8 }}>
                    <button onClick={()=>confirmPasswordChange(pwdOtp)} disabled={pwdSaving||pwdOtp.length<6} className="btn-primary">
                      {pwdSaving
                        ? <><span style={{ width:13,height:13,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite' }}/>Verifiziert…</>
                        : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>Code bestätigen &amp; Passwort ändern</>}
                    </button>
                    <button onClick={()=>{setPwdStep('form');setPwdMsg(null);setPwdOtp('')}} className="btn-ghost">
                      Zurück
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="s-card">
            <div className="s-hd">
              <span className="s-hd-label">AKTIVE GERÄTE</span>
              <span style={{ fontSize:11.5,color:'var(--text-muted)' }}>{devices.length} Gerät{devices.length!==1?'e':''}</span>
            </div>
            <div style={{ padding:'12px 18px',display:'flex',flexDirection:'column',gap:8 }}>
              {devices.length===0
                ? <p style={{ fontSize:13,color:'var(--text-muted)',textAlign:'center',padding:'16px 0',margin:0 }}>Noch keine Geräte</p>
                : devices.map(d => (
                  <div key={d.id} className="dev-card">
                    <div style={{ width:40,height:40,borderRadius:11,background:d.is_current?'var(--green-bg)':'var(--surface-2)',border:`1.5px solid ${d.is_current?'var(--green-border)':'var(--border-strong)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={d.is_current?'var(--green-dark)':'var(--text-muted)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {d.os==='iOS'||d.os==='Android'
                          ? <path d="M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"/>
                          : <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>}
                      </svg>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ fontSize:13,fontWeight:600,color:'var(--text)',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.device_name}</p>
                      <p style={{ fontSize:11,color:'var(--text-muted)',margin:'2px 0 0' }}>Zuletzt: {new Date(d.last_seen).toLocaleDateString('de',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
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

      {tab==='billing' && (
        <div className="fade-in" style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <div className="s-card">
            <div className="s-hd">
              <div>
                <span className="s-hd-label">ABRECHNUNG & PLAN</span>
                <p style={{ fontSize:12,color:'var(--text-muted)',margin:'4px 0 0' }}>Billing bleibt Verwaltung, nicht Daily Navigation.</p>
              </div>
              <span className="chip chip-gray">{role === 'admin' ? 'Admin Zugriff' : 'Workspace Plan'}</span>
            </div>
            <div className="s-bd">
              <div className="pref-grid">
                {[
                  ['Aktueller Plan', role === 'dev' ? 'Developer Access' : 'Client Workspace'],
                  ['Seats', '1 aktiv · Viewer frei'],
                  ['Rechnungen', 'Keine offenen Zahlungen'],
                ].map(([title, text]) => (
                  <div key={title} className="pref-tile">
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <div className="dev-card" style={{ alignItems:'flex-start' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', marginTop:6, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, color:'var(--text)', fontSize:14, fontWeight:750 }}>Seats werden erst für aktive Mitarbeit benötigt.</p>
                  <p style={{ margin:'4px 0 0', color:'var(--text-muted)', fontSize:12.5, lineHeight:1.55 }}>Viewer, Statusberichte und Leserechte bleiben ruhig getrennt von aktiver Team-Execution.</p>
                </div>
                <Link href="/billing" className="btn-primary">Billing öffnen</Link>
              </div>
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
                <p style={{ fontSize:11.5,color:'var(--text-muted)',margin:'3px 0 0' }}>Fortschrittlich & bald verfügbar — Verbinde dein Festag-Konto</p>
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
                  <div className="int-logo" style={{ background:s.name==='Notion'?'var(--accent)':'var(--surface-2)',flexShrink:0 }}>
                    <img src={s.logo} alt={s.name} style={{ width:24,height:24,objectFit:'contain' }}/>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:3 }}>
                      <p style={{ fontSize:13.5,fontWeight:700,color:'var(--text)',margin:0 }}>{s.name}</p>
                      <span className="chip chip-blue" style={{ fontSize:9.5 }}>Kommt</span>
                    </div>
                    <p style={{ fontSize:12,color:'var(--text-secondary)',margin:'0 0 6px',lineHeight:1.4 }}>{s.desc}</p>
                    <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
                      {s.features.map(f => (
                        <span key={f} style={{ fontSize:10.5,color:'var(--text-secondary)',background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:6,padding:'2px 7px',fontWeight:500 }}>{f}</span>
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
              <div><span className="s-hd-label">WEBHOOKS</span><p style={{ fontSize:11.5,color:'var(--text-muted)',margin:'3px 0 0' }}>Events via HTTP POST senden</p></div>
              <span style={{ fontSize:11.5,color:'var(--text-muted)' }}>{webhooks.length} aktiv</span>
            </div>
            <div style={{ padding:'14px 18px',display:'flex',flexDirection:'column',gap:8 }}>
              {webhooks.map(w => (
                <div key={w.id} className="webhook-row">
                  <div style={{ width:7,height:7,borderRadius:'50%',background:w.active?'var(--green)':'var(--border-strong)',flexShrink:0 }} />
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:13,fontWeight:600,color:'var(--text)',margin:0 }}>{w.name}</p>
                    <p style={{ fontSize:11,color:'var(--text-muted)',margin:'1px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{w.url}</p>
                  </div>
                  <button onClick={()=>deleteWebhook(w.id)} className="btn-danger" style={{ fontSize:11,padding:'5px 9px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              ))}
              <div style={{ borderTop:webhooks.length?'1px solid var(--border)':'none',paddingTop:webhooks.length?10:0,display:'flex',flexDirection:'column',gap:8 }}>
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
            <div className="s-hd"><div><span className="s-hd-label">API KEYS</span><p style={{ fontSize:11.5,color:'var(--text-muted)',margin:'3px 0 0' }}>Für Zapier, externe Tools oder eigene Integrationen</p></div></div>
            <div style={{ padding:'14px 18px',display:'flex',flexDirection:'column',gap:8 }}>
              {generatedKey && (
                <div className="fade-in">
                  <p style={{ fontSize:12,fontWeight:700,color:'var(--green-dark)',marginBottom:8 }}>✓ Key erstellt — nur einmal sichtbar!</p>
                  <div className="key-box">{generatedKey}</div>
                  <button onClick={()=>{navigator.clipboard.writeText(generatedKey);setGeneratedKey(null)}} className="btn-primary" style={{ marginTop:8 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Kopieren & Schließen
                  </button>
                </div>
              )}
              {apiKeys.map(k => (
                <div key={k.id} className="webhook-row">
                  <div style={{ width:7,height:7,borderRadius:'50%',background:'var(--green)',flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13,fontWeight:600,color:'var(--text)',margin:0 }}>{k.name}</p>
                    <p style={{ fontSize:11,color:'var(--text-muted)',margin:'1px 0 0',fontFamily:'monospace' }}>{k.key_prefix}…</p>
                  </div>
                  {k.last_used && <span style={{ fontSize:11,color:'var(--text-muted)' }}>{new Date(k.last_used).toLocaleDateString('de')}</span>}
                  <button onClick={()=>revokeKey(k.id)} className="btn-danger" style={{ fontSize:11 }}>Widerrufen</button>
                </div>
              ))}
              <div style={{ display:'flex',gap:8,borderTop:apiKeys.length?'1px solid var(--border)':'none',paddingTop:apiKeys.length?10:0 }}>
                <input value={newKeyName} onChange={e=>setNewKeyName(e.target.value)} placeholder="Key-Name (z.B. Zapier)" className="inp" style={{ flex:1,fontSize:14 }}/>
                <button onClick={createApiKey} disabled={intBusy||!newKeyName} className="btn-primary">
                  {intBusy?'…':'+ Key erstellen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab==='audit' && (
        <div className="fade-in">
          <div className="s-card">
            <div className="s-hd">
              <div>
                <span className="s-hd-label">AUDIT LOG</span>
                <p style={{ fontSize:12,color:'var(--text-muted)',margin:'4px 0 0' }}>Nachvollziehbare Workspace-Ereignisse für Vertrauen und Kontrolle.</p>
              </div>
              <Link href="/activity" className="btn-ghost">Activity Feed öffnen</Link>
            </div>
            <div className="s-bd">
              {[
                ['Heute', 'Profil- und Workspace-Einstellungen geöffnet', 'System'],
                ['Heute', 'Tagro Audio Präferenzen synchronisiert', 'AI'],
                ['Gestern', 'Developer-Update in Statusberichte übernommen', 'Delivery'],
                ['07. Mai', 'Projektstruktur durch Tagro vorbereitet', 'Projekt'],
                ['07. Mai', 'Client Workspace initialisiert', 'Workspace'],
              ].map(([time, title, type]) => (
                <div key={`${time}-${title}`} className="audit-row">
                  <span style={{ color:'var(--text-muted)', fontSize:12, fontWeight:650 }}>{time}</span>
                  <span style={{ color:'var(--text)', fontSize:13.5, fontWeight:650, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</span>
                  <span className="chip chip-gray" style={{ textAlign:'center' }}>{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
      {/* Right column — info panel (desktop only) */}
      <div className="hide-mobile settings-side" style={{ width:300, flexShrink:0, position:'sticky', top:36, alignSelf:'flex-start' }}>
        <SettingsRightPanel />
      </div>
    </div>

    {/* ── Mobile: right panel content shown below main form ── */}
    <div className="show-mobile" style={{ marginTop:12 }}>
      <SettingsRightPanel />
    </div>
    </div>
    </>
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
