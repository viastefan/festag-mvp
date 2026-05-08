'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import PaymentModal, { BankData, PAYMENT_POLL_DURATION_MS } from '@/components/PaymentModal'
import AddonDetailModal from '@/components/AddonDetailModal'
import { CATALOG, CATEGORIES, type Addon, type AddonCategory } from '@/lib/addons-catalog'

type PurchaseStatus = 'active' | 'pending' | undefined
type PurchaseRecord = {
  reference: string
  status: PurchaseStatus
  createdAt: number
  completedAt?: number
  projectId?: string
  projectTitle?: string
}
type Purchases = Record<string, PurchaseRecord>
type ProjectMini = { id: string; title: string; status: string }
type ActiveSession = { addonId: string; bankData: BankData; startedAt: number }

const PHASE_LABEL: Record<string, string> = {
  intake: 'Intake', planning: 'Planning', active: 'In Arbeit', testing: 'Testing', done: 'Abgeschlossen',
}

function AddonIcon({ category }: { category: AddonCategory }) {
  const icons: Record<AddonCategory, JSX.Element> = {
    'Design':     <><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></>,
    'Frontend':   <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></>,
    'Backend':    <><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/></>,
    'AI':         <><circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6"/></>,
    'Marketing':  <><path d="M3 11l18-8v18L3 13z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></>,
    'E-Commerce': <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></>,
    'Analytics':  <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    'Mobile':     <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></>,
    'DevOps':     <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    'Security':   <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--text)' }} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{icons[category]}</svg>
}

export default function AddonsPage() {
  const [userId, setUserId] = useState('')
  const [purchases, setPurchases] = useState<Purchases>({})
  const [paying, setPaying] = useState<Addon | null>(null)
  const [detail, setDetail] = useState<Addon | null>(null)
  const [picker, setPicker] = useState<Addon | null>(null)
  const [toast, setToast] = useState<{ kind: 'success'|'pending'; text: string } | null>(null)
  const [projects, setProjects] = useState<ProjectMini[]>([])
  const [resumeSession, setResumeSession] = useState<ActiveSession | null>(null)

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<AddonCategory | 'Alle' | 'Beliebt' | 'Aktiv'>('Alle')
  const [priceRange, setPriceRange] = useState<'alle'|'unter500'|'500-1000'|'ueber1000'>('alle')
  const [sortBy, setSortBy] = useState<'popular'|'price-asc'|'price-desc'|'effort-asc'>('popular')

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

  const persist = useCallback((updater: (prev: Purchases) => Purchases) => {
    setPurchases(prev => {
      const next = updater(prev)
      if (storageKeyRef.current && typeof window !== 'undefined') {
        window.localStorage.setItem(storageKeyRef.current, JSON.stringify(next))
      }
      return next
    })
  }, [])

  const markActive = useCallback((addonId: string, reference: string) => {
    persist(prev => ({
      ...prev,
      [addonId]: {
        reference,
        status: 'active',
        createdAt: prev[addonId]?.createdAt ?? Date.now(),
        completedAt: Date.now(),
        projectId: prev[addonId]?.projectId,
        projectTitle: prev[addonId]?.projectTitle,
      },
    }))
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

  // Load purchases
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) setPurchases(JSON.parse(raw))
    } catch {}
  }, [storageKey])

  // Resume aktive Zahlungs-Session
  const sessionKey = userId ? `active_payment_session_${userId}` : ''
  const resumeAttemptedRef = useRef(false)

  useEffect(() => {
    if (!sessionKey || typeof window === 'undefined') return
    if (resumeAttemptedRef.current) return
    try {
      const raw = window.localStorage.getItem(sessionKey)
      if (!raw) { resumeAttemptedRef.current = true; return }
      const data: ActiveSession = JSON.parse(raw)

      const purchasesRaw = storageKey ? window.localStorage.getItem(storageKey) : null
      const cur = purchasesRaw ? JSON.parse(purchasesRaw) : {}
      if (cur[data.addonId]?.status === 'active') {
        window.localStorage.removeItem(sessionKey)
        resumeAttemptedRef.current = true
        return
      }

      if (Date.now() - data.startedAt > PAYMENT_POLL_DURATION_MS + 60_000) {
        window.localStorage.removeItem(sessionKey)
        resumeAttemptedRef.current = true
        return
      }

      const addon = CATALOG.find(a => a.id === data.addonId)
      if (!addon) {
        window.localStorage.removeItem(sessionKey)
        resumeAttemptedRef.current = true
        return
      }
      resumeAttemptedRef.current = true
      setResumeSession(data)
      setPaying(addon)
    } catch {
      window.localStorage.removeItem(sessionKey)
      resumeAttemptedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, storageKey])

  function clearActiveSessionStorage() {
    if (typeof window !== 'undefined' && sessionKey) {
      window.localStorage.removeItem(sessionKey)
    }
  }
  function fullResetActiveSession() {
    clearActiveSessionStorage()
    setResumeSession(null)
  }
  function persistActiveSession(addonId: string, bankData: BankData, startedAt: number) {
    if (typeof window !== 'undefined' && sessionKey) {
      window.localStorage.setItem(sessionKey, JSON.stringify({ addonId, bankData, startedAt }))
    }
  }

  // Manueller Pruefen-Button (Cooldown 30 Min)
  const COOLDOWN_MS = 30 * 60 * 1000
  const [lastCheckAt, setLastCheckAt] = useState<number>(0)
  const [tick, setTick] = useState(Date.now())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return
    const raw = window.localStorage.getItem(`addon_check_last_${userId}`)
    if (raw) setLastCheckAt(Number(raw) || 0)
  }, [userId])

  useEffect(() => {
    const left = lastCheckAt + COOLDOWN_MS - Date.now()
    if (left <= 0) return
    const id = setInterval(() => setTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [lastCheckAt])

  const cooldownLeftMs = Math.max(0, lastCheckAt + COOLDOWN_MS - tick)
  const cooldownActive = cooldownLeftMs > 0
  const cooldownMinLeft = Math.ceil(cooldownLeftMs / 60_000)

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
          markActive(addonId, rec.reference)
          const addon = CATALOG.find(a => a.id === addonId)
          if (addon && rec.status === 'pending') {
            setToast({ kind: 'success', text: `Zahlung für ${addon.name} erkannt — Add-on ist jetzt aktiv.` })
            setTimeout(() => setToast(null), 5000)
          }
        }
      } catch { /* ignore */ }
    }
  }, [purchases, markActive])

  const hasPending = Object.values(purchases).some(r => r?.status === 'pending')

  // Filter + Search + Sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = CATALOG.filter(a => {
      if (activeCategory === 'Beliebt' && !a.popular) return false
      if (activeCategory === 'Aktiv') {
        if (purchases[a.id]?.status !== 'active') return false
      } else if (activeCategory !== 'Alle' && activeCategory !== 'Beliebt') {
        if (a.category !== activeCategory) return false
      }
      if (priceRange === 'unter500' && a.price >= 500) return false
      if (priceRange === '500-1000' && (a.price < 500 || a.price > 1000)) return false
      if (priceRange === 'ueber1000' && a.price <= 1000) return false
      if (!q) return true
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q)) ||
        a.category.toLowerCase().includes(q)
      )
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price
      if (sortBy === 'price-desc') return b.price - a.price
      if (sortBy === 'effort-asc') return a.estimatedHours - b.estimatedHours
      // popular: popular first, dann name
      if (!!a.popular !== !!b.popular) return a.popular ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return list
  }, [search, activeCategory, priceRange, sortBy, purchases])

  // Featured: 3 popular Add-ons (deterministisch nach Tagestakt rotiert)
  const featured = useMemo(() => {
    const pop = CATALOG.filter(a => a.popular)
    if (pop.length <= 3) return pop
    const dayIdx = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % pop.length
    return [pop[dayIdx], pop[(dayIdx + 1) % pop.length], pop[(dayIdx + 2) % pop.length]]
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = { Alle: CATALOG.length, Beliebt: CATALOG.filter(a => a.popular).length, Aktiv: 0 }
    Object.values(purchases).forEach(r => { if (r?.status === 'active') c.Aktiv++ })
    CATEGORIES.forEach(cat => { c[cat.key] = CATALOG.filter(a => a.category === cat.key).length })
    return c
  }, [purchases])

  return (
    <div className="page-content-full">
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1>Marketplace</h1>
          <p>{CATALOG.length} Add-ons für dein Projekt · Zahlung per SEPA</p>
        </div>
        {hasPending && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <button
              onClick={async () => {
                if (cooldownActive || refreshing) return
                setRefreshing(true)
                await syncStatuses()
                const ts = Date.now()
                setLastCheckAt(ts); setTick(ts)
                if (typeof window !== 'undefined' && userId) window.localStorage.setItem(`addon_check_last_${userId}`, String(ts))
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
              {refreshing
                ? <span style={{ width: 12, height: 12, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>}
              {cooldownActive ? `Wieder in ${cooldownMinLeft} Min` : 'Zahlung prüfen'}
            </button>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Manueller Check · max alle 30 Min</span>
          </div>
        )}
      </div>

      {/* Featured-Hero — nur sichtbar wenn keine Filter aktiv */}
      {activeCategory === 'Alle' && search === '' && priceRange === 'alle' && featured.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', margin: '0 0 10px' }}>★ EMPFOHLEN HEUTE</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {featured.map(a => {
              const rec = purchases[a.id]
              const isActive = rec?.status === 'active'
              return (
                <button
                  key={a.id}
                  onClick={() => setDetail(a)}
                  className="tap-scale"
                  style={{
                    textAlign: 'left', padding: 18, borderRadius: 'var(--r-md)',
                    background: 'linear-gradient(135deg, var(--accent), var(--text))',
                    color: '#fff', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 8,
                    minHeight: 140, position: 'relative', overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', opacity: .75 }}>
                      {a.category.toUpperCase()}
                    </span>
                    {isActive && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,.18)', letterSpacing: '.06em' }}>AKTIV</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '4px 0 0', lineHeight: 1.25 }}>{a.name}</h3>
                  <p style={{ fontSize: 12.5, color: '#fff', opacity: .85, margin: 0, lineHeight: 1.5, flex: 1 }}>{a.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>€{a.price.toLocaleString('de')}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, opacity: .85, display: 'flex', alignItems: 'center', gap: 3 }}>
                      Details <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Such- und Filterleiste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suche nach Add-ons (Branding, Auth, AI, Stripe …)"
              style={{
                width: '100%', height: 42, padding: '0 16px 0 38px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, fontSize: 14, color: 'var(--text)',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
          <select
            value={priceRange}
            onChange={e => setPriceRange(e.target.value as any)}
            style={{
              height: 42, padding: '0 32px 0 14px', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 12, fontSize: 13,
              color: 'var(--text)', outline: 'none', fontFamily: 'inherit', fontWeight: 500,
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='none' stroke='%23999' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' d='M1 1l4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            <option value="alle">Alle Preise</option>
            <option value="unter500">Unter €500</option>
            <option value="500-1000">€500 – €1.000</option>
            <option value="ueber1000">Über €1.000</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{
              height: 42, padding: '0 32px 0 14px', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 12, fontSize: 13,
              color: 'var(--text)', outline: 'none', fontFamily: 'inherit', fontWeight: 500,
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='none' stroke='%23999' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' d='M1 1l4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            <option value="popular">★ Sortieren: Beliebt</option>
            <option value="price-asc">Preis ↑</option>
            <option value="price-desc">Preis ↓</option>
            <option value="effort-asc">Wenig Aufwand</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {([
            { key: 'Alle' as const,    label: 'Alle' },
            { key: 'Beliebt' as const, label: '★ Beliebt' },
            { key: 'Aktiv' as const,   label: 'Aktiv' },
          ]).map(t => {
            const isActive = activeCategory === t.key
            const count = counts[t.key] ?? 0
            return (
              <button
                key={t.key}
                onClick={() => setActiveCategory(t.key)}
                style={{
                  padding: '7px 13px', border: '1px solid var(--border)', borderRadius: 8,
                  background: isActive ? 'var(--text)' : 'var(--surface)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: 'inherit', flexShrink: 0,
                }}
              >
                {t.label} <span style={{ opacity: .65, marginLeft: 4 }}>{count}</span>
              </button>
            )
          })}
          <span style={{ width: 1, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
          {CATEGORIES.map(c => {
            const isActive = activeCategory === c.key
            return (
              <button
                key={c.key}
                onClick={() => setActiveCategory(c.key)}
                style={{
                  padding: '7px 13px', border: '1px solid var(--border)', borderRadius: 8,
                  background: isActive ? 'var(--text)' : 'var(--surface)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: 'inherit', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <span>{c.emoji}</span> {c.label} <span style={{ opacity: .65 }}>{counts[c.key] ?? 0}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 8, marginBottom: 60 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Keine Add-ons gefunden</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Versuche eine andere Suche oder Kategorie.</p>
        </div>
      ) : (
        <div className="animate-fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 100 }}>
          {filtered.map(a => {
            const rec = purchases[a.id]
            const isActive  = rec?.status === 'active'
            const isPending = rec?.status === 'pending'
            return (
              <div key={a.id} className="tap-scale" style={{
                background: 'var(--surface)',
                border: `1.5px solid ${isActive ? 'var(--green)' : isPending ? 'var(--amber)' : 'var(--border)'}`,
                borderRadius: 'var(--r-md)', padding: 18, cursor: 'pointer', transition: 'all 0.15s',
                position: 'relative', display: 'flex', flexDirection: 'column',
              }} onClick={() => setDetail(a)}>

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

                {a.popular && !isActive && !isPending && (
                  <div style={{ position: 'absolute', top: 10, right: 10, padding: '2px 7px', borderRadius: 5, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                    ★ BELIEBT
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AddonIcon category={a.category} />
                  </div>
                  {!isActive && !isPending && !a.popular && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{a.category.toUpperCase()}</span>
                  )}
                </div>
                <h3 style={{ marginBottom: 6, fontSize: 15, lineHeight: 1.3 }}>{a.name}</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5, flex: 1 }}>{a.description}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>€{a.price.toLocaleString('de')}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    Details <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                  </span>
                </div>

                {isActive && (
                  <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12 }}>
                    {rec?.projectId && rec.projectTitle ? (
                      <button onClick={() => setPicker(a)} className="tap-scale"
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 8, padding: '7px 11px', background: 'var(--green-bg)', border: '1px solid var(--green-border)',
                          borderRadius: 8, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 13l4 4L19 7"/></svg>
                          <span style={{ fontSize: 11.5, color: 'var(--green-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <strong>{rec.projectTitle}</strong>
                          </span>
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--green-dark)', opacity: .7 }}>aendern</span>
                      </button>
                    ) : (
                      <button onClick={() => setPicker(a)} className="tap-scale"
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 6, padding: '7px 11px', background: 'var(--bg)', border: '1px dashed var(--border-strong)',
                          borderRadius: 8, fontFamily: 'inherit', cursor: 'pointer',
                          fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)',
                        }}>
                        <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--text)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
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
      )}

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

      {/* Detail Modal */}
      {detail && (
        <AddonDetailModal
          addon={detail}
          status={purchases[detail.id]?.status}
          projectTitle={purchases[detail.id]?.projectTitle}
          onClose={() => setDetail(null)}
          onBuy={() => { setPaying(detail); setDetail(null) }}
          onAssignProject={() => { setPicker(detail); setDetail(null) }}
        />
      )}

      {/* Payment Modal */}
      {paying && (
        <PaymentModal
          amount={paying.price}
          note={`Add-on: ${paying.name}`}
          itemTitle={paying.name}
          resumeFrom={resumeSession ? { bankData: resumeSession.bankData, startedAt: resumeSession.startedAt } : undefined}
          onSessionReady={(bankData, startedAt) => persistActiveSession(paying.id, bankData, startedAt)}
          onClose={() => { setPaying(null); fullResetActiveSession() }}
          onSuccess={(reference) => {
            markActive(paying.id, reference)
            clearActiveSessionStorage()
            setToast({ kind: 'success', text: `${paying.name} ist jetzt aktiv.` })
            setTimeout(() => setToast(null), 4000)
          }}
          onTimeout={(reference) => {
            markPending(paying.id, reference)
            clearActiveSessionStorage()
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
    <div role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 16, backdropFilter: 'blur(4px)', animation: 'fadeIn .2s ease' }}
    >
      <div style={{ width: '100%', maxWidth: 460, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', animation: 'slideIn .25s cubic-bezier(.16,1,.3,1) both', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', margin: 0 }}>PROJEKT ZUWEISEN</p>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addon.name}</h2>
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
                  <button key={p.id} onClick={() => onSelect(p.id, p.title)} className="tap-scale"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: isCurrent ? 'var(--green-bg)' : 'var(--bg)', border: `1px solid ${isCurrent ? 'var(--green-border)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: isCurrent ? 'var(--green-dark)' : 'var(--surface-2)', color: isCurrent ? '#fff' : 'var(--text)', border: isCurrent ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>Phase: {PHASE_LABEL[p.status] ?? p.status}</p>
                    </div>
                    {isCurrent && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 13l4 4L19 7"/></svg>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        {currentProjectId && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            <button onClick={onClear} style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
              Zuweisung entfernen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
