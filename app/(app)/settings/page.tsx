'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const INDUSTRIES = [
  'Technologie & Software', 'E-Commerce & Retail', 'Marketing & Werbung',
  'Finanzen & Versicherung', 'Gesundheit & Medizin', 'Bildung & E-Learning',
  'Immobilien & Bau', 'Medien & Entertainment', 'Logistik & Transport',
  'Beratung & Services', 'Gastronomie & Tourismus', 'Sonstiges',
]

const SIZES = [
  { value: 'freelancer', label: 'Freelancer' },
  { value: '1-10',       label: '1–10 Mitarbeiter' },
  { value: '10-50',      label: '10–50 Mitarbeiter' },
  { value: '50-200',     label: '50–200 Mitarbeiter' },
  { value: '200+',       label: '200+ Mitarbeiter' },
]

type NotifPrefs = { ai_updates: boolean; dev_activity: boolean; billing: boolean; project_status: boolean }

export default function SettingsPage() {
  // Profile
  const [firstName,   setFirstName]   = useState('')
  const [lastName,    setLastName]    = useState('')
  const [phone,       setPhone]       = useState('')
  const [email,       setEmail]       = useState('')
  const [role,        setRole]        = useState('client')
  const [createdAt,   setCreatedAt]   = useState('')
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null)
  // Company
  const [companyName,     setCompanyName]     = useState('')
  const [companyDesc,     setCompanyDesc]     = useState('')
  const [companyIndustry, setCompanyIndustry] = useState('')
  const [companySize,     setCompanySize]     = useState('')
  const [companyWebsite,  setCompanyWebsite]  = useState('')
  // UI state
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saveMsg,    setSaveMsg]    = useState<'saved'|'error'|null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [notifs,     setNotifs]     = useState<NotifPrefs>({ ai_updates: true, dev_activity: true, billing: false, project_status: true })
  const [pushRegistered, setPushRegistered] = useState(false)
  const [pushSupported,  setPushSupported]  = useState(false)
  const [activeTab,  setActiveTab]  = useState<'profile'|'company'|'notifications'>('profile')
  const [userId,     setUserId]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      setUserId(uid)
      setEmail(data.session.user.email ?? '')

      const { data: p } = await supabase.from('profiles').select('*').eq('id', uid).single()
      if (p) {
        setFirstName(p.first_name ?? '')
        setLastName(p.last_name ?? '')
        setPhone(p.phone ?? '')
        setRole(p.role ?? 'client')
        setCreatedAt(p.created_at ?? '')
        setAvatarUrl(p.avatar_url ?? null)
        setCompanyName(p.company_name ?? '')
        setCompanyDesc(p.company_desc ?? '')
        setCompanyIndustry(p.company_industry ?? '')
        setCompanySize(p.company_size ?? '')
        setCompanyWebsite(p.company_website ?? '')
        if (p.notif_prefs) setNotifs(p.notif_prefs as NotifPrefs)
      }
      setLoading(false)
    })

    // Check push support
    setPushSupported('Notification' in window && 'serviceWorker' in navigator)
  }, [])

  async function save() {
    setSaving(true); setSaveMsg(null)
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || null
    const { error } = await supabase.from('profiles').update({
      first_name: firstName || null, last_name: lastName || null,
      full_name: displayName, phone: phone || null,
      company_name: companyName || null, company_desc: companyDesc || null,
      company_industry: companyIndustry || null, company_size: companySize || null,
      company_website: companyWebsite || null, notif_prefs: notifs,
    }).eq('id', userId)
    setSaving(false)
    setSaveMsg(error ? 'error' : 'saved')
    setTimeout(() => setSaveMsg(null), 2800)
  }

  async function uploadAvatar(file: File) {
    if (!file || !userId) return
    setAvatarUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = publicUrl + '?v=' + Date.now()
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      setAvatarUrl(url)
    }
    setAvatarUploading(false)
  }

  async function togglePushNotifs(enabled: boolean) {
    if (!enabled) {
      setPushRegistered(false); return
    }
    if (!('Notification' in window)) return
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return
      // Web Push via service worker (Supabase Realtime or FCM)
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const reg = await navigator.serviceWorker.ready
        // Try to subscribe (in production: use VAPID key from env)
        // For now we register permission granted state and store intent
        const token = `web_${userId}_${Date.now()}`
        await supabase.rpc('upsert_push_token', {
          p_token: token, p_platform: 'web',
          p_device: navigator.userAgent.slice(0, 80),
        })
        setPushRegistered(true)
      }
    } catch { /* permission denied */ }
  }

  async function toggleNotif(key: keyof NotifPrefs) {
    const updated = { ...notifs, [key]: !notifs[key] }
    setNotifs(updated)
    await supabase.from('profiles').update({ notif_prefs: updated }).eq('id', userId)
  }

  const logout = async () => { await supabase.auth.signOut(); window.location.href = '/login' }

  const displayName = [firstName, lastName].filter(Boolean).join(' ')
  const initial = (firstName || email || 'U').charAt(0).toUpperCase()

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 660 }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
        .s-card { background: #fff; border: 1px solid var(--border); border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.05); margin-bottom: 14px; transition: box-shadow 0.2s; }
        .s-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
        .s-inp { width:100%; padding:12px 14px; background:#FAFAFA; border:1px solid var(--border); border-radius:12px; font-size:15px; outline:none; color:var(--text); box-sizing:border-box; transition:all 0.15s; font-family:'Aeonik',inherit; }
        .s-inp:focus { border-color:#CBD5E1; box-shadow:0 0 0 3px rgba(15,23,42,.05); background:#fff; }
        .s-inp::placeholder { color:#CBD5E1; }
        .s-inp:disabled { background:var(--surface-2); color:var(--text-muted); cursor:not-allowed; }
        .s-select { width:100%; padding:12px 14px; background:#FAFAFA; border:1px solid var(--border); border-radius:12px; font-size:15px; outline:none; color:var(--text); box-sizing:border-box; cursor:pointer; font-family:'Aeonik',inherit; appearance:none; transition:all 0.15s; }
        .s-select:focus { border-color:#CBD5E1; box-shadow:0 0 0 3px rgba(15,23,42,.05); background:#fff; }
        .s-textarea { width:100%; padding:12px 14px; background:#FAFAFA; border:1px solid var(--border); border-radius:12px; font-size:15px; outline:none; color:var(--text); box-sizing:border-box; resize:vertical; min-height:90px; transition:all 0.15s; font-family:'Aeonik',inherit; line-height:1.55; }
        .s-textarea:focus { border-color:#CBD5E1; box-shadow:0 0 0 3px rgba(15,23,42,.05); background:#fff; }
        .s-btn { display:inline-flex; align-items:center; gap:8px; padding:11px 20px; background:var(--text); color:#fff; border:none; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.15s; font-family:'Aeonik',inherit; box-shadow:0 2px 8px rgba(15,23,42,.15); }
        .s-btn:hover { opacity:.88; transform:translateY(-1px); box-shadow:0 4px 16px rgba(15,23,42,.2); }
        .s-btn:active { transform:translateY(0); }
        .s-btn:disabled { opacity:.4; cursor:default; transform:none; }
        .s-btn-ghost { display:inline-flex; align-items:center; gap:8px; padding:11px 20px; background:transparent; color:var(--text); border:1px solid var(--border); border-radius:12px; font-size:14px; font-weight:500; cursor:pointer; transition:all 0.15s; font-family:'Aeonik',inherit; }
        .s-btn-ghost:hover { background:var(--surface-2); border-color:var(--border-strong); }
        .s-lbl { font-size:12px; font-weight:500; color:var(--text-secondary); display:block; margin-bottom:7px; letter-spacing:0.01em; }
        .toggle-track { width:46px; height:26px; border-radius:13px; position:relative; cursor:pointer; transition:background .2s; border:none; flex-shrink:0; }
        .toggle-thumb { position:absolute; top:3px; width:20px; height:20px; border-radius:50%; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.18); transition:left .2s cubic-bezier(.4,0,.2,1); }
        .tab-pill { padding:8px 16px; border-radius:10px; border:none; cursor:pointer; font-size:13px; font-weight:500; transition:all .15s; font-family:'Aeonik',inherit; }
        .tab-pill-on { background:#0F172A; color:#fff; box-shadow:0 2px 8px rgba(15,23,42,.2); font-weight:600; }
        .tab-pill-off { background:transparent; color:var(--text-muted); }
        .tab-pill-off:hover { background:var(--surface-2); color:var(--text); }
        @keyframes spin { to{transform:rotate(360deg);} }
        .avatar-ring { position:relative; width:80px; height:80px; flex-shrink:0; }
        .avatar-img { width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid #fff; box-shadow:0 4px 16px rgba(0,0,0,.12); display:block; }
        .avatar-initials { width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg,#E2E8F0,#F1F5F9); border:3px solid #fff; box-shadow:0 4px 16px rgba(0,0,0,.08); display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:700; color:#0F172A; }
        .avatar-edit { position:absolute; bottom:0; right:0; width:26px; height:26px; background:#0F172A; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.2); transition:transform .15s; border:2px solid #fff; }
        .avatar-edit:hover { transform:scale(1.1); }
      `}</style>

      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <h1 style={{ marginBottom: 4 }}>Einstellungen</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Profil, Unternehmen & Benachrichtigungen</p>
      </div>

      {/* Avatar + Name header card */}
      <div className="s-card animate-fade-up-1" style={{ padding: '24px 28px', display: 'flex', gap: 20, alignItems: 'center' }}>
        <div className="avatar-ring" onClick={() => fileRef.current?.click()}>
          {avatarUploading ? (
            <div className="avatar-initials"><div style={{ width: 24, height: 24, border: '3px solid #CBD5E1', borderTopColor: '#0F172A', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /></div>
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="avatar-img" />
          ) : (
            <div className="avatar-initials">{initial}</div>
          )}
          <div className="avatar-edit" title="Bild hochladen">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName || email.split('@')[0] || 'Mein Profil'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 8px', textTransform: 'capitalize' }}>
            {role} {createdAt && `· Seit ${new Date(createdAt).toLocaleDateString('de', { month: 'long', year: 'numeric' })}`}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green-dark)', letterSpacing: '0.04em' }}>AKTIV</span>
          </div>
        </div>
        <button onClick={logout} className="s-btn-ghost" style={{ fontSize: 13, padding: '8px 14px', color: 'var(--red)', borderColor: '#FECACA' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Abmelden
        </button>
      </div>

      {/* Tab navigation */}
      <div className="animate-fade-up-2" style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--surface-2)', borderRadius: 14, padding: 5 }}>
        {([
          { key: 'profile',       label: 'Profil',           icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
          { key: 'company',       label: 'Unternehmen',      icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
          { key: 'notifications', label: 'Benachrichtigungen', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`tab-pill ${activeTab === t.key ? 'tab-pill-on' : 'tab-pill-off'}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === t.key ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round"><path d={t.icon}/></svg>
            <span className="hide-mobile">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ─── PROFIL TAB ─── */}
      {activeTab === 'profile' && (
        <div className="animate-fade-up s-card">
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', margin: 0 }}>PERSÖNLICHE DATEN</p>
          </div>
          <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Name row */}
            <div className="grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="s-lbl">Vorname</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Max" className="s-inp" />
              </div>
              <div>
                <label className="s-lbl">Nachname</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Mustermann" className="s-inp" />
              </div>
            </div>
            {/* Phone */}
            <div>
              <label className="s-lbl">Telefonnummer</label>
              <div style={{ position: 'relative' }}>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49 151 12345678" className="s-inp" type="tel" style={{ paddingLeft: 42 }} />
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.09 5.18 2 2 0 0 1 4.09 3h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 10.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17z"/></svg>
                </span>
              </div>
            </div>
            {/* Email (disabled) */}
            <div>
              <label className="s-lbl">E-Mail</label>
              <input value={email} disabled className="s-inp" />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>E-Mail kann nicht geändert werden.</p>
            </div>

            <button onClick={save} disabled={saving} className="s-btn" style={{ alignSelf: 'flex-start' }}>
              {saving ? (
                <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Speichert…</>
              ) : saveMsg === 'saved' ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>Gespeichert</>
              ) : 'Profil speichern'}
            </button>
          </div>
        </div>
      )}

      {/* ─── UNTERNEHMEN TAB ─── */}
      {activeTab === 'company' && (
        <div className="animate-fade-up s-card">
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', margin: 0 }}>UNTERNEHMENSDATEN</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>Wird von der AI für bessere Projektergebnisse genutzt</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'var(--blue-bg)', borderRadius: 8, border: '1px solid var(--blue-border)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#007AFF', letterSpacing: '0.06em' }}>AI-KONTEXT</span>
            </div>
          </div>
          <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="s-lbl">Firmenname</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Meine GmbH" className="s-inp" />
            </div>

            <div>
              <label className="s-lbl" style={{ display: 'flex', justifyContent: 'space-between' }}>
                Unternehmensbeschreibung
                <span style={{ fontSize: 10, color: '#007AFF', fontWeight: 600 }}>Wichtig für AI ✦</span>
              </label>
              <textarea value={companyDesc} onChange={e => setCompanyDesc(e.target.value)} placeholder="Beschreibe dein Unternehmen, was du machst, wer deine Kunden sind und welche Ziele du verfolgst. Je mehr Detail, desto besser kann Tagro AI deine Projekte planen…" className="s-textarea" style={{ minHeight: 110 }} />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{companyDesc.length} Zeichen · Mindestens 100 empfohlen</p>
            </div>

            <div className="grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="s-lbl">Branche</label>
                <div style={{ position: 'relative' }}>
                  <select value={companyIndustry} onChange={e => setCompanyIndustry(e.target.value)} className="s-select">
                    <option value="">Branche wählen…</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>
              <div>
                <label className="s-lbl">Unternehmensgröße</label>
                <div style={{ position: 'relative' }}>
                  <select value={companySize} onChange={e => setCompanySize(e.target.value)} className="s-select">
                    <option value="">Größe wählen…</option>
                    {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="s-lbl">Website</label>
              <div style={{ position: 'relative' }}>
                <input value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} placeholder="https://meinefirma.de" className="s-inp" type="url" style={{ paddingLeft: 42 }} />
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>
              </div>
            </div>

            <button onClick={save} disabled={saving} className="s-btn" style={{ alignSelf: 'flex-start' }}>
              {saving ? (
                <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Speichert…</>
              ) : saveMsg === 'saved' ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>Gespeichert</>
              ) : 'Unternehmen speichern'}
            </button>
          </div>
        </div>
      )}

      {/* ─── NOTIFICATIONS TAB ─── */}
      {activeTab === 'notifications' && (
        <div className="animate-fade-up">
          {/* Push permission banner */}
          {pushSupported && !pushRegistered && (
            <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', borderRadius: 20, padding: '20px 24px', marginBottom: 14, display: 'flex', gap: 16, alignItems: 'center', boxShadow: '0 8px 30px rgba(15,23,42,.2)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Push-Benachrichtigungen aktivieren</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', margin: 0 }}>Erhalte sofortige Updates wenn Tasks fertig sind oder Developer aktiv werden.</p>
              </div>
              <button onClick={() => togglePushNotifs(true)} style={{ padding: '9px 16px', background: '#fff', color: '#0F172A', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 8px rgba(255,255,255,.2)' }}>
                Aktivieren
              </button>
            </div>
          )}

          {pushRegistered && (
            <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 14, padding: '12px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
              <p style={{ fontSize: 13, color: 'var(--green-dark)', margin: 0, fontWeight: 600 }}>Push-Benachrichtigungen aktiv auf diesem Gerät</p>
            </div>
          )}

          <div className="s-card">
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', margin: 0 }}>BENACHRICHTIGUNGSEINSTELLUNGEN</p>
            </div>
            <div style={{ padding: '8px 0' }}>
              {[
                { key: 'ai_updates',      label: 'AI Updates & Tagesberichte',  desc: 'Wenn Tagro einen neuen Statusbericht erstellt',      icon: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8' },
                { key: 'dev_activity',    label: 'Developer-Aktivität',          desc: 'Wenn ein Developer Tasks erledigt oder sich einloggt', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
                { key: 'project_status',  label: 'Projekt-Statuswechsel',        desc: 'Bei Phasenwechsel (Intake → Planning → Active …)',     icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
                { key: 'billing',         label: 'Rechnungen & Zahlungen',       desc: 'Neue Rechnungen oder Zahlungsbestätigungen',          icon: 'M2 5h20v14H2zM2 10h20' },
              ].map((n, i) => {
                const on = notifs[n.key as keyof NotifPrefs]
                return (
                  <div key={n.key} style={{ padding: '16px 24px', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: on ? 'var(--green-bg)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .2s', border: `1px solid ${on ? 'var(--green-border)' : 'var(--border)'}` }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={on ? 'var(--green-dark)' : '#94A3B8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon}/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>{n.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{n.desc}</p>
                    </div>
                    <button className="toggle-track" onClick={() => toggleNotif(n.key as keyof NotifPrefs)} style={{ background: on ? 'var(--green)' : 'var(--border)' }} aria-label={n.label}>
                      <div className="toggle-thumb" style={{ left: on ? 23 : 3 }} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Push info */}
          {!pushSupported && (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', marginTop: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Push-Benachrichtigungen werden von diesem Browser nicht unterstützt. Für Push-Notifications empfehlen wir Safari auf iOS oder Chrome auf Android.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
