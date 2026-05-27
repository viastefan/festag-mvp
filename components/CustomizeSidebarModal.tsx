'use client'

/**
 * Customize Sidebar — deutsche Linear-Variante.
 *
 * Verwendet das gemeinsame <Modal> Primitive (perfekt zentriert, voller
 * Backdrop mit Blur), damit das Pop-up sich exakt wie alle anderen
 * Modals verhält. Inhalt: gruppierte Liste der Sidebar-Items mit
 * Sichtbarkeits-Dropdown pro Eintrag plus globalem Badge-Stil.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CaretDown, DotsSixVertical } from '@phosphor-icons/react'
import Modal from './Modal'
import {
  DEFAULT_VISIBILITY,
  ITEM_LABELS,
  ITEM_SECTION,
  SECTION_LABELS,
  type BadgeStyle,
  type SidebarItemId,
  type SidebarPrefs,
  type SidebarSection,
  type SidebarVisibility,
  loadPrefs,
  savePrefs,
  visibilityOf,
} from '@/lib/sidebar-prefs'

type Props = { open: boolean; onClose: () => void }

const VISIBILITY_LABEL: Record<SidebarVisibility, string> = {
  always: 'Immer anzeigen',
  badged: 'Bei Hinweis anzeigen',
  never:  'Nicht anzeigen',
}

const BADGE_LABEL: Record<BadgeStyle, string> = {
  count: 'Zahl',
  dot:   'Punkt',
  bold:  'Fett',
}

// Section render order matches Sidebar.tsx structure.
const SECTION_ORDER: SidebarSection[] = ['personal', 'workspace', 'teams', 'tagro', 'tools']

export default function CustomizeSidebarModal({ open, onClose }: Props) {
  const [prefs, setPrefs] = useState<SidebarPrefs>(() => loadPrefs())

  // Re-sync from storage when opened so external edits in other tabs reflect.
  useEffect(() => {
    if (open) setPrefs(loadPrefs())
  }, [open])

  const grouped = useMemo(() => {
    const map: Record<SidebarSection, SidebarItemId[]> = {
      personal: [], workspace: [], teams: [], tagro: [], tools: [],
    }
    ;(Object.keys(ITEM_SECTION) as SidebarItemId[]).forEach((id) => {
      map[ITEM_SECTION[id]].push(id)
    })
    return map
  }, [])

  const setVisibility = useCallback((id: SidebarItemId, v: SidebarVisibility) => {
    setPrefs((curr) => {
      const next: SidebarPrefs = {
        ...curr,
        visibility: { ...curr.visibility, [id]: v },
      }
      savePrefs(next)
      return next
    })
  }, [])

  const setBadgeStyle = useCallback((style: BadgeStyle) => {
    setPrefs((curr) => {
      const next: SidebarPrefs = { ...curr, badgeStyle: style }
      savePrefs(next)
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    const next: SidebarPrefs = { visibility: {}, badgeStyle: 'count', order: {} }
    savePrefs(next)
    setPrefs(next)
  }, [])

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Sidebar anpassen"
      subtitle={'Welche Bereiche siehst du, was bleibt unter „Mehr".'}
      footer={
        <>
          <button
            type="button"
            onClick={resetAll}
            style={{
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', font: 'inherit', fontSize: 12.5,
              fontWeight: 500, letterSpacing: '.015em', cursor: 'pointer',
            }}
          >Auf Standard zurücksetzen</button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8,
              border: 0, background: 'var(--btn-prim, #5B647D)',
              color: 'var(--btn-prim-text, #fff)',
              font: 'inherit', fontSize: 13, fontWeight: 500,
              letterSpacing: '.015em', cursor: 'pointer',
            }}
          >Fertig</button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Global badge style */}
        <Row
          dragHandle={false}
          label="Standard-Badge-Stil"
          tone="muted"
        >
          <Dropdown
            value={BADGE_LABEL[prefs.badgeStyle]}
            options={(['count', 'dot', 'bold'] as BadgeStyle[]).map((b) => ({
              value: b, label: BADGE_LABEL[b],
            }))}
            onChange={(v) => setBadgeStyle(v as BadgeStyle)}
            leadingNumber={prefs.badgeStyle === 'count' ? 1 : null}
          />
        </Row>

        {/* Sections */}
        {SECTION_ORDER.map((section) => {
          const items = grouped[section]
          if (!items || items.length === 0) return null
          return (
            <section key={section} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{
                margin: 0, fontSize: 12, color: 'var(--text-muted)',
                fontWeight: 500, letterSpacing: '.015em',
              }}>{SECTION_LABELS[section]}</p>
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
                background: 'var(--card)',
              }}>
                {items.map((id, i) => {
                  const v = visibilityOf(id, prefs)
                  const dimmed = v === 'never'
                  return (
                    <div
                      key={id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px',
                        borderTop: i === 0 ? 'none' : '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                        opacity: dimmed ? 0.55 : 1,
                      }}
                    >
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)',
                      }}>
                        <DotsSixVertical size={13} />
                      </span>
                      <span style={{
                        flex: 1, fontSize: 13, color: 'var(--text)',
                        fontWeight: 500, letterSpacing: '.015em',
                      }}>{ITEM_LABELS[id]}</span>
                      <Dropdown
                        value={VISIBILITY_LABEL[v]}
                        options={(['always', 'badged', 'never'] as SidebarVisibility[]).map((opt) => ({
                          value: opt, label: VISIBILITY_LABEL[opt],
                        }))}
                        onChange={(val) => setVisibility(id, val as SidebarVisibility)}
                      />
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </Modal>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────

function Row({
  label, children, tone = 'default', dragHandle = true,
}: {
  label: string
  children: React.ReactNode
  tone?: 'default' | 'muted'
  dragHandle?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 14px',
      border: '1px solid var(--border)',
      borderRadius: 10,
      background: 'var(--card)',
    }}>
      {dragHandle ? (
        <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}><DotsSixVertical size={13} /></span>
      ) : null}
      <span style={{
        flex: 1, fontSize: 13,
        color: tone === 'muted' ? 'var(--text-secondary)' : 'var(--text)',
        fontWeight: 500, letterSpacing: '.015em',
      }}>{label}</span>
      {children}
    </div>
  )
}

function Dropdown({
  value, options, onChange, leadingNumber,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  leadingNumber?: number | null
}) {
  const [openMenu, setOpenMenu] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpenMenu((v) => !v)}
        style={{
          height: 28, padding: '0 10px', borderRadius: 7,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
          font: 'inherit', fontSize: 12, fontWeight: 500, letterSpacing: '.015em',
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 7,
          minWidth: 130, justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {typeof leadingNumber === 'number' && (
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{leadingNumber}</span>
          )}
          {value}
        </span>
        <CaretDown size={10} weight="bold" />
      </button>
      {openMenu && (
        <>
          <div
            onClick={() => setOpenMenu(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 9050 }}
          />
          <div
            role="menu"
            style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              zIndex: 9060,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: '0 12px 32px rgba(0,0,0,.12)',
              minWidth: 160,
              padding: 4,
              display: 'flex', flexDirection: 'column', gap: 1,
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpenMenu(false) }}
                style={{
                  height: 30, padding: '0 10px',
                  border: 0, background: 'transparent',
                  color: 'var(--text)', textAlign: 'left',
                  font: 'inherit', fontSize: 12.5, fontWeight: 500,
                  letterSpacing: '.015em', borderRadius: 6,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >{opt.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
