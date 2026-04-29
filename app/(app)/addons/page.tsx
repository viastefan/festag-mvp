'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PaymentModal, { BankData, PAYMENT_POLL_DURATION_MS } from '@/components/PaymentModal'

type Addon = {
  id: string; name: string; description: string; price: number;
  category: string; icon: string;
}

type PurchaseStatus = 'active' | 'pending' | undefined
type PurchaseRecord = {
  reference: string
  status: PurchaseStatus
  createdAt: number
  completedAt?: number
  projectId?: string       // Zugewiesenes Projekt
  projectTitle?: string    // Cache fuers UI (Projektname kann sich aendern)
}
type Purchases = Record<string, PurchaseRecord>  // addonId -> record
type ProjectMini = { id: string; title: string; status: string }

const CATALOG: Addon[] = [
  { id: 'ai-video',   name: 'AI Video Generation',   description: 'Cinematische Videos aus Text — Produktvideos, Werbung, Tutorials', price: 890,  category: 'AI', icon: 'video' },
  { id: 'branding',   name: 'Branding Paket',         description: 'Logo, Farbpalette, Typografie, Brand Guidelines',                   price: 1290, category: 'Design', icon: 'brand' },
  { id: 'saas-ext',   name: 'SaaS Extensions',        description: 'Erweiterte SaaS-Features: Subscriptions, Analytics, Admin',        price: 1490, category: 'Dev', icon: 'saas' },
  { id: 'automation', name: 'Automation System',      description: 'Workflows, Integrationen, APIs — automatisiere wiederkehrende Tasks', price: 790,  category: 'System', icon: 'auto' },
  { id: 'website',    name: 'Website Development',    description: 'Landing Page, Marketing Site, SEO-optimiert',                       price: 1190, category: 'Dev', icon: 'web' },
  { id: 'hosting',    name: 'Hosting & Infrastructure', description: 'Setup, Deployment, Monitoring — inkl. 12 Monate Hosting',        price: 490,  category: 'System', icon: 'host' },
  { id: 'seo',        name: 'SEO Expert',             description: 'Technisches SEO, Content-Strategie, Rankings-Optimierung',          price: 590,  category: 'Marketing', icon: 'seo' },
  { id: 'ai-chatbot', name: 'AI Chatbot',             description: 'Custom AI-Assistent für deine Plattform mit Firmenkontext',        price: 890,  category: 'AI', icon: 'bot' },
]

function AddonIcon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    video: <><rect x="3" y="6" width="14" height="12" rx="2"/><path d="M17 10l4-2v8l-4-2z"/></>,
    brand: <><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></>,
    saas: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></>,
    auto: <><circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/></>,
    web: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><circle cx="6.5" cy="6" r="0.5"/><circle cx="9" cy="6" r="0.5"/></>,
    host: <><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><path d="M7 7h.01M7 17h.01"/></>,
    seo: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    bot: <><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M9 3v4M15 3v4M9 13v2M15 13v2"/></>,
  }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{color:"var(--text)"}} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

type ActiveSession = { addonId: string; bankData: BankData; startedAt: number }

export default function AddonsPage() {
  const [userId, setUserId] = useState('')
  const [purchases, setPurchases] = useState<Purchases>({})
  const [paying, setPaying] = useState<Addon | null>(null)
  const [toast, setToast] = useState<{ kind: 'success'|'pending'; text: string } | null>(null)
  const [projects, setProjects] = useState<ProjectMini[]>([])
  const [resumeSession, setResumeSession] = useState<ActiveSession | null>(null)
  const [picker, setPicker] = useState<Addon | null>(null)  // Projekt-Picker fuer welches Addon

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUserId(data.session.user.id)
      const { data: projs } = await supabase
        .from('projects')
        .select('id,title,status')
        .order('created_at', { ascending: false })
      setProjects((projs as ProjectMini[]) ?? [])
    })
  }, [])

  const storageKey = userId ? `addon_purchases_${userId}` : ''
  const storageKeyRef = useRef(storageKey)
  storageKeyRef.current = storageKey

  // Functional updater — kein Closure-Problem mehr und localStorage immer in sync
  const persist = useCallback((updater: (prev: Purchases) => Purchases) => {
    setPurchases(prev => {
      const next = updater(prev)
      if (storageKeyRef.current && typeof window !== 'undefined') {
        window.localStorage.setItem(storageKeyRef.current, JSON.stringify(next))
      }
      return next
    })
  }, [])

  const markActive = useCallback((addonId: string, reference: string, wasNachLate?: boolean, addonName?: string) => {
    persist(prev => ({
      ...prev,
      [addonId]: {
        reference,
        status: 'active',
        createdAt: prev[addonId]?.createdAt ?? Date.now(),
        completedAt: Date.now(),
      },
    }))
    if (wasNachLate && addonName) {
      setToast({ kind: 'success', text: `Zahlung für ${addonName} erkannt — Add-on ist jetzt aktiv.` })
      setTimeout(() => setToast(null), 5000)
    }
  }, [persist])

  const markPending = useCallback((addonId: string, reference: string) => {
    persist(prev => ({ ...prev, [addonId]: { reference, status: 'pending', createdAt: Date.now() } }))
  }, [persist])

  const assignToProject = useCallback((addonId: string, projectId: string, projectTitle: string, addonName: string) => {
    persist(prev => {
      const cur = prev[addonId]
      if (!cur) return prev
      return { ...prev, [addonId]: { ...cur, projectId: projectId || undefined, projectTitle: projectTitle || undefined } }
    })
    if (projectId) {
      setToast({ kind: 'success', text: `${addonName} wurde "${projectTitle}" zugewiesen.` })
      setTimeout(() => setToast(null), 3500)
    }
  }, [persist])

  // Initial Load der Käufe aus localStorage
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) setPurchases(JSON.parse(raw))
    } catch {}
  }, [storageKey])

  // Aktive Zahlungs-Session aus localStorage wiederherstellen (nach Reload)
  const sessionKey = userId ? `active_payment_session_${userId}` : ''
  useEffect(() => {
    if (!sessionKey || typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(sessionKey)
      if (!raw) return
      const data: ActiveSession = JSON.parse(raw)
      // Wenn die 2-Min-Session bereits klar abgelaufen ist (+1 Min Puffer), nicht reopen
      if (Date.now() - data.startedAt > PAYMENT_POLL_DURATION_MS + 60_000) {
        window.localStorage.removeItem(sessionKey)
        return
      }
      const addon = CATALOG.find(a => a.id === data.addonId)
      if (!addon) { window.localStorage.removeItem(sessionKey); return }
      setResumeSession(data)
      setPaying(addon)
    } catch {
      window.localStorage.removeItem(sessionKey)
    }
  }, [sessionKey])

  function clearActiveSession() {
    if (typeof window !== 'undefined' && sessionKey) {
      window.localStorage.removeItem(sessionKey)
    }
    setResumeSession(null)
  }

  function persistActiveSession(addonId: string, bankData: BankData, startedAt: number) {
    if (typeof window !== 'undefined' && sessionKey) {
      window.localStorage.setItem(sessionKey, JSON.stringify({ addonId, bankData, startedAt }))
    }
  }

  // Sync-Funktion: prueft alle nicht-aktiven Referenzen gegen Enjyn
  const syncStatuses = useCallback(async () => {
    const snapshot = purchases
    const entries = Object.entries(snapshot).filter(([, r]) => r && r.status !== 'active' && r.reference)
    if (entries.length === 0) return
    for (const [addonId, rec] of entries) {
      if (!rec) continue
      try {
        const r = await fetch(`/api/payments/check?reference=${encodeURIComponent(rec.reference)}`)
        const d = await r.json()
        if (d.status === 'done') {
          const addon = CATALOG.find(a => a.id === addonId)
          markActive(addonId, rec.reference, rec.status === 'pending', addon?.name)
        }
      } catch { /* still pending */ }
    }
  }, [purchases, markActive])

  // Manueller "Pruefen"-Button mit 30-Minuten-Cooldown — kein Auto-Check
  const COOLDOWN_MS = 30 * 60 * 1000
  const [lastCheckAt, setLastCheckAt] = useState<number>(0)
  const [tick, setTick] = useState(Date.now())

  // Cooldown-Wert aus localStorage laden
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return
    const raw = window.localStorage.getItem(`addon_check_last_${userId}`)
    if (raw) setLastCheckAt(Number(raw) || 0)
  }, [userId])

  // Display-Ticker (jede Minute) — nur wenn ein Cooldown aktiv ist
  useEffect(() => {
    const left = lastCheckAt + COOLDOWN_MS - Date.now()
    if (left <= 0) return
    const id = setInterval(() => setTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [lastCheckAt])

  const cooldownLeftMs = Math.max(0, lastCheckAt + COOLDOWN_MS - tick)
  const cooldownActive = cooldownLeftMs > 0
  const cooldownMinLeft = Math.ceil(cooldownLeftMs / 60_000)

  const hasPending = Object.values(purchases).some(r => r?.status === 'pending')
  const [refreshing, setRefreshing] = useState(false)

  return (
    <div className="page-content-full">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Add-Ons</h1>
          <p>Erweitere dein Projekt mit zusätzlichen Services · Zahlung über <strong>Enjyn</strong></p>
        </div>
        {hasPending && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <button
              onClick={async () => {
                if (cooldownActive || refreshing) return
                setRefreshing(true)
                await syncStatuses()
                const ts = Date.now()
                setLastCheckAt(ts)
                setTick(ts)
                if (typeof window !== 'undefined' && userId) {
                  window.localStorage.setItem(`addon_check_last_${userId}`, String(ts))
                }
                setRefreshing(false)
              }}
              disabled={refreshing || cooldownActive}
              className="tap-scale"
              style={{
                padding: '8px 14px',
                background: cooldownActive ? 'var(--surface-2)' : 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 10,
                fontSize: 12.5, fontWeight: 600,
                color: cooldownActive ? 'var(--text-muted)' : 'var(--text)',
                cursor: cooldownActive || refreshing ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              {refreshing ? (
                <span style={{ width: 12, height: 12, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
              )}
              {cooldownActive ? `Wieder in ${cooldownMinLeft} Min` : 'Zahlung pruefen'}
            </button>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
              Manueller Check · max alle 30 Min
            </span>
          </div>
        )}
      </div>

      <div className="animate-fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 100 }}>
        {CATALOG.map(a => {
          const rec = purchases[a.id]
          const isActive  = rec?.status === 'active'
          const isPending = rec?.status === 'pending'
          return (
            <div key={a.id} className="tap-scale" style={{
              background: 'var(--surface)',
              border: `1.5px solid ${isActive ? 'var(--green)' : isPending ? 'var(--amber)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)', padding: 18,
              cursor: isActive ? 'default' : 'pointer', transition: 'all 0.15s',
              position: 'relative', opacity: isActive ? 0.95 : 1,
            }} onClick={() => { if (!isActive && !isPending) setPaying(a) }}>

              {/* Status-Badge oben rechts */}
              {(isActive || isPending) && (
                <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 7, fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
                  background: isActive ? 'var(--green-bg)' : 'rgba(255,176,0,.12)',
                  color: isActive ? 'var(--green-dark)' : '#A66E00',
                  border: `1px solid ${isActive ? 'var(--green-border)' : 'rgba(255,176,0,.25)'}`,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? 'var(--green)' : 'var(--amber)', animation: isPending ? 'pulse 2s infinite' : 'none' }} />
                  {isActive ? 'AKTIV' : 'AUSSTEHEND'}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AddonIcon name={a.icon} />
                </div>
                {!isActive && !isPending && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{a.category.toUpperCase()}</span>
                )}
              </div>
              <h3 style={{ marginBottom: 6 }}>{a.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>{a.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>€{a.price.toLocaleString('de')}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); if (!isActive && !isPending) setPaying(a) }}
                  disabled={isActive}
                  style={{
                    padding: '7px 14px', border: 'none', borderRadius: 'var(--r-sm)',
                    background: isActive ? 'var(--green-bg)' : isPending ? 'var(--surface-2)' : 'var(--text)',
                    color: isActive ? 'var(--green-dark)' : isPending ? 'var(--text-secondary)' : '#fff',
                    fontSize: 12, fontWeight: 600, cursor: isActive ? 'default' : 'pointer', minHeight: 32,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {isActive ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                      Aktiv
                    </>
                  ) : isPending ? 'Wartet auf Zahlung' : 'Jetzt kaufen'}
                </button>
              </div>

              {/* Projekt-Zuweisung — nur fuer aktive Add-ons */}
              {isActive && (
                <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12 }}>
                  {rec?.projectId && rec.projectTitle ? (
                    <button
                      onClick={() => setPicker(a)}
                      className="tap-scale"
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 8, padding: '8px 12px', background: 'var(--green-bg)', border: '1px solid var(--green-border)',
                        borderRadius: 8, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 13l4 4L19 7"/></svg>
                        <span style={{ fontSize: 12, color: 'var(--green-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <strong>{rec.projectTitle}</strong>
                        </span>
                      </div>
                      <span style={{ fontSize: 10.5, color: 'var(--green-dark)', opacity: .7, flexShrink: 0 }}>aendern</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setPicker(a)}
                      className="tap-scale"
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 6, padding: '9px 12px', background: 'var(--bg)', border: '1px dashed var(--border-strong)',
                        borderRadius: 8, fontFamily: 'inherit', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
                      }}
                    >
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--text)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      </span>
                      Projekt zuweisen
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.kind === 'success' ? 'var(--green-bg)' : 'rgba(255,176,0,.12)',
          color: toast.kind === 'success' ? 'var(--green-dark)' : '#A66E00',
          border: `1px solid ${toast.kind === 'success' ? 'var(--green-border)' : 'rgba(255,176,0,.25)'}`,
          padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxWidth: 'calc(100% - 32px)',
          zIndex: 400,
        }}>
          {toast.text}
        </div>
      )}

      {/* Payment Modal — auch nach Reload via resumeSession wieder aufgenommen */}
      {paying && (
        <PaymentModal
          amount={paying.price}
          note={`Add-on: ${paying.name}`}
          itemTitle={paying.name}
          resumeFrom={resumeSession ? { bankData: resumeSession.bankData, startedAt: resumeSession.startedAt } : undefined}
          onSessionReady={(bankData, startedAt) => persistActiveSession(paying.id, bankData, startedAt)}
          onClose={() => { setPaying(null); clearActiveSession() }}
          onSuccess={(reference) => {
            markActive(paying.id, reference)
            clearActiveSession()
            setToast({ kind: 'success', text: `${paying.name} ist jetzt aktiv.` })
            setTimeout(() => setToast(null), 4000)
          }}
          onTimeout={(reference) => {
            markPending(paying.id, reference)
            clearActiveSession()
            setToast({ kind: 'pending', text: `Zahlung noch nicht erkannt. ${paying.name} wird automatisch in den nächsten 24h aktiviert, sobald sie eingeht.` })
            setTimeout(() => setToast(null), 7000)
          }}
        />
      )}

      {/* Project Picker Modal */}
      {picker && (
        <ProjectPicker
          addon={picker}
          projects={projects}
          currentProjectId={purchases[picker.id]?.projectId}
          onClose={() => setPicker(null)}
          onSelect={(projectId, projectTitle) => {
            assignToProject(picker.id, projectId, projectTitle, picker.name)
            setPicker(null)
          }}
          onClear={() => {
            assignToProject(picker.id, '', '', picker.name)
            setPicker(null)
          }}
        />
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Project Picker Modal
// ───────────────────────────────────────────────────────────────────────

const PHASE_LABEL: Record<string, string> = {
  intake: 'Intake', planning: 'Planning', active: 'In Arbeit', testing: 'Testing', done: 'Abgeschlossen',
}

function ProjectPicker({
  addon, projects, currentProjectId, onClose, onSelect, onClear,
}: {
  addon: Addon
  projects: ProjectMini[]
  currentProjectId?: string
  onClose: () => void
  onSelect: (projectId: string, projectTitle: string) => void
  onClear: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500, padding: 16, backdropFilter: 'blur(4px)',
        animation: 'fadeIn .2s ease',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 460, background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        animation: 'slideIn .25s cubic-bezier(.16,1,.3,1) both',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', margin: 0 }}>PROJEKT ZUWEISEN</p>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {addon.name}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Schliessen" style={{ width: 30, height: 30, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>

        <div style={{ padding: 12, overflowY: 'auto' }}>
          {projects.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Noch kein Projekt</p>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>Erstelle erst ein Projekt um Add-ons zuzuweisen.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {projects.map(p => {
                const isCurrent = p.id === currentProjectId
                const initial = p.title.charAt(0).toUpperCase()
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelect(p.id, p.title)}
                    className="tap-scale"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 14px',
                      background: isCurrent ? 'var(--green-bg)' : 'var(--bg)',
                      border: `1px solid ${isCurrent ? 'var(--green-border)' : 'var(--border)'}`,
                      borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      transition: 'background .1s, border-color .1s',
                    }}
                    onMouseEnter={(e) => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                    onMouseLeave={(e) => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'var(--bg)' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: isCurrent ? 'var(--green-dark)' : 'var(--surface-2)', color: isCurrent ? '#fff' : 'var(--text)', border: isCurrent ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>Phase: {PHASE_LABEL[p.status] ?? p.status}</p>
                    </div>
                    {isCurrent && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 13l4 4L19 7"/></svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {currentProjectId && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            <button
              onClick={onClear}
              style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Zuweisung entfernen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
