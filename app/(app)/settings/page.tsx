'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import Avatar from '@/components/Avatar'

type Tab = 'profile' | 'account' | 'notifications' | 'verification'

export default function SettingsPage() {
  const { user, loading, refresh } = useUser()
  const [tab, setTab] = useState<Tab>('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingId, setUploadingId] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const idInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    full_name: '', phone: '', company: '', bio: '',
    address_street: '', address_city: '', address_zip: '', address_country: 'Deutschland',
    age: '' as string | number,
    notif_push: true, notif_email: true, notif_whatsapp: false, whatsapp_number: '',
  })

  useEffect(() => {
    if (!user) return
    setForm({
      full_name: user.full_name ?? '',
      phone: user.phone ?? '',
      company: user.company ?? '',
      bio: user.bio ?? '',
      address_street: user.address_street ?? '',
      address_city: user.address_city ?? '',
      address_zip: user.address_zip ?? '',
      address_country: user.address_country ?? 'Deutschland',
      age: user.age ?? '',
      notif_push: user.notif_push ?? true,
      notif_email: user.notif_email ?? true,
      notif_whatsapp: user.notif_whatsapp ?? false,
      whatsapp_number: user.whatsapp_number ?? '',
    })
  }, [user])

  async function save() {
    if (!user) return
    setSaving(true)
    const supabase = createClient()
    const payload: any = { ...form }
    payload.age = form.age === '' ? null : Number(form.age)
    await supabase.from('profiles').update(payload).eq('id', user.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    await refresh()
  }

  async function uploadAvatar(file: File) {
    if (!user) return
    setUploadingAvatar(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${user.id}/avatar.${ext}`

    // Remove old avatar
    await supabase.storage.from('avatars').remove([path])

    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true, cacheControl: '3600',
    })
    if (!upErr) {
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlWithBust = `${pub.publicUrl}?v=${Date.now()}`
      await supabase.from('profiles').update({ avatar_url: urlWithBust }).eq('id', user.id)
      await refresh()
    }
    setUploadingAvatar(false)
  }

  async function removeAvatar() {
    if (!user) return
    const supabase = createClient()
    // Remove any file in user's folder
    const { data: files } = await supabase.storage.from('avatars').list(user.id)
    if (files && files.length > 0) {
      await supabase.storage.from('avatars').remove(files.map(f => `${user.id}/${f.name}`))
    }
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
    await refresh()
  }

  async function uploadIdDoc(file: File) {
    if (!user) return
    setUploadingId(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'pdf'
    const path = `${user.id}/id_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('id_documents').upload(path, file)
    if (!upErr) {
      await supabase.from('profiles').update({ id_document_url: path }).eq('id', user.id)
      await refresh()
    }
    setUploadingId(false)
  }

  const logout = async () => {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /></div>
  if (!user) return null

  const TABS: { k: Tab; l: string }[] = [
    { k: 'profile', l: 'Profil' },
    { k: 'account', l: 'Konto' },
    { k: 'notifications', l: 'Benachrichtigungen' },
    { k: 'verification', l: 'Verifizierung' },
  ]

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="animate-fade-up" style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 4, fontFamily: 'Aeonik, sans-serif' }}>Profil & Einstellungen</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'Aeonik, sans-serif' }}>
          Verwalte deine Daten und Präferenzen
        </p>
      </div>

      {/* Avatar + Name header */}
      <div className="animate-fade-up-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 22px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <Avatar user={user} size={72} />
          <button onClick={() => avatarInputRef.current?.click()} className="tap-scale" style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--text)', color: '#fff', border: '2px solid var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'Aeonik, sans-serif' }}>{user.full_name ?? 'Ohne Namen'}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', fontFamily: 'Aeonik, sans-serif' }}>
            {user.email} · <span style={{ textTransform: 'capitalize' }}>{user.role}</span>
            {user.id_verified && <span style={{ color: 'var(--green-dark)', marginLeft: 6 }}>· ✓ Verifiziert</span>}
          </p>
        </div>
        {user.avatar_url && (
          <button onClick={removeAvatar} style={{ padding: '7px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>
            Foto entfernen
          </button>
        )}
        {uploadingAvatar && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lade hoch…</span>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 18, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t.k ? 600 : 500,
            color: tab === t.k ? 'var(--text)' : 'var(--text-muted)',
            borderBottom: `2px solid ${tab === t.k ? 'var(--text)' : 'transparent'}`,
            marginBottom: -1, fontFamily: 'Aeonik, sans-serif', whiteSpace: 'nowrap',
          }}>{t.l}</button>
        ))}
      </div>

      {/* ═════ Profile tab ═════ */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={section}>
            <p style={sectionTitle}>PERSÖNLICHE DATEN</p>
            <div style={grid2}>
              <Field label="Vollständiger Name" value={form.full_name} onChange={v => setForm({...form, full_name: v})} placeholder="Max Mustermann" />
              <Field label="Telefon" value={form.phone} onChange={v => setForm({...form, phone: v})} placeholder="+49 151 1234567" type="tel" />
            </div>
            <div style={grid2}>
              <Field label="Firma" value={form.company} onChange={v => setForm({...form, company: v})} placeholder="Musterfirma GmbH" />
              <Field label="Alter (optional)" value={String(form.age)} onChange={v => setForm({...form, age: v.replace(/[^0-9]/g, '')})} placeholder="35" type="number" />
            </div>
            <Field label="Kurzbeschreibung (optional)" value={form.bio} onChange={v => setForm({...form, bio: v})} placeholder="Erzähle kurz, was du machst…" textarea />
          </div>

          <div style={section}>
            <p style={sectionTitle}>ADRESSE</p>
            <Field label="Straße & Hausnummer" value={form.address_street} onChange={v => setForm({...form, address_street: v})} placeholder="Musterstraße 12" />
            <div style={grid2}>
              <Field label="PLZ" value={form.address_zip} onChange={v => setForm({...form, address_zip: v})} placeholder="12345" />
              <Field label="Stadt" value={form.address_city} onChange={v => setForm({...form, address_city: v})} placeholder="Berlin" />
            </div>
            <Field label="Land" value={form.address_country} onChange={v => setForm({...form, address_country: v})} placeholder="Deutschland" />
          </div>

          <SaveBar saving={saving} saved={saved} onSave={save} />
        </div>
      )}

      {/* ═════ Account tab ═════ */}
      {tab === 'account' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={section}>
            <p style={sectionTitle}>ZUGANG</p>
            <div style={row}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0, fontFamily: 'Aeonik, sans-serif' }}>E-Mail</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>{user.email}</p>
              </div>
              <button disabled style={btnSecondary}>Ändern</button>
            </div>
            <div style={{ ...row, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0, fontFamily: 'Aeonik, sans-serif' }}>Passwort</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>Letzte Änderung unbekannt</p>
              </div>
              <button disabled style={btnSecondary}>Ändern</button>
            </div>
            <div style={{ ...row, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0, fontFamily: 'Aeonik, sans-serif' }}>Rolle</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', textTransform: 'capitalize' }}>{user.role}</p>
              </div>
            </div>
          </div>

          <button onClick={logout} className="tap-scale" style={{
            width: '100%', padding: '13px', background: 'var(--surface)', color: 'var(--red)',
            border: '1px solid #FECACA', borderRadius: 'var(--r)', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', minHeight: 46, fontFamily: 'inherit',
          }}>
            Abmelden
          </button>
        </div>
      )}

      {/* ═════ Notifications tab ═════ */}
      {tab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={section}>
            <p style={sectionTitle}>BENACHRICHTIGUNGEN</p>
            <Toggle label="Push-Benachrichtigungen" desc="AI Updates, Tasks, Nachrichten" checked={form.notif_push} onChange={v => setForm({...form, notif_push: v})} />
            <Toggle label="E-Mail" desc="Tagesreports und wichtige Updates" checked={form.notif_email} onChange={v => setForm({...form, notif_email: v})} />
            <Toggle label="WhatsApp" desc="Kritische Updates direkt auf WhatsApp" checked={form.notif_whatsapp} onChange={v => setForm({...form, notif_whatsapp: v})} last />
            {form.notif_whatsapp && (
              <div style={{ marginTop: 12 }}>
                <Field label="WhatsApp Nummer" value={form.whatsapp_number} onChange={v => setForm({...form, whatsapp_number: v})} placeholder="+49 151 1234567" type="tel" />
              </div>
            )}
          </div>
          <SaveBar saving={saving} saved={saved} onSave={save} />
        </div>
      )}

      {/* ═════ Verification tab ═════ */}
      {tab === 'verification' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={section}>
            <p style={sectionTitle}>ID VERIFIZIERUNG</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5, fontFamily: 'Aeonik, sans-serif' }}>
              Lade ein Ausweisdokument hoch (Personalausweis, Reisepass oder Führerschein). Das Dokument wird verschlüsselt gespeichert und nur von Festag Admins geprüft.
            </p>
            {user.id_verified ? (
              <div style={{ padding: '14px 16px', background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--green-dark)', margin: 0, fontFamily: 'Aeonik, sans-serif' }}>Verifiziert</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>Dein Konto ist vollständig verifiziert.</p>
                </div>
              </div>
            ) : user.id_document_url ? (
              <div style={{ padding: '14px 16px', background: 'var(--amber-bg)', border: '1px solid #FCD34D', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#D97706', margin: 0, fontFamily: 'Aeonik, sans-serif' }}>Überprüfung läuft</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>Dein Dokument wird von einem Festag Admin geprüft.</p>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => idInputRef.current?.click()} disabled={uploadingId} className="tap-scale" style={{
                  width: '100%', padding: '24px', background: 'var(--surface-2)', border: '1.5px dashed var(--border-strong)',
                  borderRadius: 'var(--r)', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text)', margin: 0, fontFamily: 'Aeonik, sans-serif' }}>{uploadingId ? 'Lade hoch…' : 'Dokument hochladen'}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>JPG, PNG oder PDF · max. 10 MB</p>
                  </div>
                </button>
                <input ref={idInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadIdDoc(e.target.files[0])} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// Components
// ═══════════════════════════════════════════
function Field({ label, value, onChange, placeholder, type = 'text', textarea = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; textarea?: boolean
}) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, fontFamily: 'Aeonik, sans-serif' }}>{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ ...inpStyle, resize: 'vertical', minHeight: 80 }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inpStyle} />
      )}
    </div>
  )
}

function Toggle({ label, desc, checked, onChange, last = false }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0, fontFamily: 'Aeonik, sans-serif' }}>{label}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', fontFamily: 'Aeonik, sans-serif' }}>{desc}</p>
      </div>
      <button onClick={() => onChange(!checked)} style={{
        width: 38, height: 22, borderRadius: 20, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--green)' : 'var(--surface-2)',
        position: 'relative', transition: 'background 0.2s', padding: 0, flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          boxShadow: 'var(--shadow-xs)', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

function SaveBar({ saving, saved, onSave }: { saving: boolean; saved: boolean; onSave: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      <button onClick={onSave} disabled={saving} className="tap-scale" style={{
        padding: '11px 20px', background: saved ? 'var(--green-bg)' : 'var(--text)',
        color: saved ? 'var(--green-dark)' : '#fff',
        border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600,
        cursor: saving ? 'default' : 'pointer', minHeight: 42, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {saving ? 'Speichert…' : saved ? (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>Gespeichert</>) : 'Speichern'}
      </button>
    </div>
  )
}

const section: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }
const sectionTitle: React.CSSProperties = { fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 14, fontFamily: 'Aeonik, sans-serif' }
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const inpStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: '#FFFFFF',
  border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  fontSize: 14, outline: 'none', color: 'var(--text)',
  boxSizing: 'border-box' as const, minHeight: 42, fontFamily: 'inherit',
}
const btnSecondary: React.CSSProperties = {
  padding: '7px 13px', background: 'var(--surface-2)', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
  cursor: 'pointer', fontFamily: 'inherit',
}
