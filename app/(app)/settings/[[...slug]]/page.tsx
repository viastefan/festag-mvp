'use client'

/**
 * Settings — calm workspace style.
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
import { useParams, usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { createClient } from '@/lib/supabase/client'
import { checkSsoDomain, extractSsoDomain, isSsoProvider, requestSsoSetup } from '@/lib/auth-sso'
import { getFontMode, setFontMode as applyFontMode, getTheme, setTheme as applyThemeMode, type FontMode, type ThemeMode } from '@/lib/theme'
import { getLanguageMode, setLanguageMode, type LanguageMode } from '@/lib/language'
import { AVATAR_COLORS, avatarTextColor } from '@/lib/avatar'
import { broadcastWorkspaceAccent } from '@/lib/workspace-accent'
import WorkspaceSymbol, { SYMBOL_SCHEMES, SYMBOL_VARIANTS } from '@/components/WorkspaceSymbol'
import { loadSymbol, saveSymbol } from '@/lib/workspace-symbol'
import { rememberFestagEmail, getLastFestagAccount, rememberFestagAccount, getRememberedPersonalDetails, rememberPersonalDetails } from '@/lib/auth-device-memory'
import { normalizeWorkspaceName, rememberWorkspaceName } from '@/lib/pending-workspace'
import {
  broadcastProfileSync,
  getRememberedProfileAvatarColor,
  rememberProfileAvatarColor,
} from '@/lib/profile-sync'
import Modal, { ModalButton } from '@/components/Modal'
import SettingsMobileShell from '@/components/settings/SettingsMobileShell'
import SettingsLoadingSkeleton from '@/components/settings/SettingsLoadingSkeleton'
import SettingsExtraSections from '@/components/settings/SettingsExtraSections'
import SettingsDocumentsSection from '@/components/settings/SettingsDocumentsSection'
import { SETTINGS_CODEX_CSS } from '@/components/settings/settings-styles'
import {
  resolveSettingsSection,
  settingsHref,
  type SettingsSectionId,
} from '@/components/settings/settings-config'
import {
  applyUiDensity,
  getReducedMotion,
  getUiDensity,
  setReducedMotion,
  setUiDensity,
  type UiDensity,
} from '@/components/settings/settings-prefs'
import { broadcastWorkspaceDbMode } from '@/lib/sidebar-prefs'
import WhatsAppBrandIcon from '@/components/briefing/WhatsAppBrandIcon'
import {
  formatBriefingPhoneDisplay,
  isValidBriefingEmail,
  normalizeBriefingPhone,
  type BriefingDeliveryChannels,
  type BriefingMessageChannel,
} from '@/lib/briefing/delivery-channels'

type SectionId = SettingsSectionId

type Profile = {
  id: string
  email: string | null
  first_name: string | null
  full_name: string | null
  position: string | null
  phone: string | null
  bio: string | null
  linkedin_url: string | null
  timezone: string | null
  language_pref: LanguageMode | null
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

const PROFILE_FULL_SELECT = [
  'id',
  'email',
  'first_name',
  'full_name',
  'position',
  'phone',
  'bio',
  'linkedin_url',
  'timezone',
  'language_pref',
  'avatar_url',
  'avatar_color',
  'role',
  'theme_pref',
  'notif_email',
  'notif_push',
  'company_name',
  'company_desc',
  'company_industry',
  'company_size',
  'company_website',
  'legal_form',
  'vat_number',
  'tax_number',
  'company_address',
  'company_city',
  'company_zip',
  'company_country',
].join(',')

const PROFILE_MIN_SELECT = [
  'id',
  'email',
  'full_name',
].join(',')

function firstNameFromFullName(value: string) {
  return value.trim().split(/\s+/).filter(Boolean)[0] || null
}

function jsonKey(value: Record<string, unknown>) {
  return JSON.stringify(value)
}

function normalizeEmail(value: string | null | undefined) {
  const trimmed = (value ?? '').trim().toLowerCase()
  return trimmed || null
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function missingProfileColumn(error: unknown) {
  const message = String((error as any)?.message ?? '')
  const raw = (
    message.match(/'([^']+)' column/)?.[1] ||
    message.match(/column "?([a-zA-Z0-9_.]+)"? does not exist/)?.[1] ||
    null
  )
  return raw?.split('.').pop() ?? null
}

function profileFallback(id: string, email: string | null): Profile {
  return {
    id,
    email,
    first_name: null,
    full_name: null,
    position: null,
    phone: null,
    bio: null,
    linkedin_url: null,
    timezone: 'Europe/Berlin',
    language_pref: 'de',
    avatar_url: null,
    avatar_color: null,
    role: 'client',
    theme_pref: null,
    notif_email: true,
    notif_push: false,
    company_name: null,
    company_desc: null,
    company_industry: null,
    company_size: null,
    company_website: null,
    legal_form: null,
    vat_number: null,
    tax_number: null,
    company_address: null,
    company_city: null,
    company_zip: null,
    company_country: 'Deutschland',
  }
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

// Workspace types the owner can self-switch between (applies instantly).
const WS_MODES: { id: 'delivery' | 'team' | 'agency'; label: string; short: string }[] = [
  { id: 'delivery', label: 'Festag Delivery', short: 'Festag setzt dein Projekt mit geprüften Entwicklern um.' },
  { id: 'team',     label: 'Team Workspace',  short: 'Internes OS für eigene Projekte, Devs und Aufgaben.' },
  { id: 'agency',   label: 'Agency / White Label', short: 'Kundenprojekte über Festag steuern, optional unter eigener Marke.' },
]

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const params = useParams<{ slug?: string[] }>()
  const pathname = usePathname()
  const slug = params?.slug?.[0] || ''
  const { section, invalid: invalidSlug } = resolveSettingsSection(slug)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [theme, setLocalTheme] = useState<ThemeMode>('light')
  const [font, setLocalFont] = useState<FontMode>('aeonik')
  const [uiDensity, setLocalUiDensity] = useState<UiDensity>('comfortable')
  const [reducedMotion, setLocalReducedMotion] = useState(false)
  const [avatarColor, setLocalAvatarColor] = useState<string>(AVATAR_COLORS[12])
  const [saving, setSaving] = useState(false)
  const [wsMode, setWsMode] = useState<'delivery' | 'team' | 'agency' | null>(null)
  const [wsName, setWsName] = useState<string>('')
  const [wsNameDraft, setWsNameDraft] = useState('')
  const [wsNameSaving, setWsNameSaving] = useState(false)
  const [wsNameStatus, setWsNameStatus] = useState('')
  const [wsId, setWsId] = useState<string | null>(null)
  // Tagro + Reports/Delivery prefs, persisted under workspaces.metadata.settings.
  const [wsSettings, setWsSettings] = useState<Record<string, any>>({})
  const wsMetaRef = useRef<Record<string, any>>({})
  // Live Tagro AI connection status (which model answers).
  const [tagroHealth, setTagroHealth] = useState<{ provider: string; model: string | null; reachable: boolean | null; message?: string } | null>(null)
  const [tagroPinging, setTagroPinging] = useState(false)
  const [switchingMode, setSwitchingMode] = useState(false)
  const [pendingMode, setPendingMode] = useState<'delivery' | 'team' | 'agency' | null>(null)
  type Member = { user_id: string; role: string; joined_at: string; email: string | null; full_name: string | null; avatar_url: string | null }
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [savedTick, setSavedTick] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [profileReady, setProfileReady] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const profileAutosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const companyAutosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const billingAutosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRunRef = useRef(0)
  const profileSnapshotRef = useRef('')
  const companySnapshotRef = useRef('')
  const billingSnapshotRef = useRef('')

  // form state mirrors profile fields so we can edit without rerouting
  const [emailValue, setEmailValue] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailStatus, setEmailStatus] = useState('')
  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [timezone, setTimezone] = useState('Europe/Berlin')
  const [languagePref, setLanguagePref] = useState<LanguageMode>('de')
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
  const [invoiceIban, setInvoiceIban] = useState('')
  const [invoiceBic, setInvoiceBic] = useState('')

  // notifications
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifPush, setNotifPush] = useState(false)
  const [briefingChannels, setBriefingChannels] = useState<BriefingDeliveryChannels>({
    whatsapp: null,
    message: null,
  })
  const [briefingWaDraft, setBriefingWaDraft] = useState('')
  const [briefingMsgChannel, setBriefingMsgChannel] = useState<BriefingMessageChannel>('email')
  const [briefingMsgDraft, setBriefingMsgDraft] = useState('')
  const [briefingDeliveryBusy, setBriefingDeliveryBusy] = useState(false)
  const [briefingWaEditing, setBriefingWaEditing] = useState(false)
  const [briefingMsgEditing, setBriefingMsgEditing] = useState(false)

  // passkeys
  const [passkeys, setPasskeys] = useState<Array<{ id: string; friendly_name: string | null; created_at: string }>>([])
  const [passkeyEnrolling, setPasskeyEnrolling] = useState(false)

  // connected accounts
  const [identities, setIdentities] = useState<Array<{ id: string; provider: string }>>([])
  const [ssoDomainStatus, setSsoDomainStatus] = useState<{
    configured: boolean
    displayName?: string
    domain?: string
  } | null>(null)
  const [ssoRequestBusy, setSsoRequestBusy] = useState(false)
  const [ssoRequestMsg, setSsoRequestMsg] = useState('')
  const [ssoIdpHint, setSsoIdpHint] = useState('')

  useEffect(() => {
    setLocalTheme(getTheme('client'))
    setLocalFont(getFontMode())
    const density = getUiDensity()
    const motion = getReducedMotion()
    setLocalUiDensity(density)
    setLocalReducedMotion(motion)
    applyUiDensity(density)
    document.documentElement.dataset.festagReducedMotion = motion ? '1' : '0'
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) { window.location.href = '/login'; return }

      const uid = session.user.id
      const sessionEmail = normalizeEmail(session.user.email)
      async function readProfile(select: string) {
        return (supabase as any)
          .from('profiles')
          .select(select)
          .eq('id', uid)
          .maybeSingle()
      }

      let row: any = null
      let selectColumns = PROFILE_FULL_SELECT.split(',')
      let loaded: any = null
      for (let attempt = 0; attempt < 16; attempt += 1) {
        loaded = await readProfile(selectColumns.join(','))
        const missing = loaded.error ? missingProfileColumn(loaded.error) : null
        if (!missing) break

        const nextColumns = selectColumns.filter(column => column !== missing)
        selectColumns = nextColumns.length && nextColumns.length !== selectColumns.length
          ? nextColumns
          : PROFILE_MIN_SELECT.split(',')
      }
      if (loaded.error && !missingProfileColumn(loaded.error)) {
        throw loaded.error
      }
      row = loaded.data

      if (cancelled) return
      // Self-heal: some legacy accounts never got a profiles row created.
      // Without one, autosave silently no-ops because `profile` stays
      // null. Insert a stub row so saves always have something to update.
      if (!row) {
        const { data: created } = await (supabase as any)
          .from('profiles')
          .upsert({ id: uid, email: sessionEmail }, { onConflict: 'id' })
          .select(PROFILE_MIN_SELECT)
          .maybeSingle()
        row = created ?? profileFallback(uid, sessionEmail)
      }

      const normalized = { ...profileFallback(uid, sessionEmail), ...row } as Profile
      normalized.email = normalizeEmail((row as any)?.email) ?? sessionEmail
      normalized.avatar_color = normalized.avatar_color || getRememberedProfileAvatarColor(uid)
      const lang = normalized.language_pref === 'en' || normalized.language_pref === 'de'
        ? normalized.language_pref
        : getLanguageMode()

      const loadedName = normalized.full_name || normalized.first_name || ''
      const remembered = getRememberedPersonalDetails()
      const hydratedName = loadedName.trim() || remembered.fullName || ''
      const hydratedPosition = normalized.position?.trim() || remembered.position || ''
      const hydratedPhone = normalized.phone?.trim() || remembered.phone || ''
      // Snapshot = server values so device autofill still triggers one autosave into profiles.
      profileSnapshotRef.current = jsonKey({
        full_name: loadedName.trim() || null,
        first_name: firstNameFromFullName(loadedName),
        position: normalized.position?.trim() || null,
        phone: normalized.phone?.trim() || null,
        bio: normalized.bio?.trim() || null,
        linkedin_url: normalized.linkedin_url?.trim() || null,
        timezone: normalized.timezone?.trim() || 'Europe/Berlin',
        language_pref: lang,
      })
      companySnapshotRef.current = jsonKey({
        company_name: normalized.company_name?.trim() || null,
        company_desc: normalized.company_desc?.trim() || null,
        company_industry: normalized.company_industry || null,
        company_size: normalized.company_size || null,
        company_website: normalized.company_website?.trim() || null,
        legal_form: normalized.legal_form || null,
      })
      billingSnapshotRef.current = jsonKey({
        vat_number: normalized.vat_number?.trim() || null,
        tax_number: normalized.tax_number?.trim() || null,
        company_address: normalized.company_address?.trim() || null,
        company_city: normalized.company_city?.trim() || null,
        company_zip: normalized.company_zip?.trim() || null,
        company_country: normalized.company_country || 'Deutschland',
      })

      setProfile(normalized)
      setEmailValue(normalized.email || '')
      setEmailStatus('')
      setFullName(hydratedName)
      setPosition(hydratedPosition)
      setPhone(hydratedPhone)
      setBio(normalized.bio || '')
      setLinkedinUrl(normalized.linkedin_url || '')
      setTimezone(normalized.timezone || 'Europe/Berlin')
      setLanguagePref(lang)
      setLanguageMode(lang)
      setAvatarUrl(normalized.avatar_url || null)
      if (normalized.avatar_color) setLocalAvatarColor(normalized.avatar_color)
      setCompName(normalized.company_name || '')
      setCompDesc(normalized.company_desc || '')
      setCompIndustry(normalized.company_industry || '')
      setCompSize(normalized.company_size || '')
      setCompWebsite(normalized.company_website || '')
      setLegalForm(normalized.legal_form || '')
      setVatNumber(normalized.vat_number || '')
      setTaxNumber(normalized.tax_number || '')
      setBillAddress(normalized.company_address || '')
      setBillCity(normalized.company_city || '')
      setBillZip(normalized.company_zip || '')
      setBillCountry(normalized.company_country || 'Deutschland')
      if (typeof normalized.notif_email === 'boolean') setNotifEmail(normalized.notif_email)
      if (typeof normalized.notif_push === 'boolean') setNotifPush(normalized.notif_push)
      setProfileReady(true)

      try {
        const deliveryRes = await fetch('/api/briefing/delivery-channels', { credentials: 'include' })
        if (!cancelled && deliveryRes.ok) {
          const deliveryData = await deliveryRes.json().catch(() => null)
          if (deliveryData?.channels) {
            setBriefingChannels(deliveryData.channels)
            setBriefingWaDraft(deliveryData.channels.whatsapp?.phone ?? deliveryData.defaults?.phone ?? '')
            const msg = deliveryData.channels.message
            if (msg) {
              setBriefingMsgChannel(msg.channel)
              setBriefingMsgDraft(msg.destination)
            } else {
              setBriefingMsgChannel('email')
              setBriefingMsgDraft(deliveryData.defaults?.email ?? normalized.email ?? '')
            }
          }
        }
      } catch { /* optional */ }

      // Workspace (Primary Mode + name + members) — Settings → Workspace card
      try {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id,mode,name,metadata')
          .eq('primary_owner_id', uid)
          .eq('is_personal', true)
          .maybeSingle()
        if (!cancelled && ws) {
          setWsMode((ws as any).mode ?? null)
          setWsName((ws as any).name ?? '')
          setWsNameDraft((ws as any).name ?? '')
          setWsId((ws as any).id ?? null)
          wsMetaRef.current = ((ws as any).metadata ?? {}) as Record<string, any>
          setWsSettings((wsMetaRef.current.settings ?? {}) as Record<string, any>)

          const { data: branding } = await supabase.from('workspace_branding')
            .select('invoice_iban,invoice_bic,invoice_vat_id,invoice_company_address')
            .eq('workspace_id', (ws as any).id)
            .maybeSingle()
          if (!cancelled && branding) {
            const iban = (branding as any).invoice_iban || ''
            const bic = (branding as any).invoice_bic || ''
            setInvoiceIban(iban)
            setInvoiceBic(bic)
            if ((branding as any).invoice_vat_id && !normalized.vat_number) {
              setVatNumber((branding as any).invoice_vat_id)
            }
            billingSnapshotRef.current = jsonKey({
              vat_number: ((branding as any).invoice_vat_id || normalized.vat_number || '').trim() || null,
              tax_number: normalized.tax_number?.trim() || null,
              company_address: normalized.company_address?.trim() || null,
              company_city: normalized.company_city?.trim() || null,
              company_zip: normalized.company_zip?.trim() || null,
              company_country: normalized.company_country || 'Deutschland',
              invoice_iban: iban || null,
              invoice_bic: bic || null,
            })
          }

          // Load members with profile join
          setMembersLoading(true)
          const { data: rows } = await supabase
            .from('workspace_members')
            .select('user_id,role,joined_at')
            .eq('workspace_id', (ws as any).id)
            .order('joined_at', { ascending: true })
          const memberIds = ((rows as any[]) ?? []).map(r => r.user_id)
          let profilesById: Record<string, any> = {}
          if (memberIds.length) {
            const { data: profs } = await supabase
              .from('profiles').select('id,email,full_name,avatar_url').in('id', memberIds)
            ;(profs as any[] ?? []).forEach(p => { profilesById[p.id] = p })
          }
          if (!cancelled) {
            setMembers(((rows as any[]) ?? []).map(r => ({
              user_id: r.user_id,
              role: r.role,
              joined_at: r.joined_at,
              email: profilesById[r.user_id]?.email ?? null,
              full_name: profilesById[r.user_id]?.full_name ?? null,
              avatar_url: profilesById[r.user_id]?.avatar_url ?? null,
            })))
            setMembersLoading(false)
          }
        }
      } catch {}

      // factors (passkeys)
      try {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const webauthnFactors = (factors as any)?.all?.filter((f: any) => f.factor_type === 'webauthn') || []
        setPasskeys(webauthnFactors.map((f: any) => ({ id: f.id, friendly_name: f.friendly_name, created_at: f.created_at })))
      } catch {}

      // identities (Google etc.)
      setIdentities((session.user.identities || []).map(i => ({ id: i.id, provider: i.provider })))

      const emailDomain = extractSsoDomain(sessionEmail || '')
      if (emailDomain) {
        checkSsoDomain(emailDomain)
          .then(status => {
            if (!cancelled) {
              setSsoDomainStatus({
                configured: status.configured,
                displayName: status.displayName,
                domain: status.domain || emailDomain,
              })
            }
          })
          .catch(() => {
            if (!cancelled) setSsoDomainStatus({ configured: false, domain: emailDomain })
          })
      }
    })().catch((e: any) => {
      if (!cancelled) {
        setError(e?.message || 'Konnte Einstellungen nicht laden.')
        setProfileReady(true)
      }
    })
    return () => { cancelled = true }
  }, [supabase])

  function flashSaved(label: string) {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    setSavedTick(label)
    savedTimerRef.current = setTimeout(() => setSavedTick(null), 1600)
  }

  async function updateProfileFields(patch: Record<string, any>) {
    const dropped: string[] = []
    if (!profile) return { dropped: Object.keys(patch) }
    let payload = { ...patch }

    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (Object.keys(payload).length === 0) return { dropped }
      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update(payload)
        .eq('id', profile.id)
      if (!updateError) return { dropped }

      const missing = missingProfileColumn(updateError)
      if (missing && Object.prototype.hasOwnProperty.call(payload, missing)) {
        const { [missing]: _removed, ...rest } = payload
        payload = rest
        dropped.push(missing)
        continue
      }
      throw updateError
    }
    return { dropped }
  }

  function queueAutosave(
    ref: MutableRefObject<ReturnType<typeof setTimeout> | null>,
    task: () => Promise<void>,
    delay = 650,
  ) {
    if (ref.current) clearTimeout(ref.current)
    setError('')
    setSaving(true)
    setSavedTick('Speichert automatisch…')
    ref.current = setTimeout(() => {
      ref.current = null
      const runId = ++saveRunRef.current
      task()
        .then(() => {
          if (runId === saveRunRef.current) {
            setSaving(false)
            flashSaved('Alle Änderungen gespeichert')
          }
        })
        .catch((e: any) => {
          if (runId === saveRunRef.current) setSaving(false)
          setError(e?.message || 'Konnte nicht speichern.')
        })
    }, delay)
  }

  function profilePatch() {
    const trimmedName = fullName.trim()
    return {
      full_name: trimmedName || null,
      first_name: firstNameFromFullName(trimmedName),
      position: position.trim() || null,
      phone: phone.trim() || null,
      bio: bio.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      timezone: timezone.trim() || 'Europe/Berlin',
      language_pref: languagePref,
    }
  }

  function companyPatch() {
    return {
      company_name: compName.trim() || null,
      company_desc: compDesc.trim() || null,
      company_industry: compIndustry || null,
      company_size: compSize || null,
      company_website: compWebsite.trim() || null,
      legal_form: legalForm || null,
    }
  }

  function billingPatch() {
    return {
      vat_number: vatNumber.trim() || null,
      tax_number: taxNumber.trim() || null,
      company_address: billAddress.trim() || null,
      company_city: billCity.trim() || null,
      company_zip: billZip.trim() || null,
      company_country: billCountry || null,
      invoice_iban: invoiceIban.trim() || null,
      invoice_bic: invoiceBic.trim() || null,
    }
  }

  async function syncWorkspaceInvoiceBranding() {
    if (!wsId) return
    const address = [billAddress.trim(), `${billZip.trim()} ${billCity.trim()}`.trim(), billCountry]
      .filter(Boolean)
      .join('\n')
    await supabase.from('workspace_branding').upsert({
      workspace_id: wsId,
      invoice_company_name: compName.trim() || fullName.trim() || null,
      invoice_company_address: address || null,
      invoice_iban: invoiceIban.trim() || null,
      invoice_bic: invoiceBic.trim() || null,
      invoice_vat_id: vatNumber.trim() || taxNumber.trim() || null,
      mail_from: profile?.email || emailValue.trim() || null,
    }, { onConflict: 'workspace_id' })
  }

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      if (profileAutosaveRef.current) clearTimeout(profileAutosaveRef.current)
      if (companyAutosaveRef.current) clearTimeout(companyAutosaveRef.current)
      if (billingAutosaveRef.current) clearTimeout(billingAutosaveRef.current)
    }
  }, [])

  useEffect(() => {
    if (!profileReady || !profile) return
    const trimmedName = fullName.trim()
    broadcastProfileSync({
      fullName: trimmedName || null,
      firstName: firstNameFromFullName(trimmedName),
    })
  }, [fullName, profileReady, profile])

  useEffect(() => {
    if (!profileReady) return
    setLanguageMode(languagePref)
  }, [languagePref, profileReady])

  useEffect(() => {
    if (!profileReady || !profile) return
    const patch = profilePatch()
    const key = jsonKey(patch)
    if (key === profileSnapshotRef.current) return

    queueAutosave(profileAutosaveRef, async () => {
      await updateProfileFields(patch)
      profileSnapshotRef.current = key
      setProfile(prev => prev ? { ...prev, ...patch } as Profile : prev)
      rememberPersonalDetails({
        userId: profile.id,
        fullName: patch.full_name,
        position: patch.position,
        phone: patch.phone,
      })
    })
  }, [fullName, position, phone, bio, linkedinUrl, timezone, languagePref, profileReady, profile])

  useEffect(() => {
    if (!profileReady || !profile) return
    const patch = companyPatch()
    const key = jsonKey(patch)
    if (key === companySnapshotRef.current) return

    queueAutosave(companyAutosaveRef, async () => {
      await updateProfileFields(patch)
      companySnapshotRef.current = key
      setProfile(prev => prev ? { ...prev, ...patch } as Profile : prev)
    })
  }, [compName, compDesc, compIndustry, compSize, compWebsite, legalForm, profileReady, profile])

  useEffect(() => {
    if (!profileReady || !profile) return
    const patch = billingPatch()
    const key = jsonKey(patch)
    if (key === billingSnapshotRef.current) return

    queueAutosave(billingAutosaveRef, async () => {
      await updateProfileFields({
        vat_number: vatNumber.trim() || null,
        tax_number: taxNumber.trim() || null,
        company_address: billAddress.trim() || null,
        company_city: billCity.trim() || null,
        company_zip: billZip.trim() || null,
        company_country: billCountry || null,
      })
      await syncWorkspaceInvoiceBranding()
      billingSnapshotRef.current = key
      setProfile(prev => prev ? {
        ...prev,
        vat_number: vatNumber.trim() || null,
        tax_number: taxNumber.trim() || null,
        company_address: billAddress.trim() || null,
        company_city: billCity.trim() || null,
        company_zip: billZip.trim() || null,
        company_country: billCountry || null,
      } as Profile : prev)
    })
  }, [vatNumber, taxNumber, billAddress, billZip, billCity, billCountry, invoiceIban, invoiceBic, compName, fullName, wsId, profileReady, profile, emailValue])

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
        await updateProfileFields({ avatar_url: url })
        setAvatarUrl(url)
        setProfile(prev => prev ? { ...prev, avatar_url: url } as Profile : prev)
        broadcastProfileSync({ avatarUrl: url })
        flashSaved('Profilbild aktualisiert')
      }
    } catch (e: any) {
      setError(e?.message || 'Bild konnte nicht hochgeladen werden.')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function removeAvatarImage() {
    if (!profile || !avatarUrl || avatarUploading) return
    const previous = avatarUrl
    setError('')
    setAvatarUrl(null)
    setProfile(prev => prev ? { ...prev, avatar_url: null } as Profile : prev)
    broadcastProfileSync({ avatarUrl: null })
    try {
      await updateProfileFields({ avatar_url: null })
      flashSaved('Profilbild entfernt')
    } catch (e: any) {
      setAvatarUrl(previous)
      setProfile(prev => prev ? { ...prev, avatar_url: previous } as Profile : prev)
      broadcastProfileSync({ avatarUrl: previous })
      setError(e?.message || 'Profilbild konnte nicht entfernt werden.')
    }
  }

  async function commitEmailChange() {
    if (!profile || emailSaving) return
    const nextEmail = normalizeEmail(emailValue)
    const currentEmail = normalizeEmail(profile.email)

    if (!nextEmail) {
      setEmailValue(currentEmail || '')
      setEmailStatus('E-Mail kann nicht leer sein.')
      return
    }
    if (!isValidEmail(nextEmail)) {
      setEmailStatus('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    if (nextEmail === currentEmail) {
      setEmailStatus('')
      setEmailValue(currentEmail || '')
      return
    }

    setEmailSaving(true)
    setEmailStatus('')
    setError('')
    try {
      const { error: updateError } = await (supabase.auth as any).updateUser(
        { email: nextEmail },
        { emailRedirectTo: `${window.location.origin}/auth/callback?next=/settings` },
      )
      if (updateError) throw updateError

      rememberFestagEmail(
        profile.id,
        nextEmail,
        identities.find(i => i.provider === 'google') ? 'google' : 'email',
      )
      setProfile(prev => prev ? { ...prev, email: nextEmail } as Profile : prev)
      setEmailValue(nextEmail)
      broadcastProfileSync({ email: nextEmail })
      setEmailStatus('Bestätigungslink gesendet. Danach nutzt der Login diese Adresse.')
      flashSaved('E-Mail-Bestätigung gesendet')
    } catch (e: any) {
      setEmailStatus(e?.message || 'E-Mail konnte nicht geändert werden.')
    } finally {
      setEmailSaving(false)
    }
  }

  function pickTheme(mode: ThemeMode) {
    setLocalTheme(mode)
    applyThemeMode(mode, 'client')
    if (profile) {
      updateProfileFields({ theme_pref: mode }).catch(() => undefined)
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
    if (profile) rememberProfileAvatarColor(profile.id, color)
    broadcastProfileSync({ avatarColor: color })
    if (profile) {
      try {
        const result = await updateProfileFields({ avatar_color: color })
        setProfile(prev => prev ? { ...prev, avatar_color: color } as Profile : prev)
        flashSaved(result.dropped.includes('avatar_color')
          ? 'Profilfarbe auf diesem Gerät gespeichert'
          : 'Profilfarbe gespeichert')
      } catch {}
    } else {
      flashSaved('Profilfarbe gespeichert')
    }
  }

  async function pickWorkspaceColor(color: string) {
    // Live preview app-wide, then persist into workspaces.metadata.settings.
    broadcastWorkspaceAccent(color)
    await saveWsSetting('workspace_color', color)
  }

  async function commitWorkspaceName() {
    if (!wsId || wsNameSaving) return
    const next = normalizeWorkspaceName(wsNameDraft)
    if (!next) {
      setWsNameDraft(wsName)
      setWsNameStatus('Bitte einen Workspace-Namen eingeben.')
      return
    }
    if (next === normalizeWorkspaceName(wsName)) {
      setWsNameDraft(wsName)
      setWsNameStatus('')
      return
    }

    setWsNameSaving(true)
    setWsNameStatus('Wird geprüft…')
    setError('')
    try {
      const checkRes = await fetch(
        `/api/workspaces/check-name?name=${encodeURIComponent(next)}&excludeId=${encodeURIComponent(wsId)}`,
        { credentials: 'include' },
      )
      const check = await checkRes.json().catch(() => null)
      if (!check?.ok || !check.available) {
        setWsNameStatus(check?.reason || 'Dieser Workspace-Name ist bereits vergeben.')
        setWsNameSaving(false)
        return
      }

      setWsNameStatus('Wird gespeichert…')
      const bootRes = await fetch('/api/workspaces/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: next }),
        credentials: 'include',
      })
      const boot = await bootRes.json().catch(() => null)
      if (!bootRes.ok || !boot?.ok) {
        setWsNameStatus(boot?.message || 'Speichern fehlgeschlagen.')
        setWsNameSaving(false)
        return
      }

      const saved = boot?.workspace?.name || next
      setWsName(saved)
      setWsNameDraft(saved)
      rememberWorkspaceName(saved)
      try {
        const last = getLastFestagAccount()
        if (last) {
          rememberFestagAccount({
            userId: last.userId,
            email: last.email,
            method: last.method,
            onboardingCompleted: last.onboardingCompleted,
            workspaceName: saved,
          })
        }
      } catch { /* device memory is best-effort */ }
      setWsNameStatus('')
      flashSaved('Workspace-Name gespeichert')
    } catch (e: any) {
      setWsNameStatus(e?.message || 'Speichern fehlgeschlagen.')
    } finally {
      setWsNameSaving(false)
    }
  }

  async function changeMemberRole(userId: string, role: string) {
    if (!wsId) return
    setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m))
    try {
      await supabase.from('workspace_members').update({ role }).eq('workspace_id', wsId).eq('user_id', userId)
      flashSaved('Rolle aktualisiert')
    } catch (e: any) { setError(e?.message || 'Konnte Rolle nicht ändern.') }
  }

  async function removeMember(userId: string) {
    if (!wsId) return
    setMembers(prev => prev.filter(m => m.user_id !== userId))
    try {
      await supabase.from('workspace_members').delete().eq('workspace_id', wsId).eq('user_id', userId)
      flashSaved('Mitglied entfernt')
    } catch (e: any) { setError(e?.message || 'Konnte Mitglied nicht entfernen.') }
  }

  // Self-service workspace-type switch — confirmed in a popup, then applied
  // instantly (no Festag request). RLS allows the owner to update mode directly.
  async function changeWorkspaceMode(newMode: 'delivery' | 'team' | 'agency') {
    if (!wsId || switchingMode || newMode === wsMode) return
    const prev = wsMode
    setSwitchingMode(true)
    setWsMode(newMode) // optimistic
    try {
      const { error: updErr } = await supabase.from('workspaces').update({ mode: newMode }).eq('id', wsId)
      if (updErr) { setWsMode(prev); setError(updErr.message || 'Wechsel fehlgeschlagen.'); return }
      broadcastWorkspaceDbMode(newMode)
      flashSaved('Workspace-Typ gewechselt')
    } catch (e: any) {
      setWsMode(prev); setError(e?.message || 'Wechsel fehlgeschlagen.')
    } finally {
      setSwitchingMode(false)
      setPendingMode(null)
    }
  }

  // Load the live Tagro AI connection status once (which provider/model answers).
  useEffect(() => {
    let cancelled = false
    fetch('/api/tagro/health')
      .then(r => r.json())
      .then(d => { if (!cancelled) setTagroHealth(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  async function pingTagro() {
    setTagroPinging(true)
    try {
      const r = await fetch('/api/tagro/health?ping=1')
      setTagroHealth(await r.json())
    } catch {/* keep prior */} finally {
      setTagroPinging(false)
    }
  }

  // Tagro + Reports/Delivery prefs → workspaces.metadata.settings (jsonb merge).
  async function saveWsSetting(key: string, value: any) {
    if (!wsId) return
    const prev = wsSettings
    const nextSettings = { ...wsSettings, [key]: value }
    setWsSettings(nextSettings) // optimistic
    const nextMeta = { ...wsMetaRef.current, settings: nextSettings }
    try {
      const { error: updErr } = await supabase.from('workspaces').update({ metadata: nextMeta }).eq('id', wsId)
      if (updErr) { setWsSettings(prev); setError(updErr.message || 'Speichern fehlgeschlagen.'); return }
      wsMetaRef.current = nextMeta
      flashSaved('Gespeichert')
    } catch (e: any) {
      setWsSettings(prev); setError(e?.message || 'Speichern fehlgeschlagen.')
    }
  }

  async function saveNotif(next: Partial<{ email: boolean; push: boolean }>) {
    if (!profile) return
    if (typeof next.push === 'boolean' && next.push) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = Notification.permission
        if (perm === 'denied') {
          setError('Push ist im Browser blockiert. Erlaube Benachrichtigungen in den Browser-Einstellungen.')
          return
        }
        if (perm === 'default') {
          const result = await Notification.requestPermission()
          if (result !== 'granted') {
            setError('Push-Benachrichtigungen wurden nicht erlaubt.')
            return
          }
        }
      }
    }
    if (typeof next.email === 'boolean') setNotifEmail(next.email)
    if (typeof next.push === 'boolean')  setNotifPush(next.push)
    await updateProfileFields({
      notif_email: next.email ?? notifEmail,
      notif_push:  next.push  ?? notifPush,
    })
    flashSaved('Benachrichtigungen gespeichert')
  }

  async function patchBriefingDelivery(body: Record<string, unknown>) {
    setBriefingDeliveryBusy(true)
    setError('')
    try {
      const res = await fetch('/api/briefing/delivery-channels', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError('Briefing-Kanal konnte nicht gespeichert werden.')
        return false
      }
      if (data.channels) {
        setBriefingChannels(data.channels)
        setBriefingWaDraft(data.channels.whatsapp?.phone ?? briefingWaDraft)
        if (data.channels.message) {
          setBriefingMsgChannel(data.channels.message.channel)
          setBriefingMsgDraft(data.channels.message.destination)
        }
      }
      return true
    } catch {
      setError('Briefing-Kanal konnte nicht gespeichert werden.')
      return false
    } finally {
      setBriefingDeliveryBusy(false)
    }
  }

  async function saveBriefingWhatsApp() {
    const phone = normalizeBriefingPhone(briefingWaDraft)
    if (!phone) {
      setError('Bitte eine gültige WhatsApp-Nummer eingeben.')
      return
    }
    const ok = await patchBriefingDelivery({ action: 'link', channel: 'whatsapp', phone })
    if (ok) {
      setBriefingWaEditing(false)
      flashSaved('WhatsApp für Briefings verknüpft')
    }
  }

  async function saveBriefingMessage() {
    const body: Record<string, unknown> = {
      action: 'link',
      channel: 'message',
      messageChannel: briefingMsgChannel,
    }
    if (briefingMsgChannel === 'email') {
      const email = briefingMsgDraft.trim().toLowerCase()
      if (!isValidBriefingEmail(email)) {
        setError('Bitte eine gültige E-Mail-Adresse eingeben.')
        return
      }
      body.destination = email
    } else {
      const phone = normalizeBriefingPhone(briefingMsgDraft)
      if (!phone) {
        setError('Bitte eine gültige SMS-Nummer eingeben.')
        return
      }
      body.destination = phone
    }
    const ok = await patchBriefingDelivery(body)
    if (ok) {
      setBriefingMsgEditing(false)
      flashSaved('Nachrichtenkanal für Briefings verknüpft')
    }
  }

  async function unlinkBriefingChannel(channel: 'whatsapp' | 'message') {
    const ok = await patchBriefingDelivery({ action: 'unlink', channel })
    if (!ok) return
    if (channel === 'whatsapp') {
      setBriefingWaEditing(false)
      flashSaved('WhatsApp-Verknüpfung entfernt')
    } else {
      setBriefingMsgEditing(false)
      flashSaved('Nachrichten-Verknüpfung entfernt')
    }
  }

  async function connectGoogle() {
    setError('')
    try {
      const { error: oauthErr } = await supabase.auth.linkIdentity({ provider: 'google' })
      if (oauthErr) throw oauthErr
    } catch (e: any) {
      setError(e?.message || 'Google-Verbindung konnte nicht gestartet werden.')
    }
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

  const initials = (fullName || emailValue || profile?.email || 'F')
    .split(' ').map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase() || 'F'
  // Profile completion: avatar, name, position, phone, email, bio,
  // linkedin → 7 slots, each contributes equally.
  const completionChecks = [
    !!fullName.trim(),
    !!position.trim(),
    !!phone.trim(),
    !!(emailValue || profile?.email),
    !!bio.trim(),
    !!linkedinUrl.trim(),
  ]
  const profileCompletion = completionChecks.filter(Boolean).length
  const profileCompletionPct = Math.round((profileCompletion / completionChecks.length) * 100)
  const roleLabel = profile?.role === 'dev'
    ? 'Developer'
    : profile?.role === 'admin'
      ? 'Admin'
      : 'Client'
  const loginLabel = identities.find(i => i.provider === 'google') ? 'Google + Magic-Link' : 'Magic-Link'
  const avatarFg = avatarTextColor(avatarColor)

  const savedLabel = saving ? 'Speichert automatisch…' : (savedTick || '')

  return (
    <div className="set set-codex" data-density={uiDensity}>
      <style>{SETTINGS_CODEX_CSS}</style>

      <SettingsMobileShell
        section={section}
        pathname={pathname}
        savedLabel={savedLabel}
        invalidSlug={invalidSlug}
      >
      <main className="set-main">
        {invalidSlug && (
          <div className="set-invalid-banner">
            Dieser Einstellungsbereich existiert nicht.{' '}
            <Link href={settingsHref('')}>Zurück zu Profil</Link>
          </div>
        )}
        {error && <div className="set-error">{error}</div>}

        {!profileReady && section !== 'documents' ? (
          <SettingsLoadingSkeleton />
        ) : invalidSlug ? null : (
        <>
        {section === 'profile' && (
          <div className="set-profile-layout">
            <div>
            <p className="set-section-title">Grunddaten</p>
            <div className="set-card">
              <div className="set-row">
                <div>
                  <div className="set-label">E-Mail</div>
                  <div className="set-label-sub">Wird für Magic-Link-Anmeldungen genutzt. Änderungen müssen per Link bestätigt werden.</div>
                </div>
                <div className="set-field-stack">
                  <input
                    className="set-input"
                    type="email"
                    autoComplete="email"
                    value={emailValue}
                    disabled={emailSaving}
                    onChange={e => {
                      setEmailValue(e.target.value)
                      if (emailStatus) setEmailStatus('')
                    }}
                    onBlur={commitEmailChange}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                      if (e.key === 'Escape') {
                        setEmailValue(profile?.email || '')
                        setEmailStatus('')
                        e.currentTarget.blur()
                      }
                    }}
                    placeholder="name@firma.de"
                  />
                  {(emailSaving || emailStatus) && (
                    <div className="set-field-note">
                      {emailSaving ? 'E-Mail-Änderung wird vorbereitet…' : emailStatus}
                    </div>
                  )}
                </div>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-label">Anzeigename</div>
                  <div className="set-label-sub">So erscheint dein Profil in Kommentaren und Projektfreigaben.</div>
                </div>
                <div className="set-value">{fullName.trim() || (emailValue || profile?.email || '').split('@')[0] || 'Noch nicht gesetzt'}</div>
              </div>
              <div className="set-row">
                <div className="set-label">Vollständiger Name</div>
                <input
                  className="set-input"
                  type="text"
                  name="name"
                  autoComplete="name"
                  autoCapitalize="words"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="z. B. Stefan Dirnberger"
                />
              </div>
            </div>

            <p className="set-section-title">Kontakt</p>
            <div className="set-card">
              <div className="set-row">
                <div>
                  <div className="set-label">Position</div>
                  <div className="set-label-sub">Optional. Z. B. Startupgründer, Agentur-Lead.</div>
                </div>
                <input
                  className="set-input"
                  type="text"
                  name="organization-title"
                  autoComplete="organization-title"
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
                  name="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Optional, z. B. +49 151 23456789"
                />
              </div>
              <div className="set-row">
                <div>
                  <div className="set-label">LinkedIn</div>
                  <div className="set-label-sub">Optional. Wird Mitwirkenden in deinem Workspace angezeigt.</div>
                </div>
                <input
                  className="set-input"
                  type="url"
                  value={linkedinUrl}
                  onChange={e => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/…"
                />
              </div>
            </div>

            <p className="set-section-title">Über dich</p>
            <div className="set-card">
              <div className="set-row set-row-stack">
                <div>
                  <div className="set-label">Kurze Bio</div>
                  <div className="set-label-sub">Ein bis zwei Sätze über dich. Tagro nutzt das als Kontext, wenn neue Mitwirkende dazukommen.</div>
                </div>
                <textarea
                  className="set-input"
                  rows={3}
                  maxLength={400}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="z. B. „Startupgründer aus München, Schwerpunkt SaaS und Operations."
                  style={{ resize: 'vertical', minHeight: 76, lineHeight: 1.55 }}
                />
              </div>
            </div>

            <p className="set-section-title">Lokale Einstellungen</p>
            <div className="set-card">
              <div className="set-row">
                <div>
                  <div className="set-label">Zeitzone</div>
                  <div className="set-label-sub">Beeinflusst, wann Tagro Daily-Notes und tägliche Briefings ausspielt.</div>
                </div>
                <select
                  className="set-select"
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                >
                  <option value="Europe/Berlin">Europe/Berlin (Berlin, Wien, Zürich)</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Lisbon">Europe/Lisbon</option>
                  <option value="Europe/Athens">Europe/Athens</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                  <option value="Asia/Singapore">Asia/Singapore</option>
                  <option value="Australia/Sydney">Australia/Sydney</option>
                </select>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-label">Sprache</div>
                  <div className="set-label-sub">In welcher Sprache Tagro mit dir spricht.</div>
                </div>
                <div className="set-segment">
                  <button
                    type="button"
                    className={`set-segment-btn${languagePref === 'de' ? ' on' : ''}`}
                    onClick={() => setLanguagePref('de')}
                  >Deutsch</button>
                  <button
                    type="button"
                    className={`set-segment-btn${languagePref === 'en' ? ' on' : ''}`}
                    onClick={() => setLanguagePref('en')}
                  >English</button>
                </div>
              </div>
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
            <div className="set-row set-row-stack">
              <div>
                <div className="set-label">Workspace-Symbol</div>
                <div className="set-label-sub">Form und Farbe deines Workspace-Marks. Wird sofort im Sidebar übernommen.</div>
              </div>
              <WorkspaceSymbolSettings workspaceName={wsName} />
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Dichte</div>
                <div className="set-label-sub">Kompakt für Power-User — mehr Zeilen auf einen Blick.</div>
              </div>
              <div className="set-segment">
                <button
                  type="button"
                  className={uiDensity === 'comfortable' ? 'on' : ''}
                  onClick={() => {
                    setLocalUiDensity('comfortable')
                    setUiDensity('comfortable')
                    flashSaved('Dichte gespeichert')
                  }}
                >
                  Normal
                </button>
                <button
                  type="button"
                  className={uiDensity === 'compact' ? 'on' : ''}
                  onClick={() => {
                    setLocalUiDensity('compact')
                    setUiDensity('compact')
                    flashSaved('Dichte gespeichert')
                  }}
                >
                  Kompakt
                </button>
              </div>
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Reduzierte Bewegung</div>
                <div className="set-label-sub">Weniger Animationen — ruhigeres Interface.</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className={`set-toggle${reducedMotion ? ' on' : ''}`}
                  onClick={() => {
                    const next = !reducedMotion
                    setLocalReducedMotion(next)
                    setReducedMotion(next)
                    flashSaved('Erscheinung gespeichert')
                  }}
                  aria-label="Reduzierte Bewegung"
                />
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
                    Du meldest dich per Magic-Link, Google, Passkey oder Firmen-SSO an. Keine Passwörter, kein Phishing.
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
                  <div className="set-label">Firmen-Login (SSO)</div>
                  <div className="set-label-sub">
                    {identities.some(i => isSsoProvider(i.provider))
                      ? 'Du meldest dich über den Firmen-Login deines Unternehmens an — ohne separates Festag-Passwort.'
                      : ssoDomainStatus?.configured
                        ? `Für ${ssoDomainStatus.displayName || ssoDomainStatus.domain} ist Firmen-SSO freigeschaltet. Anmelden über Login → Single Sign-On.`
                        : 'Enterprise-Kunden melden sich mit Okta, Microsoft Entra oder Google Workspace an. Das reduziert IT-Risiko und beschleunigt Security-Freigaben — einmaliges Setup durch Festag.'}
                  </div>
                </div>
                <div className="set-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, width: '100%' }}>
                  <span>
                    {identities.some(i => isSsoProvider(i.provider))
                      ? 'Firmen-SSO aktiv'
                      : ssoDomainStatus?.configured
                        ? `Verfügbar (${ssoDomainStatus.displayName || ssoDomainStatus.domain})`
                        : 'Enterprise-Addon'}
                  </span>
                  {!identities.some(i => isSsoProvider(i.provider)) && !ssoDomainStatus?.configured && (
                    <>
                      <input
                        className="set-input"
                        value={ssoIdpHint}
                        onChange={e => setSsoIdpHint(e.target.value)}
                        placeholder="IdP (Okta / Entra / Google Workspace)"
                        style={{ width: '100%', maxWidth: 320 }}
                      />
                      <button
                        type="button"
                        className="set-btn"
                        disabled={ssoRequestBusy}
                        onClick={async () => {
                          const domain =
                            ssoDomainStatus?.domain ||
                            extractSsoDomain(emailValue || '') ||
                            ''
                          if (!domain) {
                            setSsoRequestMsg('Bitte zuerst eine Firmen-E-Mail im Profil hinterlegen.')
                            return
                          }
                          setSsoRequestBusy(true)
                          setSsoRequestMsg('')
                          const res = await requestSsoSetup({
                            domain,
                            workspaceId: wsId,
                            workspaceName: wsName || null,
                            idpHint: ssoIdpHint.trim() || null,
                          })
                          setSsoRequestBusy(false)
                          setSsoRequestMsg(res.message)
                          if (res.alreadyActive) {
                            setSsoDomainStatus({
                              configured: true,
                              domain,
                              displayName: domain,
                            })
                          }
                        }}
                      >
                        {ssoRequestBusy ? 'Wird gesendet…' : 'SSO anfragen'}
                      </button>
                      {ssoRequestMsg && (
                        <div className="set-label-sub" style={{ marginTop: 0, textAlign: 'right' }}>
                          {ssoRequestMsg}
                        </div>
                      )}
                    </>
                  )}
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

            {/* Einführung erneut starten */}            <div className="set-card">
              <div className="set-row set-row-stack">
                <div>
                  <div className="set-label">Einführung erneut starten</div>
                  <div className="set-label-sub">
                    Spielt die kurze Tour ab, die Dashboard, Projekte, Statusabfrage, Tagro und Teams erklärt. Bestehende Daten bleiben unberührt.
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                  <button
                    className="set-btn"
                    onClick={async () => {
                      const { data: { user } } = await supabase.auth.getUser()
                      if (!user) { setError('Bitte erneut anmelden.'); return }
                      await supabase
                        .from('profiles')
                        .update({ tour_completed_at: null, tour_step: 0 })
                        .eq('id', user.id)
                      try {
                        window.localStorage.removeItem('festag_tour_completed')
                        window.localStorage.setItem('festag_onboarding_status', 'not_started')
                      } catch {}
                      window.location.href = '/dashboard?tour=1'
                    }}
                  >
                    Tour starten
                  </button>
                </div>
              </div>
            </div>

            {/* Konto löschen */}
            <div className="set-card">
              <div className="set-row set-row-stack">
                <div>
                  <div className="set-label">Konto löschen</div>
                  <div className="set-label-sub">
                    Beendet deinen Festag-Zugang endgültig. Workspaces, Projekte, Briefings, Inbox-Items und Tagro-Memory werden mitgelöscht. Diese Aktion ist nicht rückgängig zu machen.
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                  <button className="set-btn set-btn-danger" onClick={() => setDeleteOpen(true)}>
                    Konto löschen
                  </button>
                </div>
              </div>
            </div>

            {deleteOpen && (
              <AccountDeleteModal onClose={() => setDeleteOpen(false)} />
            )}
          </>
        )}

        {section === 'notifications' && (
          <div className="set-card">
            <div className="set-row">
              <div>
                <div className="set-label">E-Mail-Benachrichtigungen</div>
                <div className="set-label-sub">Tagro-Updates, Aufgaben, Projektbriefings.</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className={`set-toggle${notifEmail ? ' on' : ''}`}
                  onClick={() => saveNotif({ email: !notifEmail })}
                  aria-label="E-Mail-Benachrichtigungen"
                  aria-pressed={notifEmail}
                />
              </div>
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Push-Benachrichtigungen</div>
                <div className="set-label-sub">Browser-Push — erfordert Erlaubnis in diesem Gerät.</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className={`set-toggle${notifPush ? ' on' : ''}`}
                  onClick={() => saveNotif({ push: !notifPush })}
                  aria-label="Push-Benachrichtigungen"
                  aria-pressed={notifPush}
                />
              </div>
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Entscheidungen & Freigaben</div>
                <div className="set-label-sub">Sofort, wenn eine Freigabe auf dich wartet.</div>
              </div>
              <div className="set-segment">
                <button type="button" className={`set-segment-btn${(wsSettings.notif_decisions ?? true) ? ' on' : ''}`} onClick={() => saveWsSetting('notif_decisions', true)}>An</button>
                <button type="button" className={`set-segment-btn${!(wsSettings.notif_decisions ?? true) ? ' on' : ''}`} onClick={() => saveWsSetting('notif_decisions', false)}>Aus</button>
              </div>
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Wöchentliche Zusammenfassung</div>
                <div className="set-label-sub">Executive Summary — Montagmorgen, bevor der Kunde fragt.</div>
              </div>
              <div className="set-segment">
                <button type="button" className={`set-segment-btn${(wsSettings.notif_weekly_summary ?? false) ? ' on' : ''}`} onClick={() => saveWsSetting('notif_weekly_summary', true)}>An</button>
                <button type="button" className={`set-segment-btn${!(wsSettings.notif_weekly_summary ?? false) ? ' on' : ''}`} onClick={() => saveWsSetting('notif_weekly_summary', false)}>Aus</button>
              </div>
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Ruhezeiten</div>
                <div className="set-label-sub">Keine Pushs zwischen 22:00 und 08:00 (Gerätezeit).</div>
              </div>
              <div className="set-segment">
                <button type="button" className={`set-segment-btn${(wsSettings.notif_quiet_hours ?? true) ? ' on' : ''}`} onClick={() => saveWsSetting('notif_quiet_hours', true)}>An</button>
                <button type="button" className={`set-segment-btn${!(wsSettings.notif_quiet_hours ?? true) ? ' on' : ''}`} onClick={() => saveWsSetting('notif_quiet_hours', false)}>Aus</button>
              </div>
            </div>
          </div>
        )}

        {section === 'notifications' && (
          <div className="set-card" style={{ marginTop: 14 }}>
            <div className="set-row" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="set-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <WhatsAppBrandIcon size={16} />
                  WhatsApp-Briefing
                </div>
                <div className="set-label-sub">
                  {briefingChannels.whatsapp
                    ? `Verknüpft mit ${formatBriefingPhoneDisplay(briefingChannels.whatsapp.phone)}`
                    : 'Einmal im Briefing verknüpfen oder hier einrichten.'}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                {briefingChannels.whatsapp && !briefingWaEditing ? (
                  <>
                    <button
                      type="button"
                      className="set-btn"
                      disabled={briefingDeliveryBusy}
                      onClick={() => {
                        setBriefingWaDraft(briefingChannels.whatsapp?.phone ?? '')
                        setBriefingWaEditing(true)
                      }}
                    >
                      Ändern
                    </button>
                    <button
                      type="button"
                      className="set-btn set-btn-danger"
                      disabled={briefingDeliveryBusy}
                      onClick={() => void unlinkBriefingChannel('whatsapp')}
                    >
                      Trennen
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="set-btn set-btn-primary"
                    disabled={briefingDeliveryBusy}
                    onClick={() => setBriefingWaEditing(true)}
                  >
                    {briefingChannels.whatsapp ? 'Ändern' : 'Verknüpfen'}
                  </button>
                )}
              </div>
            </div>
            {briefingWaEditing ? (
              <div className="set-row">
                <div style={{ width: '100%', display: 'grid', gap: 8 }}>
                  <input
                    className="set-input"
                    type="tel"
                    placeholder="+49 170 1234567"
                    value={briefingWaDraft}
                    onChange={e => setBriefingWaDraft(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="set-btn set-btn-primary"
                      disabled={briefingDeliveryBusy}
                      onClick={() => void saveBriefingWhatsApp()}
                    >
                      Speichern
                    </button>
                    <button
                      type="button"
                      className="set-btn"
                      disabled={briefingDeliveryBusy}
                      onClick={() => setBriefingWaEditing(false)}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="set-row" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="set-label">Nachrichten-Briefing</div>
                <div className="set-label-sub">
                  {briefingChannels.message
                    ? briefingChannels.message.channel === 'email'
                      ? `E-Mail an ${briefingChannels.message.destination}`
                      : `SMS an ${formatBriefingPhoneDisplay(briefingChannels.message.destination)}`
                    : 'Briefing per E-Mail oder SMS — einmal verknüpfen.'}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                {briefingChannels.message && !briefingMsgEditing ? (
                  <>
                    <button
                      type="button"
                      className="set-btn"
                      disabled={briefingDeliveryBusy}
                      onClick={() => {
                        setBriefingMsgChannel(briefingChannels.message?.channel ?? 'email')
                        setBriefingMsgDraft(briefingChannels.message?.destination ?? '')
                        setBriefingMsgEditing(true)
                      }}
                    >
                      Ändern
                    </button>
                    <button
                      type="button"
                      className="set-btn set-btn-danger"
                      disabled={briefingDeliveryBusy}
                      onClick={() => void unlinkBriefingChannel('message')}
                    >
                      Trennen
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="set-btn set-btn-primary"
                    disabled={briefingDeliveryBusy}
                    onClick={() => setBriefingMsgEditing(true)}
                  >
                    {briefingChannels.message ? 'Ändern' : 'Verknüpfen'}
                  </button>
                )}
              </div>
            </div>
            {briefingMsgEditing ? (
              <div className="set-row">
                <div style={{ width: '100%', display: 'grid', gap: 8 }}>
                  <div className="set-segment">
                    <button
                      type="button"
                      className={`set-segment-btn${briefingMsgChannel === 'email' ? ' on' : ''}`}
                      onClick={() => {
                        setBriefingMsgChannel('email')
                        if (!briefingMsgDraft.includes('@')) {
                          setBriefingMsgDraft(profile?.email ?? '')
                        }
                      }}
                    >
                      E-Mail
                    </button>
                    <button
                      type="button"
                      className={`set-segment-btn${briefingMsgChannel === 'sms' ? ' on' : ''}`}
                      onClick={() => {
                        setBriefingMsgChannel('sms')
                        if (briefingMsgDraft.includes('@')) {
                          setBriefingMsgDraft(profile?.phone ?? '')
                        }
                      }}
                    >
                      SMS
                    </button>
                  </div>
                  <input
                    className="set-input"
                    type={briefingMsgChannel === 'email' ? 'email' : 'tel'}
                    placeholder={briefingMsgChannel === 'email' ? 'name@firma.de' : '+49 170 1234567'}
                    value={briefingMsgDraft}
                    onChange={e => setBriefingMsgDraft(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="set-btn set-btn-primary"
                      disabled={briefingDeliveryBusy}
                      onClick={() => void saveBriefingMessage()}
                    >
                      Speichern
                    </button>
                    <button
                      type="button"
                      className="set-btn"
                      disabled={briefingDeliveryBusy}
                      onClick={() => setBriefingMsgEditing(false)}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {section === 'connected' && (
          <div className="set-card">
            <div className="set-row">
              <div>
                <div className="set-label">Google</div>
                <div className="set-label-sub">Anmeldung mit deinem Google-Account — optional zusätzlich zum Magic-Link.</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                {identities.find(i => i.provider === 'google') ? (
                  <span className="set-provider">Verbunden</span>
                ) : (
                  <>
                    <span className="set-value">Nicht verbunden</span>
                    <button type="button" className="set-btn set-btn-primary" onClick={connectGoogle}>
                      Verbinden
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Magic-Link</div>
                <div className="set-label-sub">Standard-Anmeldung per E-Mail — immer aktiv.</div>
              </div>
              <span className="set-provider">Aktiv</span>
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Passkeys</div>
                <div className="set-label-sub">Geräte-Anmeldung — verwaltest du unter Sicherheit.</div>
              </div>
              <Link href={settingsHref('security')} className="set-btn">
                {passkeys.length ? `${passkeys.length} Passkey${passkeys.length === 1 ? '' : 's'}` : 'Einrichten'}
              </Link>
            </div>
          </div>
        )}

        {section === 'workspace' && (() => {
          const modeLabel = wsMode === 'team' ? 'Team Workspace'
            : wsMode === 'agency' ? 'Agency / White Label Workspace'
            : 'Festag Delivery Workspace'
          const modeDesc = wsMode === 'team'
            ? 'Internes Betriebssystem für eigene Projekte, Entwickler und Aufgaben. Tasks, Briefings und Teamkoordination im Vordergrund.'
            : wsMode === 'agency'
            ? 'Für Agenturen, die Kundenprojekte über Festag steuern. Kundenbereiche, eigene Teams und optional White Label unter eigener Marke.'
            : 'Festag plant und setzt dein Projekt mit geprüften Entwicklern um. Dashboard, Briefings, Meilensteine und transparente Kommunikation.'
          type Ext = { label: string; desc: string; cta: string; href?: string; action?: () => void; contact?: boolean }
          const extensions: Ext[] = wsMode === 'team'
            ? [
                { label: 'Agency-Funktionen aktivieren', desc: 'Kundenportale und Kundenbereiche, um externe Kunden zu steuern.', cta: 'Aktivieren', action: () => setPendingMode('agency') },
                { label: 'Mitglieder einladen', desc: 'Mehr Teammitglieder mit klaren Rollen einladen.', cta: 'Einladen', href: '/invite' },
                { label: 'Festag Delivery Support', desc: 'Geprüfte Festag-Entwickler für einzelne Aufgaben dazubuchen.', cta: 'Kontakt aufnehmen', contact: true },
              ]
            : wsMode === 'agency'
            ? [
                { label: 'Kundenbereiche verwalten', desc: 'Pro Kunde ein eigener Bereich mit Briefings, Dateien und Rechten.', cta: 'Öffnen', href: '/clients' },
                { label: 'Mitglieder einladen', desc: 'Co-Founder, Approver, Finance oder Viewer einladen.', cta: 'Einladen', href: '/invite' },
                { label: 'Festag Delivery Support', desc: 'Für einzelne Projekte zusätzliche Festag-Entwickler dazubuchen.', cta: 'Kontakt aufnehmen', contact: true },
              ]
            : [
                { label: 'Eigenes Team hinzufügen', desc: 'Lade Co-Founder, Approver, Finance oder Viewer ein.', cta: 'Einladen', href: '/invite' },
                { label: 'Briefing-Zustellung', desc: 'Wie und wann Tagro Briefings zustellt.', cta: 'Öffnen', href: '/settings/notifications' },
                { label: 'Auf Agency umstellen', desc: 'Kundenprojekte steuern, optional unter eigener Marke.', cta: 'Aktivieren', action: () => setPendingMode('agency') },
              ]
          return (
            <>
              <div className="set-card">
                <div className="set-row">
                  <div>
                    <div className="set-label">Aktueller Workspace-Typ</div>
                    <div className="set-label-sub" style={{ marginTop: 2 }}>{modeDesc}</div>
                  </div>
                  <div className="set-value" style={{ textAlign: 'right' }}>{modeLabel}</div>
                </div>
                <div className="set-row">
                  <div>
                    <div className="set-label">Workspace-Name</div>
                    <div className="set-label-sub">
                      Erscheint in Briefings, E-Mails und beim Anmelden. Muss im System einzigartig sein.
                    </div>
                  </div>
                  <div className="set-field-stack">
                    <input
                      className="set-input"
                      type="text"
                      value={wsNameDraft}
                      disabled={wsNameSaving || !wsId}
                      maxLength={64}
                      autoComplete="organization"
                      spellCheck={false}
                      placeholder="z. B. Acme"
                      onChange={e => {
                        setWsNameDraft(e.target.value)
                        if (wsNameStatus) setWsNameStatus('')
                      }}
                      onBlur={() => { void commitWorkspaceName() }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                        if (e.key === 'Escape') {
                          setWsNameDraft(wsName)
                          setWsNameStatus('')
                          e.currentTarget.blur()
                        }
                      }}
                      aria-label="Workspace-Name"
                    />
                    {(wsNameSaving || wsNameStatus) && (
                      <div className="set-field-note">{wsNameSaving && !wsNameStatus ? 'Wird gespeichert…' : wsNameStatus}</div>
                    )}
                  </div>
                </div>
                <div className="set-row">
                  <div>
                    <div className="set-label">Workspace-Farbe</div>
                    <div className="set-label-sub">Akzentfarbe des Workspaces — färbt Tagro-Orbs und Akzente in der App.</div>
                  </div>
                  <div className="set-color-row">
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className={`set-color-swatch${(wsSettings.workspace_color || '') === c ? ' on' : ''}`}
                        onClick={() => pickWorkspaceColor(c)}
                        style={{ background: c }}
                        aria-label={`Workspace-Farbe ${c}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="set-row">
                  <div>
                    <div className="set-label">Plan</div>
                    <div className="set-label-sub">Festag MVP — auf Anfrage.</div>
                  </div>
                  <div className="set-value">Free</div>
                </div>
              </div>

              <div className="set-card">
                <div className="set-row set-row-stack" style={{ paddingBottom: 8 }}>
                  <div>
                    <div className="set-label">Workspace erweitern</div>
                    <div className="set-label-sub">Add-ons erweitern deinen Workspace, ohne den Modus zu wechseln.</div>
                  </div>
                </div>
                {extensions.map(ext => (
                  <div key={ext.label} className="set-row">
                    <div>
                      <div className="set-label" style={{ fontWeight: 500 }}>{ext.label}</div>
                      <div className="set-label-sub">{ext.desc}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {ext.action ? (
                        <button type="button" className="set-btn" onClick={ext.action}>{ext.cta}</button>
                      ) : ext.contact ? (
                        <a className="set-btn" href={`mailto:hi@festag.app?subject=${encodeURIComponent('Festag — ' + ext.label)}&body=${encodeURIComponent('Hallo Festag,\n\nIch interessiere mich für: ' + ext.label + '.\n\nWorkspace: ' + (wsName || '') + '\n\nViele Grüße')}`}>{ext.cta}</a>
                      ) : (
                        <Link className="set-btn" href={ext.href || '#'}>{ext.cta}</Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="set-card">
                <div className="set-row set-row-stack" style={{ paddingBottom: 8 }}>
                  <div>
                    <div className="set-label">Tagro &amp; Berichte</div>
                    <div className="set-label-sub">
                      Basis-Einstellungen für diesen Workspace. Erweiterte Delivery-Intelligence findest du unter{' '}
                      <Link href={settingsHref('intelligence')}>Tagro &amp; Klarheit</Link>.
                    </div>
                  </div>
                </div>
                <div className="set-row">
                  <div>
                    <div className="set-label">KI-Modell</div>
                    <div className="set-label-sub">
                      {tagroHealth
                        ? tagroHealth.provider === 'none'
                          ? 'Keine KI verbunden — ANTHROPIC_API_KEY in der Umgebung setzen.'
                          : `Tagro läuft auf ${tagroHealth.provider === 'claude' ? 'Claude (Anthropic)' : tagroHealth.provider === 'gemini' ? 'Gemini' : 'MiniMax'}${tagroHealth.model ? ` · ${tagroHealth.model}` : ''}.`
                        : 'Verbindungsstatus wird geladen …'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                    <span
                      aria-hidden
                      style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: !tagroHealth ? '#6F7A89'
                          : tagroHealth.reachable === true ? '#3FB984'
                          : tagroHealth.reachable === false ? '#D9534F'
                          : tagroHealth.provider === 'none' ? '#D9534F' : '#6a738c',
                      }}
                    />
                    <button type="button" className="set-btn" onClick={pingTagro} disabled={tagroPinging || tagroHealth?.provider === 'none'}>
                      {tagroPinging ? 'Prüfe …' : 'Verbindung testen'}
                    </button>
                  </div>
                </div>
                <div className="set-row">
                  <div>
                    <div className="set-label">Berichtssprache</div>
                    <div className="set-label-sub">Sprache der Statusberichte und Briefings.</div>
                  </div>
                  <div className="set-segment">
                    <button type="button" className={`set-segment-btn${(wsSettings.report_language ?? 'de') === 'de' ? ' on' : ''}`} onClick={() => saveWsSetting('report_language', 'de')}>Deutsch</button>
                    <button type="button" className={`set-segment-btn${(wsSettings.report_language ?? 'de') === 'en' ? ' on' : ''}`} onClick={() => saveWsSetting('report_language', 'en')}>English</button>
                  </div>
                </div>
                <div className="set-row">
                  <div>
                    <div className="set-label">Tagro-Ton</div>
                    <div className="set-label-sub">Wie Tagro mit Kunden und Team kommuniziert.</div>
                  </div>
                  <select className="set-select" value={wsSettings.tagro_tone ?? 'neutral'} onChange={e => saveWsSetting('tagro_tone', e.target.value)}>
                    <option value="calm">Ruhig &amp; erklärend</option>
                    <option value="neutral">Neutral &amp; sachlich</option>
                    <option value="direct">Direkt &amp; knapp</option>
                  </select>
                </div>
                <div className="set-row">
                  <div>
                    <div className="set-label">Berichtsrhythmus</div>
                    <div className="set-label-sub">Wie oft Tagro automatisch einen Statusbericht vorschlägt.</div>
                  </div>
                  <select className="set-select" value={wsSettings.report_frequency ?? 'weekly'} onChange={e => saveWsSetting('report_frequency', e.target.value)}>
                    <option value="daily">Täglich</option>
                    <option value="weekly">Wöchentlich</option>
                    <option value="milestone">Bei Meilensteinen</option>
                    <option value="on_demand">Nur auf Anfrage</option>
                  </select>
                </div>
                <div className="set-row">
                  <div>
                    <div className="set-label">Standardmäßig kundensicher</div>
                    <div className="set-label-sub">Neue Berichte starten im kundensicheren Modus (interne Notizen ausgeblendet).</div>
                  </div>
                  <div className="set-segment">
                    <button type="button" className={`set-segment-btn${(wsSettings.default_client_safe ?? true) ? ' on' : ''}`} onClick={() => saveWsSetting('default_client_safe', true)}>An</button>
                    <button type="button" className={`set-segment-btn${!(wsSettings.default_client_safe ?? true) ? ' on' : ''}`} onClick={() => saveWsSetting('default_client_safe', false)}>Aus</button>
                  </div>
                </div>
                <div className="set-row">
                  <div>
                    <div className="set-label">Vor Versand prüfen</div>
                    <div className="set-label-sub">Berichte und Briefings warten auf deine Freigabe, bevor der Kunde sie sieht.</div>
                  </div>
                  <div className="set-segment">
                    <button type="button" className={`set-segment-btn${(wsSettings.review_before_send ?? true) ? ' on' : ''}`} onClick={() => saveWsSetting('review_before_send', true)}>An</button>
                    <button type="button" className={`set-segment-btn${!(wsSettings.review_before_send ?? true) ? ' on' : ''}`} onClick={() => saveWsSetting('review_before_send', false)}>Aus</button>
                  </div>
                </div>
              </div>

              <div className="set-card">
                <div className="set-row">
                  <div>
                    <div className="set-label">Mitglieder &amp; Rollen</div>
                    <div className="set-label-sub">
                      {members.length === 0 || membersLoading
                        ? 'Lade andere mit klaren Rollen zu deinem Workspace ein.'
                        : `${members.length} Mitglied${members.length === 1 ? '' : 'er'} · Rollen werden pro Workspace gesetzt.`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Link href="/invite" className="set-btn">Einladen</Link>
                  </div>
                </div>
                {members.length > 0 && (() => {
                  // Roles available per workspace mode (per product spec). Owner appears but is read-only on self.
                  const rolesForMode: { id: string; label: string; color: string }[] = wsMode === 'team'
                    ? [
                        { id: 'owner',           label: 'Owner',           color: '#202532' },
                        { id: 'admin',           label: 'Admin',           color: '#6a738c' },
                        { id: 'project_manager', label: 'Project Manager', color: '#0369A1' },
                        { id: 'developer',       label: 'Developer',       color: '#15803D' },
                        { id: 'reviewer',        label: 'Reviewer',        color: '#B45309' },
                        { id: 'viewer',          label: 'Viewer',          color: '#6B7280' },
                      ]
                    : wsMode === 'agency'
                    ? [
                        { id: 'agency_owner',         label: 'Agency Owner',     color: '#202532' },
                        { id: 'agency_admin',         label: 'Agency Admin',     color: '#6a738c' },
                        { id: 'project_manager',      label: 'Project Manager',  color: '#0369A1' },
                        { id: 'developer',            label: 'Developer',        color: '#15803D' },
                        { id: 'client_owner',         label: 'Client Owner',     color: '#6a738c' },
                        { id: 'client_approver',      label: 'Client Approver',  color: '#6a738c' },
                        { id: 'client_viewer',        label: 'Client Viewer',    color: '#6B7280' },
                        { id: 'finance',              label: 'Finance',          color: '#0F766E' },
                        { id: 'white_label_manager',  label: 'White Label',      color: '#D97706' },
                      ]
                    : [
                        // delivery
                        { id: 'owner',     label: 'Owner',     color: '#202532' },
                        { id: 'approver',  label: 'Approver',  color: '#6a738c' },
                        { id: 'finance',   label: 'Finance',   color: '#0F766E' },
                        { id: 'member',    label: 'Member',    color: '#15803D' },
                        { id: 'viewer',    label: 'Viewer',    color: '#6B7280' },
                      ]
                  const roleColor = (r: string) => rolesForMode.find(x => x.id === r)?.color || '#6B7280'
                  return (
                    <div className="set-row set-row-stack" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, paddingTop: 6 }}>
                      {members.map(m => {
                        const isSelfOwner = m.user_id === profile?.id && m.role === 'owner'
                        return (
                          <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--set-border)' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--set-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.full_name || m.email || '—'}
                                {isSelfOwner && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 500, color: 'var(--set-text-muted)' }}>(du)</span>}
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--set-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                            </div>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 500, letterSpacing: '0.017em', color: roleColor(m.role), border: `1px solid ${roleColor(m.role)}`, textTransform: 'uppercase', flexShrink: 0 }}>
                              {rolesForMode.find(r => r.id === m.role)?.label || m.role}
                            </span>
                            <select
                              className="set-select"
                              value={m.role}
                              disabled={isSelfOwner}
                              style={{ width: 140, flexShrink: 0 }}
                              onChange={e => changeMemberRole(m.user_id, e.target.value)}
                            >
                              {rolesForMode.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                            {!isSelfOwner && (
                              <button type="button" className="set-btn set-btn-danger" style={{ flexShrink: 0 }} onClick={() => removeMember(m.user_id)}>
                                Entfernen
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
                <div className="set-row set-row-stack" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingTop: 6 }}>
                  <div>
                    <div className="set-label">Workspace-Typ wechseln</div>
                    <div className="set-label-sub">
                      Der Wechsel greift sofort — Rollen, Kundenbereiche und Projektlogik passen sich an den neuen Typ an. Deine Daten und Projekte bleiben erhalten.
                      {(wsMode === 'team' || wsMode === 'agency') && (
                        <> Versehentlich den falschen Workspace erstellt? Wechsle hier jederzeit zurück zu <strong>Festag Delivery</strong> (Umsetzung durch Festag-Entwickler).</>
                      )}
                    </div>
                  </div>
                  <div className="ws-mode-switch">
                    {WS_MODES.map(m => {
                      const active = wsMode === m.id
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`ws-mode-opt${active ? ' on' : ''}`}
                          onClick={() => setPendingMode(m.id)}
                          disabled={switchingMode || active}
                        >
                          <span className="ws-mode-top">
                            <span className="ws-mode-name">{m.label}</span>
                            {active
                              ? <span className="ws-mode-badge">Aktiv</span>
                              : switchingMode ? null : <span className="ws-mode-go">Wechseln</span>}
                          </span>
                          <span className="ws-mode-desc">{m.short}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {wsMode === 'agency' && wsId && (
                <WhiteLabelCard workspaceId={wsId} workspaceName={wsName} />
              )}

              <div className="set-card">
                <div className="set-row set-row-stack">
                  <div>
                    <div className="set-label">Onboarding neu starten</div>
                    <div className="set-label-sub">
                      Öffnet Profil und Team-Setup erneut. Workspace und Projekte bleiben unberührt.
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                    <button
                      className="set-btn"
                      onClick={async () => {
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) { setError('Bitte erneut anmelden.'); return }
                        await supabase
                          .from('onboarding_state')
                          .update({ completed_at: null, current_step: 'profile', updated_at: new Date().toISOString() })
                          .eq('user_id', user.id)
                        window.location.href = '/onboarding'
                      }}
                    >
                      Onboarding öffnen
                    </button>
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

              {/* Workspace-type switch — explanation popup, then applies automatically. */}
              {pendingMode && (() => {
                const target = WS_MODES.find(m => m.id === pendingMode)!
                return (
                  <Modal
                    open
                    onClose={() => { if (!switchingMode) setPendingMode(null) }}
                    size="md"
                    title={`Zu „${target.label}" wechseln?`}
                    subtitle="Self-Service-Wechsel — er greift sofort, ganz ohne Anfrage."
                    footer={
                      <>
                        <ModalButton variant="secondary" onClick={() => setPendingMode(null)} disabled={switchingMode}>Abbrechen</ModalButton>
                        <ModalButton variant="primary" onClick={() => changeWorkspaceMode(pendingMode)} loading={switchingMode}>
                          Jetzt wechseln
                        </ModalButton>
                      </>
                    }
                  >
                    <p className="ws-switch-lead">{target.short}</p>
                    <ul className="ws-switch-list">
                      <li>Rollen &amp; Berechtigungen passen sich dem neuen Typ an.</li>
                      <li>Kundenbereiche und Projektlogik richten sich neu aus.</li>
                      <li>Deine Daten, Projekte und Mitglieder bleiben erhalten.</li>
                    </ul>
                    <p className="ws-switch-from"><span>{modeLabel}</span> → <span>{target.label}</span></p>
                  </Modal>
                )
              })()}
            </>
          )
        })()}

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
          </div>
        )}

        {section === 'documents' && (
          <SettingsDocumentsSection setError={setError} queueAutosave={queueAutosave} />
        )}

        {section === 'billing' && (
          <>
            <div className="set-insight-card">
              <strong>Steuerdaten für Festag-Rechnungen</strong>
              <p>
                Für ausgehende Kundenrechnungen (Angebote, Rechnungen, Verträge) ist der{' '}
                <Link href={settingsHref('documents')}>Rechnungssteller unter Dokumente</Link>{' '}
                die zentrale Quelle. Hier pflegst du Plan-Infos und deine eigene Rechnungsadresse bei Festag.
              </p>
            </div>
            <div className="set-card">
              <div className="set-row">
                <div>
                  <div className="set-label">Briefing & Voice Reports</div>
                  <div className="set-label-sub">
                    Tagro Briefings sind das tägliche Kontrollsystem für Softwareprojekte. API-basierte Voice Reports werden separat kalkuliert; ein ChatGPT-Abo deckt die Festag-App-API nicht automatisch ab.
                  </div>
                </div>
                <div className="set-value" style={{ textAlign: 'right' }}>Growth Care / Business</div>
              </div>
              {[
                ['Projektbriefings', 'Im Projekt enthalten'],
                ['Voice Reports', 'Verfügbar über Growth Care oder Business'],
                ['Automatische Zustellung', 'Nicht aktiv'],
                ['Weekly Executive Summary', 'Nicht aktiv'],
              ].map(([label, value]) => (
                <div key={label} className="set-row">
                  <div className="set-label">{label}</div>
                  <div className="set-value" style={{ textAlign: 'right' }}>{value}</div>
                </div>
              ))}
            </div>
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
                  <div className="set-label">Bankverbindung</div>
                  <div className="set-label-sub">IBAN und BIC erscheinen auf der Zahlungsseite deiner Rechnungen.</div>
                </div>
              </div>
              <div className="set-row">
                <div className="set-label">IBAN</div>
                <input className="set-input" type="text" value={invoiceIban}
                  onChange={e => setInvoiceIban(e.target.value)} placeholder="DE…" />
              </div>
              <div className="set-row">
                <div className="set-label">BIC</div>
                <input className="set-input" type="text" value={invoiceBic}
                  onChange={e => setInvoiceBic(e.target.value)} placeholder="REVODEB2" />
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
            </div>
          </>
        )}

        {(section === 'intelligence' || section === 'portal' || section === 'privacy' || section === 'shortcuts' || section === 'apps') && (
          <SettingsExtraSections
            section={section}
            wsSettings={wsSettings}
            saveWsSetting={saveWsSetting}
            tagroHealth={tagroHealth}
            tagroPinging={tagroPinging}
            pingTagro={pingTagro}
            wsId={wsId}
            wsName={wsName}
            wsMode={wsMode}
            setError={setError}
            flashSaved={flashSaved}
          />
        )}
        </>
        )}
      </main>
      </SettingsMobileShell>
    </div>
  )
}

/**
 * WorkspaceSymbolSettings — the roomy, no-eyebrow workspace-mark picker.
 * Lives in Settings → Erscheinung (moved out of the cramped sidebar popover
 * that overflowed). Big live preview + generous variant/colour grids.
 */
function WorkspaceSymbolSettings({ workspaceName }: { workspaceName: string }) {
  const wsKey = (workspaceName || 'festag').trim().toLowerCase() || 'festag'
  const [prefs, setPrefs] = useState(() => loadSymbol(wsKey))
  useEffect(() => { setPrefs(loadSymbol(wsKey)) }, [wsKey])

  function set(next: Partial<typeof prefs>) {
    const merged = { ...prefs, ...next }
    setPrefs(merged)
    saveSymbol(wsKey, merged)
  }

  return (
    <div className="wss">
      <div className="wss-head">
        <WorkspaceSymbol variant={prefs.variant} scheme={prefs.scheme} seed={prefs.seed} size={56} />
        <div className="wss-head-text">
          <strong>{workspaceName || 'Festag'}</strong>
          <span>Dein Workspace-Mark</span>
        </div>
      </div>

      <div className="wss-block">
        <span className="wss-block-title">Form</span>
        <div className="wss-grid">
          {SYMBOL_VARIANTS.map(v => (
            <button
              key={v}
              type="button"
              className={`wss-cell${prefs.variant === v ? ' on' : ''}`}
              aria-label={v}
              aria-pressed={prefs.variant === v}
              onClick={() => set({ variant: v })}
            >
              <WorkspaceSymbol variant={v} scheme={prefs.scheme} seed={prefs.seed} size={34} />
            </button>
          ))}
        </div>
      </div>

      <div className="wss-block">
        <span className="wss-block-title">Farbe</span>
        <div className="wss-grid">
          {SYMBOL_SCHEMES.map(sc => (
            <button
              key={sc}
              type="button"
              className={`wss-cell${prefs.scheme === sc ? ' on' : ''}`}
              aria-label={sc}
              aria-pressed={prefs.scheme === sc}
              onClick={() => set({ scheme: sc })}
            >
              <WorkspaceSymbol variant={prefs.variant} scheme={sc} seed={prefs.seed} size={34} />
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .wss { display: flex; flex-direction: column; gap: 18px; width: 100%; max-width: 440px; }
        .wss-head { display: flex; align-items: center; gap: 14px; }
        .wss-head-text { display: flex; flex-direction: column; gap: 2px; }
        .wss-head-text strong { font-size: 14px; font-weight: 600; color: var(--text); }
        .wss-head-text span { font-size: 12px; color: var(--text-muted); }
        .wss-block { display: flex; flex-direction: column; gap: 9px; }
        .wss-block-title { font-size: 12.5px; font-weight: 500; color: var(--text-secondary); }
        .wss-grid {
          display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px;
        }
        @media (max-width: 600px) { .wss-grid { grid-template-columns: repeat(4, 1fr); } }
        .wss-cell {
          width: 100%; aspect-ratio: 1;
          display: inline-flex; align-items: center; justify-content: center;
          border: 0; border-radius: 12px; background: transparent;
          padding: 4px; cursor: pointer;
          outline: 2px solid transparent; outline-offset: 2px;
          transition: outline-color .14s, transform .12s, background .12s;
        }
        .wss-cell:hover { background: var(--surface-2); }
        .wss-cell.on { outline-color: var(--text); }
        .wss-cell:active { transform: scale(.94); }
      `}</style>
    </div>
  )
}

type WhiteLabelPlan = 'powered_by_festag' | 'full_white_label' | 'agency_os'

function WhiteLabelCard({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<WhiteLabelPlan>('powered_by_festag')
  const [brandName, setBrandName] = useState('')
  const [brandColor, setBrandColor] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [domain, setDomain] = useState('')
  const [mailFrom, setMailFrom] = useState('')
  const [audioIntro, setAudioIntro] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [activateOpen, setActivateOpen] = useState(false)
  const [activating, setActivating] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('workspace_branding')
        .select('plan,brand_name,brand_color,logo_url,domain,mail_from,audio_intro')
        .eq('workspace_id', workspaceId)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        const d = data as any
        setPlan((d.plan as WhiteLabelPlan) || 'powered_by_festag')
        setBrandName(d.brand_name || '')
        setBrandColor(d.brand_color || '')
        setLogoUrl(d.logo_url || '')
        setDomain(d.domain || '')
        setMailFrom(d.mail_from || '')
        setAudioIntro(d.audio_intro || '')
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [supabase, workspaceId])

  async function save() {
    setError(''); setSaving(true); setSaved(false)
    try {
      // Plan stays "powered_by_festag" — activation goes through Festag
      // support so the premium price model + DNS handoff stays gated.
      const { error: e } = await supabase.from('workspace_branding').upsert({
        workspace_id: workspaceId,
        plan,
        brand_name: brandName.trim() || null,
        brand_color: brandColor.trim() || null,
        logo_url: logoUrl.trim() || null,
        domain: domain.trim() || null,
        mail_from: mailFrom.trim() || null,
        audio_intro: audioIntro.trim() || null,
      }, { onConflict: 'workspace_id' })
      if (e) throw e
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (e: any) {
      setError(e?.message || 'Konnte Branding nicht speichern.')
    } finally {
      setSaving(false)
    }
  }

  // Self-service activation — normally a 799 €/Monat premium, but for now it is
  // switched on for free (no payment). Sets the plan directly; the owner is
  // gated by RLS. Branding fields are preserved.
  async function activatePlan() {
    setError(''); setActivating(true)
    try {
      const { error: e } = await supabase.from('workspace_branding').upsert({
        workspace_id: workspaceId,
        plan: 'full_white_label',
        brand_name: brandName.trim() || null,
        brand_color: brandColor.trim() || null,
        logo_url: logoUrl.trim() || null,
        domain: domain.trim() || null,
        mail_from: mailFrom.trim() || null,
        audio_intro: audioIntro.trim() || null,
      }, { onConflict: 'workspace_id' })
      if (e) throw e
      setPlan('full_white_label')
      setActivateOpen(false)
    } catch (e: any) {
      setError(e?.message || 'Aktivierung fehlgeschlagen.')
    } finally {
      setActivating(false)
    }
  }

  const isPremium = plan !== 'powered_by_festag'
  const planLabel = plan === 'full_white_label' ? 'Full White Label' : plan === 'agency_os' ? 'Agency OS' : 'Powered by Festag'

  return (
    <div className="set-card">
      <div className="set-row set-row-stack" style={{ paddingBottom: 8 }}>
        <div>
          <div className="set-label">White Label · Branding</div>
          <div className="set-label-sub">
            Speichere dein Branding hier. Powered-by-Festag (Standard) zeigt einen kleinen Hinweis im Footer.
            Full White Label entfernt den Hinweis und bringt deine Marke + Domain in Briefings, Mails und PDFs —
            Premium-Funktion (799 €/Monat), Aktivierung läuft über Festag-Support.
          </div>
        </div>
      </div>
      <div className="set-row">
        <div>
          <div className="set-label">Aktueller Plan</div>
          <div className="set-label-sub">{isPremium ? `${planLabel} ist aktiv.` : 'Standard — kein White-Label aktiv.'}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <span className="set-value" style={{ alignSelf: 'center' }}>{planLabel}</span>
          {!isPremium && (
            <button type="button" className="set-btn set-btn-primary" onClick={() => setActivateOpen(true)}>
              White Label aktivieren
            </button>
          )}
        </div>
      </div>
      <div className="set-row"><div className="set-label">Marken-Name</div><input className="set-input" type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Erscheint in Briefings & Mails" /></div>
      <div className="set-row"><div className="set-label">Marken-Farbe</div><input className="set-input" type="text" value={brandColor} onChange={e => setBrandColor(e.target.value)} placeholder="#0E0F0F" /></div>
      <div className="set-row"><div className="set-label">Logo URL</div><input className="set-input" type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…/logo.svg" /></div>
      <div className="set-row"><div className="set-label">Domain</div><input className="set-input" type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="kunden.deine-agentur.de" /></div>
      <div className="set-row"><div className="set-label">E-Mail-Absender</div><input className="set-input" type="text" value={mailFrom} onChange={e => setMailFrom(e.target.value)} placeholder="Deine Agentur <hi@agentur.de>" /></div>
      <div className="set-row set-row-stack">
        <div>
          <div className="set-label">Audio-Intro</div>
          <div className="set-label-sub">Kurzer gesprochener Vorlauf für Audio-Briefings (z. B. „Hier ist dein heutiges Update von Müller Agency").</div>
        </div>
        <textarea
          className="set-input"
          value={audioIntro}
          onChange={e => setAudioIntro(e.target.value)}
          placeholder="Optional"
          rows={2}
          style={{ resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }}
        />
      </div>
      {error && <div className="set-error">{error}</div>}
      <div className="set-row" style={{ justifyContent: 'flex-end', display: 'flex' }}>
        <span style={{ marginRight: 12, fontSize: 12, color: '#15803D', opacity: saved ? 1 : 0, transition: 'opacity .15s', alignSelf: 'center' }}>Gespeichert</span>
        <button className="set-btn set-btn-primary" onClick={save} disabled={saving || loading}>
          {saving ? 'Speichere…' : 'Branding speichern'}
        </button>
      </div>

      {activateOpen && (
        <Modal
          open
          onClose={() => { if (!activating) setActivateOpen(false) }}
          size="md"
          title="White Label aktivieren"
          subtitle="Deine Marke statt Festag — in Briefings, Mails und PDFs."
          footer={
            <>
              <ModalButton variant="secondary" onClick={() => setActivateOpen(false)} disabled={activating}>Abbrechen</ModalButton>
              <ModalButton variant="primary" onClick={activatePlan} loading={activating}>
                Jetzt kostenlos aktivieren
              </ModalButton>
            </>
          }
        >
          <p className="ws-switch-lead">
            Full White Label entfernt den „Powered by Festag"-Hinweis und bringt deine Marke,
            Farbe und Domain in alle Client-Touchpoints — Briefings, E-Mails und PDF-Reports.
          </p>
          <ul className="ws-switch-list">
            <li>Eigener Marken-Name, Farbe und Logo im Client-Portal.</li>
            <li>Eigene Domain &amp; E-Mail-Absender für Briefings und Mails.</li>
            <li>Kein Festag-Hinweis im Footer.</li>
          </ul>
          <p className="ws-switch-from" style={{ display: 'block' }}>
            Regulär <span>799 €/Monat</span> — für dich aktuell <span>kostenlos</span> freigeschaltet,
            ohne Zahlung. Du kannst es jederzeit wieder auf Standard zurückstellen.
          </p>
        </Modal>
      )}
    </div>
  )
}

const DELETE_REASONS: Array<{ id: string; label: string; sub: string }> = [
  { id: 'no_longer_needed', label: 'Ich brauche Festag aktuell nicht mehr', sub: 'Projekt ist abgeschlossen oder ruht.' },
  { id: 'switching_tool',   label: 'Ich wechsle zu einem anderen System',    sub: 'Ein anderes Tool deckt mein Setup besser ab.' },
  { id: 'too_expensive',    label: 'Preis passt aktuell nicht',              sub: 'Plan-Modell oder Add-ons sind zu hoch für mich.' },
  { id: 'data_privacy',     label: 'Datenschutz oder Compliance',            sub: 'Ich möchte meine Daten entfernt haben.' },
  { id: 'temporary_break',  label: 'Ich mache eine Pause',                   sub: 'Wir lassen die Tür offen — du kannst dich später neu anlegen.' },
  { id: 'other',            label: 'Sonstiges',                              sub: 'Erzähl uns kurz was — hilft uns Festag besser zu machen.' },
]

function AccountDeleteModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'reason' | 'confirm' | 'sending' | 'done' | 'error'>('reason')
  const [reason, setReason] = useState<string>('')
  const [details, setDetails] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function execute() {
    setStep('sending')
    setErrorMessage('')
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, reasonDetails: details }),
      })
      const json = await res.json()
      if (!json?.ok) throw new Error(json?.error || 'delete_failed')
      setStep('done')
      // Hard sign-out: clear cookies on next reload by routing to /login.
      setTimeout(() => { window.location.href = '/login?account_deleted=1' }, 1200)
    } catch (e: any) {
      setErrorMessage(e?.message || 'Konnte das Konto nicht löschen.')
      setStep('error')
    }
  }

  return (
    <div className="acc-del-backdrop" role="dialog" aria-modal="true" aria-label="Konto löschen">
      <style>{`
        .acc-del-backdrop {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(8, 10, 12, .56);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: acc-del-fade .14s ease-out both;
        }
        @keyframes acc-del-fade { from { opacity: 0 } to { opacity: 1 } }
        .acc-del-modal {
          width: min(520px, 100%);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 22px;
          box-shadow: 0 24px 60px rgba(0,0,0,.28);
          color: var(--text);
          font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
          max-height: calc(100dvh - 40px);
          overflow-y: auto;
        }
        .acc-del-kicker { font-size: 11px; font-weight: 500; letter-spacing: .017em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; }
        .acc-del-title { margin: 0 0 6px; font-size: 18px; font-weight: 500; letter-spacing: .015em; }
        .acc-del-sub { margin: 0; font-size: 13px; line-height: 1.55; color: var(--text-secondary); }
        .acc-del-reasons { display: flex; flex-direction: column; gap: 8px; margin: 16px 0 4px; }
        .acc-del-reason {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg);
          cursor: pointer;
          transition: border-color .12s, background .12s;
        }
        .acc-del-reason:hover { background: var(--surface-2); }
        .acc-del-reason.on { border-color: var(--text); background: var(--surface-2); }
        .acc-del-radio {
          width: 16px; height: 16px;
          border-radius: 50%;
          border: 1.5px solid var(--border);
          flex-shrink: 0;
          margin-top: 2px;
          position: relative;
        }
        .acc-del-reason.on .acc-del-radio { border-color: var(--text); }
        .acc-del-reason.on .acc-del-radio::after {
          content: ''; position: absolute; inset: 3px;
          border-radius: 50%; background: var(--text);
        }
        .acc-del-reason-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .acc-del-reason-label { font-size: 13.5px; font-weight: 500; color: var(--text); }
        .acc-del-reason-sub { font-size: 12px; color: var(--text-muted); line-height: 1.45; }
        .acc-del-details {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          min-height: 70px;
          margin-top: 8px;
        }
        .acc-del-details:focus { outline: none; border-color: color-mix(in srgb, var(--text) 35%, var(--border)); }
        .acc-del-warning {
          margin: 12px 0 0;
          padding: 12px 14px;
          background: rgba(192,54,46,0.08);
          border: 1px solid rgba(192,54,46,0.18);
          border-radius: 10px;
          color: #c0362e;
          font-size: 12.5px;
          line-height: 1.55;
        }
        .acc-del-actions {
          display: flex; gap: 8px; margin-top: 18px;
          flex-wrap: wrap;
        }
        .acc-del-btn {
          padding: 9px 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .acc-del-btn:hover:not(:disabled) { background: var(--surface-2); }
        .acc-del-btn-danger {
          background: #c0362e;
          color: #fff;
          border-color: #c0362e;
        }
        .acc-del-btn-danger:hover:not(:disabled) { opacity: .92; }
        .acc-del-btn:disabled { opacity: .55; cursor: not-allowed; }
        @media (max-width: 520px) {
          .acc-del-modal { padding: 18px; }
          .acc-del-actions .acc-del-btn { flex: 1; justify-content: center; text-align: center; min-height: 38px; }
        }
      `}</style>

      <div className="acc-del-modal">
        {step === 'reason' && (
          <>
            <div className="acc-del-kicker">Konto löschen</div>
            <h2 className="acc-del-title">Bevor du gehst — was war der Grund?</h2>
            <p className="acc-del-sub">Hilft uns Festag besser zu machen. Eine Antwort reicht.</p>

            <div className="acc-del-reasons" role="radiogroup" aria-label="Grund für die Löschung">
              {DELETE_REASONS.map(r => (
                <div
                  key={r.id}
                  role="radio"
                  tabIndex={0}
                  aria-checked={reason === r.id}
                  className={`acc-del-reason${reason === r.id ? ' on' : ''}`}
                  onClick={() => setReason(r.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setReason(r.id) }}}
                >
                  <span className="acc-del-radio" aria-hidden />
                  <span className="acc-del-reason-text">
                    <span className="acc-del-reason-label">{r.label}</span>
                    <span className="acc-del-reason-sub">{r.sub}</span>
                  </span>
                </div>
              ))}
            </div>

            {reason === 'other' && (
              <textarea
                className="acc-del-details"
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Was war konkret? (max. 1000 Zeichen)"
                maxLength={1000}
              />
            )}

            <div className="acc-del-actions">
              <button className="acc-del-btn" onClick={onClose}>Abbrechen</button>
              <button
                className="acc-del-btn"
                disabled={!reason}
                onClick={() => setStep('confirm')}
              >
                Weiter
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="acc-del-kicker">Letzte Bestätigung</div>
            <h2 className="acc-del-title">Endgültig löschen?</h2>
            <p className="acc-del-sub">
              Mit dem Klick auf „Endgültig löschen" werden dein Konto, alle Workspaces, Projekte,
              Briefings, Inbox-Items, Dateien und Tagro-Memory unwiderruflich entfernt. Niemand kann
              das danach zurückholen — auch Festag nicht.
            </p>
            <div className="acc-del-warning">
              Du wirst direkt nach dem Löschen abgemeldet. Mit der gleichen E-Mail kannst du dich später
              jederzeit neu anmelden — alles startet dann frisch.
            </div>
            <div className="acc-del-actions">
              <button className="acc-del-btn" onClick={() => setStep('reason')}>Zurück</button>
              <button className="acc-del-btn acc-del-btn-danger" onClick={execute}>
                Endgültig löschen
              </button>
            </div>
          </>
        )}

        {step === 'sending' && (
          <>
            <div className="acc-del-kicker">Bitte warten</div>
            <h2 className="acc-del-title">Konto wird gelöscht…</h2>
            <p className="acc-del-sub">Wir entfernen deine Daten und melden dich gleich ab.</p>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="acc-del-kicker">Erledigt</div>
            <h2 className="acc-del-title">Dein Konto wurde gelöscht</h2>
            <p className="acc-del-sub">Du wirst jetzt abgemeldet. Danke, dass du Festag eine Chance gegeben hast.</p>
          </>
        )}

        {step === 'error' && (
          <>
            <div className="acc-del-kicker">Hat nicht funktioniert</div>
            <h2 className="acc-del-title">Konto konnte nicht gelöscht werden</h2>
            <p className="acc-del-sub">{errorMessage || 'Bitte versuche es nochmal oder schreib uns an hi@festag.app.'}</p>
            <div className="acc-del-actions">
              <button className="acc-del-btn" onClick={onClose}>Schließen</button>
              <button className="acc-del-btn acc-del-btn-danger" onClick={() => setStep('confirm')}>Nochmal versuchen</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
