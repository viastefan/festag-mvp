'use client'

/**
 * Settings — Linear-style.
 *
 * Sections:
 *   Konto        : Profil · Erscheinung · Sicherheit · Benachrichtigungen · Verbundene Konten
 *   Arbeitsbereich: Workspace
 *
 * Notes:
 * - Reads/writes to existing `profiles` columns (full_name, position, phone,
 *   theme_pref, notif_*) so the data persists across the legacy code and
 *   server-side tooling that already consumes them.
 * - Passkey enroll uses Supabase MFA WebAuthn factor; it's a best-effort
 *   call so if the project doesn't have WebAuthn turned on the user sees
 *   a calm error and can come back later.
 */

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFontMode, setFontMode as applyFontMode, getTheme, setTheme as applyThemeMode, type FontMode, type ThemeMode } from '@/lib/theme'
import { AVATAR_COLORS } from '@/lib/avatar'

type SectionId = 'profile' | 'appearance' | 'security' | 'notifications' | 'connected' | 'workspace' | 'company' | 'billing'

const SLUG_TO_SECTION: Record<string, SectionId> = {
  '':              'profile',
  'appearance':    'appearance',
  'security':      'security',
  'notifications': 'notifications',
  'connected':     'connected',
  'workspace':     'workspace',
  'company':       'company',
  'billing':       'billing',
}

const SECTION_TITLE: Record<SectionId, string> = {
  profile:       'Profil',
  appearance:    'Erscheinung',
  security:      'Sicherheit',
  notifications: 'Benachrichtigungen',
  connected:     'Verbundene Konten',
  workspace:     'Workspace',
  company:       'Unternehmen',
  billing:       'Abrechnung & Steuer',
}

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  position: string | null
  phone: string | null
  avatar_url: string | null
  avatar_color: string | null
  role: string | null
  theme_pref: string | null
  notif_email: boolean | null
  notif_push: boolean | null
  // Unternehmen
  company_name: string | null
  company_desc: string | null
  company_industry: string | null
  company_size: string | null
  company_website: string | null
  legal_form: string | null
  // Abrechnung & Steuer
  vat_number: string | null
  tax_number: string | null
  company_address: string | null
  company_city: string | null
  company_zip: string | null
  company_country: string | null
}

const THEME_OPTIONS: Array<{ id: ThemeMode; label: string; sub: string }> = [
  { id: 'light' as ThemeMode, label: 'Hell',      sub: 'Klar, reduziert.' },
  { id: 'read'  as ThemeMode, label: 'Lesemodus', sub: 'Warm, ruhig.' },
  { id: 'dark'  as ThemeMode, label: 'Dunkel',    sub: 'Technisch, kontraststark.' },
]

const LEGAL_FORMS = ['Einzelunternehmen', 'GbR', 'UG (haftungsbeschränkt)', 'GmbH', 'AG', 'KG', 'OHG', 'Freiberuflich', 'Sonstiges']
const COMPANY_SIZES = ['Nur ich', '2–10', '11–50', '51–200', '201–500', '500+']
const INDUSTRIES = [
  'Technologie & Software', 'E-Commerce & Retail', 'Marketing & Werbung',
  'Finanzen & Versicherung', 'Gesundheit & Medizin', 'Bildung & E-Learning',
  'Immobilien & Bau', 'Medien & Entertainment', 'Logistik & Transport',
  'Beratung & Services', 'Gastronomie & Tourismus', 'Sonstiges',
]
const COUNTRIES = ['Deutschland', 'Österreich', 'Schweiz', 'Liechtenstein', 'Sonstiges']

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const params = useParams<{ slug?: string[] }>()
  const slug = params?.slug?.[0] || ''
  const section: SectionId = SLUG_TO_SECTION[slug] || 'profile'
  const [profile, setProfile] = useState<Profile | null>(null)
  const [theme, setLocalTheme] = useState<ThemeMode>('dark')
  const [font, setLocalFont] = useState<FontMode>('aeonik')
  const [avatarColor, setLocalAvatarColor] = useState<string>(AVATAR_COLORS[12])
  const [saving, setSaving] = useState(false)
  const [savedTick, setSavedTick] = useState<string | null>(null)
  const [error, setError] = useState('')

  // form state mirrors profile fields so we can edit without rerouting
  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Unternehmen
  const [compName, setCompName] = useState('')
  const [compDesc, setCompDesc] = useState('')
  const [compIndustry, setCompIndustry] = useState('')
  const [compSize, setCompSize] = useState('')
  const [compWebsite, setCompWebsite] = useState('')
  const [legalForm, setLegalForm] = useState('')

  // Abrechnung & Steuer
  const [vatNumber, setVatNumber] = useState('')
  const [taxNumber, setTaxNumber] = useState('')
  const [billAddress, setBillAddress] = useState('')
  const [billZip, setBillZip] = useState('')
  const [billCity, setBillCity] = useState('')
  const [billCountry, setBillCountry] = useState('Deutschland')

  // notifications
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifPush, setNotifPush] = useState(false)

  // passkeys
  const [passkeys, setPasskeys] = useState<Array<{ id: string; friendly_name: string | null; created_at: string }>>([])
  const [passkeyEnrolling, setPasskeyEnrolling] = useState(false)

  // connected accounts
  const [identities, setIdentities] = useState<Array<{ id: string; provider: string }>>([])

  useEffect(() => {
    setLocalTheme(getTheme())
    setLocalFont(getFontMode())
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) { window.location.href = '/login'; return }

      const uid = session.user.id
      const { data: p } = await supabase
        .from('profiles')
        .select('id,email,full_name,position,phone,avatar_url,avatar_color,role,theme_pref,notif_email,notif_push,company_name,company_desc,company_industry,company_size,company_website,legal_form,vat_number,tax_number,company_address,company_city,company_zip,company_country')
        .eq('id', uid)
        .maybeSingle()

      if (cancelled) return
      if (p) {
        setProfile(p as Profile)
        setFullName(p.full_name || '')
        setPosition(p.position || '')
        setPhone(p.phone || '')
        setAvatarUrl(p.avatar_url || null)
        if (p.avatar_color) setLocalAvatarColor(p.avatar_color)
        setCompName(p.company_name || '')
        setCompDesc(p.company_desc || '')
        setCompIndustry(p.company_industry || '')
        setCompSize(p.company_size || '')
        setCompWebsite(p.company_website || '')
        setLegalForm(p.legal_form || '')
        setVatNumber(p.vat_number || '')
        setTaxNumber(p.tax_number || '')
        setBillAddress(p.company_address || '')
        setBillCity(p.company_city || '')
        setBillZip(p.company_zip || '')
        setBillCountry(p.company_country || 'Deutschland')
        if (typeof p.notif_email === 'boolean') setNotifEmail(p.notif_email)
        if (typeof p.notif_push === 'boolean') setNotifPush(p.notif_push)
      }

      // factors (passkeys)
      try {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const webauthnFactors = (factors as any)?.all?.filter((f: any) => f.factor_type === 'webauthn') || []
        setPasskeys(webauthnFactors.map((f: any) => ({ id: f.id, friendly_name: f.friendly_name, created_at: f.created_at })))
      } catch {}

      // identities (Google etc.)
      setIdentities((session.user.identities || []).map(i => ({ id: i.id, provider: i.provider })))
    })()
    return () => { cancelled = true }
  }, [supabase])

  function flashSaved(label: string) {
    setSavedTick(label)
    setTimeout(() => setSavedTick(null), 1600)
  }

  async function saveProfile() {
    if (!profile) return
    setError(''); setSaving(true)
    try {
      await supabase.from('profiles').update({
        full_name: fullName.trim() || null,
        position: position.trim() || null,
        phone: phone.trim() || null,
      }).eq('id', profile.id)
      flashSaved('Profil gespeichert')
    } catch (e: any) {
      setError(e?.message || 'Konnte nicht speichern.')
    } finally {
      setSaving(false)
    }
  }

  async function uploadAvatar(file: File) {
    if (!profile) return
    if (!file.type.startsWith('image/')) { setError('Bitte ein Bild auswählen.'); return }
    if (file.size > 4 * 1024 * 1024)    { setError('Maximal 4 MB.'); return }
    setError(''); setAvatarUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `${profile.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true, contentType: file.type, cacheControl: '3600',
      })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = pub?.publicUrl || null
      if (url) {
        await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
        setAvatarUrl(url)
        flashSaved('Profilbild aktualisiert')
      }
    } catch (e: any) {
      setError(e?.message || 'Bild konnte nicht hochgeladen werden.')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function saveCompany() {
    if (!profile) return
    setError(''); setSaving(true)
    try {
      await supabase.from('profiles').update({
        company_name:     compName.trim()     || null,
        company_desc:     compDesc.trim()     || null,
        company_industry: compIndustry        || null,
        company_size:     compSize            || null,
        company_website:  compWebsite.trim()  || null,
        legal_form:       legalForm           || null,
      }).eq('id', profile.id)
      flashSaved('Unternehmen gespeichert')
    } catch (e: any) {
      setError(e?.message || 'Konnte nicht speichern.')
    } finally {
      setSaving(false)
    }
  }

  async function saveBilling() {
    if (!profile) return
    setError(''); setSaving(true)
    try {
      await supabase.from('profiles').update({
        vat_number:      vatNumber.trim()    || null,
        tax_number:      taxNumber.trim()    || null,
        company_address: billAddress.trim()  || null,
        company_city:    billCity.trim()     || null,
        company_zip:     billZip.trim()      || null,
        company_country: billCountry         || null,
      }).eq('id', profile.id)
      flashSaved('Abrechnung gespeichert')
    } catch (e: any) {
      setError(e?.message || 'Konnte nicht speichern.')
    } finally {
      setSaving(false)
    }
  }

  function pickTheme(mode: ThemeMode) {
    setLocalTheme(mode)
    applyThemeMode(mode)
    if (profile) {
      supabase.from('profiles').update({ theme_pref: mode }).eq('id', profile.id)
    }
    flashSaved('Design gespeichert')
  }

  function pickFont(mode: FontMode) {
    setLocalFont(mode)
    applyFontMode(mode)
    flashSaved('Schrift gespeichert')
  }

  async function pickAvatarColor(color: string) {
    setLocalAvatarColor(color)
    if (profile) {
      try {
        await supabase.from('profiles').update({ avatar_color: color }).eq('id', profile.id)
      } catch {}
    }
    flashSaved('Profilfarbe gespeichert')
  }

  async function saveNotif(next: Partial<{ email: boolean; push: boolean }>) {
    if (!profile) return
    if (typeof next.email === 'boolean') setNotifEmail(next.email)
    if (typeof next.push === 'boolean')  setNotifPush(next.push)
    await supabase.from('profiles').update({
      notif_email: next.email ?? notifEmail,
      notif_push:  next.push  ?? notifPush,
    }).eq('id', profile.id)
    flashSaved('Benachrichtigungen gespeichert')
  }

  async function enrollPasskey() {
    setError(''); setPasskeyEnrolling(true)
    try {
      const ua = navigator.userAgent || ''
      const deviceHint = /iPhone|iPad/.test(ua) ? 'iPhone' : /Mac/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : 'Dieses Gerät'
      const { data, error: enrollErr } = await (supabase.auth.mfa as any).enroll({
        factorType: 'webauthn',
        friendlyName: deviceHint,
      })
      if (enrollErr) throw enrollErr
      // refresh list
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const webauthn = (factors as any)?.all?.filter((f: any) => f.factor_type === 'webauthn') || []
      setPasskeys(webauthn.map((f: any) => ({ id: f.id, friendly_name: f.friendly_name, created_at: f.created_at })))
      flashSaved('Passkey hinzugefügt')
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.includes('webauthn') || msg.includes('not enabled')) {
        setError('Passkey-Anmeldung ist noch nicht aktiviert. Wir melden uns wenn es verfügbar ist.')
      } else {
        setError(msg || 'Passkey konnte nicht angelegt werden.')
      }
    } finally {
      setPasskeyEnrolling(false)
    }
  }

  async function removePasskey(id: string) {
    setError('')
    try {
      await supabase.auth.mfa.unenroll({ factorId: id } as any)
      setPasskeys(prev => prev.filter(p => p.id !== id))
      flashSaved('Passkey entfernt')
    } catch (e: any) {
      setError(e?.message || 'Konnte Passkey nicht entfernen.')
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initials = (fullName || profile?.email || 'F')
    .split(' ').map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase() || 'F'
  const profileCompletion = [
    avatarUrl,
    fullName.trim(),
    position.trim(),
    phone.trim(),
    profile?.email,
  ].filter(Boolean).length
  const profileCompletionPct = Math.round((profileCompletion / 5) * 100)
  const roleLabel = profile?.role === 'dev'
    ? 'Developer'
    : profile?.role === 'admin'
      ? 'Admin'
      : 'Client'
  const loginLabel = identities.find(i => i.provider === 'google') ? 'Google + Magic-Link' : 'Magic-Link'

  return (
    <div className="set">
      <style>{`
        .set {
          --set-bg: var(--bg);
          --set-surface: color-mix(in srgb, var(--surface) 60%, var(--bg));
          --set-card: var(--surface);
          --set-border: var(--border);
          --set-text: var(--text);
          --set-text-secondary: var(--text-secondary);
          --set-text-muted: var(--text-muted);
          background: var(--set-bg);
          color: var(--set-text);
          font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
          font-weight: 500;
          letter-spacing: 0.01em;
          min-height: 100dvh;
          display: flex;
          justify-content: flex-start;
        }

        /* ── MAIN (centered, no inner sidebar) ──────────────────── */
        .set-main {
          padding: 56px clamp(28px, 4.5vw, 72px) 80px;
          max-width: 1120px;
          width: 100%;
        }
        .set-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; gap: 16px; }
        .set-title { font-size: 22px; font-weight: 500; letter-spacing: -0.01em; }
        .set-saved {
          font-size: 12px; font-weight: 500; letter-spacing: 0.01em;
          color: var(--set-text-secondary);
          opacity: 0;
          transition: opacity .2s;
        }
        .set-saved.show { opacity: .8; }

        /* CARD = a section group */
        .set-card {
          background: var(--set-card);
          border: 1px solid var(--set-border);
          border-radius: 12px;
          padding: 4px 0;
          margin-bottom: 18px;
        }
        .set-profile-layout {
          display: grid;
          grid-template-columns: minmax(0, 760px) minmax(240px, 300px);
          gap: 18px;
          align-items: start;
        }
        .set-side-stack {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .set-mini-card {
          background: var(--set-card);
          border: 1px solid var(--set-border);
          border-radius: 12px;
          padding: 18px;
        }
        .set-mini-title {
          font-size: 13.5px;
          font-weight: 650;
          letter-spacing: 0;
          margin-bottom: 8px;
        }
        .set-mini-copy {
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--set-text-muted);
          margin: 0;
        }
        .set-progress {
          height: 6px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--set-text) 8%, transparent);
          overflow: hidden;
          margin: 12px 0 10px;
        }
        .set-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: var(--set-text);
        }
        .set-meta-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 12px;
        }
        .set-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 12.5px;
          color: var(--set-text-muted);
        }
        .set-meta-row strong {
          color: var(--set-text-secondary);
          font-size: 12.5px;
          font-weight: 650;
          text-align: right;
        }
        .set-row {
          display: grid;
          grid-template-columns: minmax(180px, 1fr) minmax(0, 1.6fr);
          gap: 16px;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid var(--set-border);
        }
        .set-row:last-child { border-bottom: none; }
        .set-row-stack { align-items: flex-start; }
        .set-label { font-size: 13.5px; font-weight: 500; letter-spacing: 0.01em; }
        .set-label-sub { font-size: 12px; font-weight: 400; letter-spacing: 0.01em; color: var(--set-text-muted); margin-top: 3px; line-height: 1.5; }
        .set-value { font-size: 13.5px; font-weight: 500; letter-spacing: 0.01em; color: var(--set-text-secondary); }

        .set-input, .set-select {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          background: var(--set-bg);
          border: 1px solid var(--set-border);
          color: var(--set-text);
          font-family: inherit; font-size: 13.5px; font-weight: 500;
          letter-spacing: 0.01em;
          transition: border-color .15s, box-shadow .15s;
        }
        .set-input:focus, .set-select:focus {
          outline: none;
          border-color: color-mix(in srgb, var(--set-text) 35%, var(--set-border));
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--set-text) 8%, transparent);
        }

        /* Avatar */
        .set-avatar {
          width: 48px; height: 48px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--set-text) 12%, transparent);
          color: var(--set-text);
          font-size: 16px; font-weight: 500; letter-spacing: 0.01em;
          flex-shrink: 0;
        }

        /* Toggle switch */
        .set-toggle {
          width: 36px; height: 22px; border-radius: 999px;
          border: 1px solid var(--set-border);
          background: transparent;
          position: relative; cursor: pointer; flex-shrink: 0;
          transition: background .15s, border-color .15s;
        }
        .set-toggle::after {
          content: ''; position: absolute; top: 50%; left: 2px;
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--set-text);
          transform: translateY(-50%);
          opacity: .5;
          transition: left .2s cubic-bezier(0.4, 0, 0.2, 1), opacity .15s, background .15s;
        }
        .set-toggle.on { background: var(--set-text); border-color: var(--set-text); }
        .set-toggle.on::after { left: 16px; background: var(--set-bg); opacity: 1; }

        /* Buttons */
        .set-btn {
          font-family: inherit; font-size: 13px; font-weight: 500;
          letter-spacing: 0.01em;
          padding: 7px 14px; border-radius: 8px; cursor: pointer;
          border: 1px solid var(--set-border);
          background: var(--set-bg); color: var(--set-text);
          transition: background .15s, border-color .15s, opacity .15s, transform .25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .set-btn:active:not(:disabled) { transform: scale(0.97); transition: transform .08s ease; }
        .set-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--set-text) 6%, var(--set-bg)); }
        .set-btn:disabled { opacity: .5; cursor: not-allowed; }
        .set-btn-primary {
          background: var(--set-text); color: var(--set-bg); border-color: var(--set-text);
        }
        .set-btn-primary:hover:not(:disabled) { opacity: .88; }
        .set-btn-danger {
          color: #c0362e;
          border-color: color-mix(in srgb, #c0362e 30%, var(--set-border));
        }
        .set-btn-danger:hover:not(:disabled) {
          background: color-mix(in srgb, #c0362e 8%, var(--set-bg));
          border-color: color-mix(in srgb, #c0362e 60%, var(--set-border));
        }

        /* Segment toggle (font picker) */
        .set-segment {
          display: inline-flex;
          padding: 3px;
          border-radius: 9px;
          border: 1px solid var(--set-border);
          background: var(--set-bg);
          gap: 2px;
        }
        .set-segment button {
          font-family: inherit; font-size: 12.5px; font-weight: 500;
          letter-spacing: 0.01em;
          color: var(--set-text-secondary);
          padding: 6px 14px;
          border: none; background: transparent;
          border-radius: 6px; cursor: pointer;
          transition: background .15s, color .15s;
        }
        .set-segment button:hover { color: var(--set-text); }
        .set-segment button.on {
          background: var(--set-card);
          color: var(--set-text);
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }

        /* Profile color picker */
        .set-color-row {
          display: flex; flex-wrap: wrap; gap: 7px;
          align-items: center; justify-content: flex-end;
        }
        .set-color-swatch {
          width: 22px; height: 22px; border-radius: 50%;
          border: 2px solid transparent; cursor: pointer; padding: 0;
          transition: transform .15s, border-color .15s;
        }
        .set-color-swatch:hover { transform: scale(1.08); }
        .set-color-swatch.on {
          border-color: var(--set-text);
          box-shadow: 0 0 0 2px var(--set-bg);
        }

        /* Theme cards */
        .set-theme-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; }
        .set-theme-card {
          padding: 12px;
          border-radius: 10px;
          border: 1.5px solid var(--set-border);
          background: transparent;
          cursor: pointer; text-align: left;
          font-family: inherit; color: inherit;
          transition: border-color .15s, transform .2s;
        }
        .set-theme-card:hover:not(.selected) { transform: translateY(-1px); }
        .set-theme-card.selected { border-color: var(--set-text); border-width: 2px; padding: 11px; }
        .set-theme-preview {
          width: 100%; aspect-ratio: 1.7/1; border-radius: 6px;
          margin-bottom: 10px;
          display: flex; flex-direction: column; justify-content: center;
          padding: 10px; gap: 4px;
        }
        .set-theme-preview-bar { height: 4px; border-radius: 2px; }
        .preview-light { background: #FFFFFF; }
        .preview-light .set-theme-preview-bar.long { background: #1C1914; width: 70%; }
        .preview-light .set-theme-preview-bar.short { background: rgba(28,25,20,0.15); width: 40%; }
        .preview-read { background: #EFE7D2; }
        .preview-read .set-theme-preview-bar.long { background: #6F6248; width: 70%; }
        .preview-read .set-theme-preview-bar.short { background: rgba(111,98,72,0.3); width: 40%; }
        .preview-dark { background: #0E0F0F; }
        .preview-dark .set-theme-preview-bar.long { background: #7B7DFF; width: 70%; }
        .preview-dark .set-theme-preview-bar.short { background: rgba(255,255,255,0.12); width: 40%; }
        .set-theme-name { font-size: 13px; font-weight: 500; }
        .set-theme-desc { font-size: 11.5px; font-weight: 400; color: var(--set-text-muted); margin-top: 2px; letter-spacing: 0.01em; }

        /* Passkey list */
        .set-passkey {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 0;
          border-top: 1px solid var(--set-border);
        }
        .set-passkey:first-child { border-top: 0; padding-top: 0; }
        .set-passkey-name { flex: 1; font-size: 13px; font-weight: 500; }
        .set-passkey-date { font-size: 11.5px; font-weight: 400; color: var(--set-text-muted); }

        /* Provider badge */
        .set-provider {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 10px; border-radius: 999px;
          border: 1px solid var(--set-border);
          font-size: 12px; font-weight: 500;
        }

        .set-error {
          padding: 12px 22px;
          margin: 0 22px 12px;
          border-radius: 8px;
          background: rgba(239,68,68,0.05);
          color: #c0362e;
          font-size: 12.5px; font-weight: 500; letter-spacing: 0.01em;
        }

        /* Mobile */
        @media (max-width: 760px) {
          .set-main { padding: 24px 20px 60px; }
          .set-profile-layout { grid-template-columns: 1fr; }
          .set-row { grid-template-columns: 1fr; padding: 14px 16px; gap: 8px; }
        }
      `}</style>

      <main className="set-main">
        <div className="set-header">
          <h1 className="set-title">{SECTION_TITLE[section]}</h1>
          <span className={`set-saved${savedTick ? ' show' : ''}`}>{savedTick || 'Gespeichert'}</span>
        </div>
        {error && <div className="set-error">{error}</div>}

        {section === 'profile' && (
          <div className="set-profile-layout">
            <div className="set-card">
              <div className="set-row">
                <div>
                  <div className="set-label">Profilbild</div>
                  <div className="set-label-sub">PNG oder JPG, max. 4&nbsp;MB. Wird in Kommentaren und im Workspace angezeigt.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
                  <label
                    htmlFor="set-avatar-input"
                    className="set-avatar"
                    aria-label="Profilbild ändern"
                    title="Profilbild ändern"
                    style={{
                      cursor: avatarUploading ? 'wait' : 'pointer',
                      backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: avatarUploading ? 0.6 : 1,
                    }}
                  >
                    {!avatarUrl && initials}
                  </label>
                  <input
                    id="set-avatar-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) uploadAvatar(f)
                      e.target.value = ''
                    }}
                  />
                  <label htmlFor="set-avatar-input" className="set-btn" style={{ cursor: 'pointer' }}>
                    {avatarUploading ? 'Lade hoch…' : (avatarUrl ? 'Ersetzen' : 'Hochladen')}
                  </label>
                </div>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-label">E-Mail</div>
                  <div className="set-label-sub">Wird für Magic-Link-Anmeldungen genutzt.</div>
                </div>
                <div className="set-value">{profile?.email || '—'}</div>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-label">Profilfarbe</div>
                  <div className="set-label-sub">Erscheint hinter deinen Initialen, wenn kein Bild gesetzt ist.</div>
                </div>
                <div className="set-color-row">
                  {AVATAR_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`set-color-swatch${avatarColor === c ? ' on' : ''}`}
                      onClick={() => pickAvatarColor(c)}
                      style={{ background: c }}
                      aria-label={`Profilfarbe ${c}`}
                    />
                  ))}
                </div>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-label">Anzeigename</div>
                  <div className="set-label-sub">So erscheint dein Profil in Kommentaren und Projektfreigaben.</div>
                </div>
                <div className="set-value">{fullName.trim() || profile?.email?.split('@')[0] || 'Noch nicht gesetzt'}</div>
              </div>
              <div className="set-row">
                <div className="set-label">Vollständiger Name</div>
                <input
                  className="set-input"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="z. B. Stefan Dirnberger"
                />
              </div>
              <div className="set-row">
                <div>
                  <div className="set-label">Position</div>
                  <div className="set-label-sub">Optional. Z. B. Startupgründer, Agentur-Lead.</div>
                </div>
                <input
                  className="set-input"
                  type="text"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  placeholder="z. B. Startupgründer"
                />
              </div>
              <div className="set-row">
                <div className="set-label">Telefon</div>
                <input
                  className="set-input"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="set-row" style={{ justifyContent: 'flex-end', display: 'flex' }}>
                <button className="set-btn set-btn-primary" onClick={saveProfile} disabled={saving}>
                  {saving ? 'Speichere…' : 'Speichern'}
                </button>
              </div>
            </div>
            <aside className="set-side-stack" aria-label="Profil Kontext">
              <div className="set-mini-card">
                <div className="set-mini-title">Profilvollständigkeit</div>
                <p className="set-mini-copy">
                  Ein vollständiges Profil hilft Tagro bei Zuordnung, Kommunikation und Projektkontext.
                </p>
                <div className="set-progress" aria-hidden="true">
                  <span style={{ width: `${profileCompletionPct}%` }} />
                </div>
                <div className="set-meta-row">
                  <span>Status</span>
                  <strong>{profileCompletionPct}% vollständig</strong>
                </div>
              </div>

              <div className="set-mini-card">
                <div className="set-mini-title">Account Kontext</div>
                <div className="set-meta-list">
                  <div className="set-meta-row">
                    <span>Rolle</span>
                    <strong>{roleLabel}</strong>
                  </div>
                  <div className="set-meta-row">
                    <span>Anmeldung</span>
                    <strong>{loginLabel}</strong>
                  </div>
                  <div className="set-meta-row">
                    <span>Workspace</span>
                    <strong>{compName || 'Privat'}</strong>
                  </div>
                </div>
              </div>

              <div className="set-mini-card">
                <div className="set-mini-title">Empfohlen</div>
                <p className="set-mini-copy">
                  Hinterlege Position und Telefon, damit Developer bei Rückfragen schneller den richtigen Kontext haben.
                </p>
              </div>
            </aside>
          </div>
        )}

        {section === 'appearance' && (
          <div className="set-card">
            <div className="set-row set-row-stack">
              <div>
                <div className="set-label">Design</div>
                <div className="set-label-sub">Wirkt sich auf das gesamte Dashboard aus. Jederzeit änderbar.</div>
              </div>
              <div className="set-theme-cards">
                {THEME_OPTIONS.map(o => (
                  <button
                    key={o.id}
                    type="button"
                    className={`set-theme-card${theme === o.id ? ' selected' : ''}`}
                    onClick={() => pickTheme(o.id)}
                  >
                    <div className={`set-theme-preview preview-${o.id}`}>
                      <div className="set-theme-preview-bar long" />
                      <div className="set-theme-preview-bar short" />
                    </div>
                    <div className="set-theme-name">{o.label}</div>
                    <div className="set-theme-desc">{o.sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Schrift</div>
                <div className="set-label-sub">Aeonik fühlt sich ruhig an, SF Pro folgt deinem System.</div>
              </div>
              <div className="set-segment">
                <button
                  type="button"
                  className={font === 'aeonik' ? 'on' : ''}
                  onClick={() => pickFont('aeonik')}
                >
                  Aeonik
                </button>
                <button
                  type="button"
                  className={font === 'sf-pro' ? 'on' : ''}
                  onClick={() => pickFont('sf-pro')}
                >
                  SF Pro
                </button>
              </div>
            </div>
          </div>
        )}

        {section === 'security' && (
          <>
            <div className="set-card">
              <div className="set-row set-row-stack">
                <div>
                  <div className="set-label">Anmeldung</div>
                  <div className="set-label-sub">
                    Du meldest dich per Magic-Link oder Passkey an. Keine Passwörter, kein Phishing.
                  </div>
                </div>
                <div className="set-value">
                  {identities.find(i => i.provider === 'google') ? 'Google + Magic-Link' : 'Magic-Link'}
                </div>
              </div>
            </div>
            <div className="set-card">
              <div className="set-row set-row-stack">
                <div>
                  <div className="set-label">Passkeys</div>
                  <div className="set-label-sub">
                    Speichere einen Passkey auf diesem Gerät, um dich beim nächsten Mal mit Touch-ID
                    oder Face-ID anzumelden.
                  </div>
                </div>
                <div style={{ width: '100%' }}>
                  {passkeys.length === 0 ? (
                    <div className="set-label-sub" style={{ marginTop: 0, marginBottom: 10 }}>
                      Noch kein Passkey angelegt.
                    </div>
                  ) : (
                    <div style={{ marginBottom: 12 }}>
                      {passkeys.map(p => (
                        <div key={p.id} className="set-passkey">
                          <div className="set-passkey-name">{p.friendly_name || 'Gerät'}</div>
                          <span className="set-passkey-date">
                            seit {new Date(p.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                          </span>
                          <button className="set-btn set-btn-danger" onClick={() => removePasskey(p.id)}>
                            Entfernen
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    className="set-btn set-btn-primary"
                    onClick={enrollPasskey}
                    disabled={passkeyEnrolling}
                  >
                    {passkeyEnrolling ? 'Wird angelegt…' : 'Passkey hinzufügen'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {section === 'notifications' && (
          <div className="set-card">
            <div className="set-row">
              <div>
                <div className="set-label">E-Mail-Benachrichtigungen</div>
                <div className="set-label-sub">Tagro-Updates, Aufgaben, Statusberichte.</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className={`set-toggle${notifEmail ? ' on' : ''}`}
                  onClick={() => saveNotif({ email: !notifEmail })}
                  aria-label="E-Mail-Benachrichtigungen"
                />
              </div>
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Push-Benachrichtigungen</div>
                <div className="set-label-sub">Nur im Browser, nicht für E-Mail-Empfang nötig.</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className={`set-toggle${notifPush ? ' on' : ''}`}
                  onClick={() => saveNotif({ push: !notifPush })}
                  aria-label="Push-Benachrichtigungen"
                />
              </div>
            </div>
          </div>
        )}

        {section === 'connected' && (
          <div className="set-card">
            <div className="set-row">
              <div>
                <div className="set-label">Google</div>
                <div className="set-label-sub">Anmeldung mit deinem Google-Account.</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {identities.find(i => i.provider === 'google') ? (
                  <span className="set-provider">Verbunden</span>
                ) : (
                  <span className="set-value">Nicht verbunden</span>
                )}
              </div>
            </div>
          </div>
        )}

        {section === 'workspace' && (
          <>
            <div className="set-card">
              <div className="set-row">
                <div>
                  <div className="set-label">Plan</div>
                  <div className="set-label-sub">Festag MVP — auf Anfrage.</div>
                </div>
                <div className="set-value">Free</div>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-label">Mitglieder</div>
                  <div className="set-label-sub">Lade andere zu deinem Workspace ein.</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Link href="/invite" className="set-btn">Einladen</Link>
                </div>
              </div>
            </div>
            <div className="set-card">
              <div className="set-row">
                <div>
                  <div className="set-label">Abmelden</div>
                  <div className="set-label-sub">Beendet die Sitzung in diesem Browser.</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="set-btn" onClick={logout}>Abmelden</button>
                </div>
              </div>
            </div>
          </>
        )}

        {section === 'company' && (
          <div className="set-card">
            <div className="set-row">
              <div className="set-label">Firmenname</div>
              <input className="set-input" type="text" value={compName}
                onChange={e => setCompName(e.target.value)} placeholder="z. B. Festag GmbH" />
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Rechtsform</div>
                <div className="set-label-sub">Optional. Erscheint auf Rechnungen und Verträgen.</div>
              </div>
              <select className="set-select" value={legalForm} onChange={e => setLegalForm(e.target.value)}>
                <option value="">— bitte wählen —</option>
                {LEGAL_FORMS.map(lf => <option key={lf} value={lf}>{lf}</option>)}
              </select>
            </div>
            <div className="set-row">
              <div className="set-label">Branche</div>
              <select className="set-select" value={compIndustry} onChange={e => setCompIndustry(e.target.value)}>
                <option value="">— bitte wählen —</option>
                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            <div className="set-row">
              <div className="set-label">Teamgröße</div>
              <select className="set-select" value={compSize} onChange={e => setCompSize(e.target.value)}>
                <option value="">— bitte wählen —</option>
                {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="set-row">
              <div className="set-label">Website</div>
              <input className="set-input" type="url" value={compWebsite}
                onChange={e => setCompWebsite(e.target.value)} placeholder="https://" />
            </div>
            <div className="set-row set-row-stack">
              <div>
                <div className="set-label">Beschreibung</div>
                <div className="set-label-sub">Kurze Beschreibung, die Tagro für Kontext nutzt.</div>
              </div>
              <textarea
                className="set-input"
                value={compDesc}
                onChange={e => setCompDesc(e.target.value)}
                placeholder="Was macht euer Unternehmen?"
                rows={3}
                style={{ resize: 'vertical', minHeight: 80, fontFamily: 'inherit', lineHeight: 1.5 }}
              />
            </div>
            <div className="set-row" style={{ justifyContent: 'flex-end', display: 'flex' }}>
              <button className="set-btn set-btn-primary" onClick={saveCompany} disabled={saving}>
                {saving ? 'Speichere…' : 'Speichern'}
              </button>
            </div>
          </div>
        )}

        {section === 'billing' && (
          <>
            <div className="set-card">
              <div className="set-row">
                <div>
                  <div className="set-label">USt-IdNr.</div>
                  <div className="set-label-sub">Format z. B. DE123456789. Erscheint auf Rechnungen.</div>
                </div>
                <input className="set-input" type="text" value={vatNumber}
                  onChange={e => setVatNumber(e.target.value)} placeholder="DE…" />
              </div>
              <div className="set-row">
                <div>
                  <div className="set-label">Steuernummer</div>
                  <div className="set-label-sub">Optional, falls keine USt-IdNr. vorhanden.</div>
                </div>
                <input className="set-input" type="text" value={taxNumber}
                  onChange={e => setTaxNumber(e.target.value)} placeholder="z. B. 123/456/78901" />
              </div>
            </div>
            <div className="set-card">
              <div className="set-row">
                <div>
                  <div className="set-label">Rechnungsadresse</div>
                  <div className="set-label-sub">Wird auf allen Festag-Rechnungen verwendet.</div>
                </div>
                <input className="set-input" type="text" value={billAddress}
                  onChange={e => setBillAddress(e.target.value)} placeholder="Straße und Hausnummer" />
              </div>
              <div className="set-row">
                <div className="set-label">PLZ</div>
                <input className="set-input" type="text" value={billZip}
                  onChange={e => setBillZip(e.target.value)} placeholder="z. B. 80331" />
              </div>
              <div className="set-row">
                <div className="set-label">Stadt</div>
                <input className="set-input" type="text" value={billCity}
                  onChange={e => setBillCity(e.target.value)} placeholder="z. B. München" />
              </div>
              <div className="set-row">
                <div className="set-label">Land</div>
                <select className="set-select" value={billCountry} onChange={e => setBillCountry(e.target.value)}>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="set-row" style={{ justifyContent: 'flex-end', display: 'flex' }}>
                <button className="set-btn set-btn-primary" onClick={saveBilling} disabled={saving}>
                  {saving ? 'Speichere…' : 'Speichern'}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
