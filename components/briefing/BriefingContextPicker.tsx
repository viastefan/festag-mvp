'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import {
  pickResultToChip,
  rememberRecentPick,
  searchTagroPicker,
  type PickGroup,
  type PickResult,
} from '@/lib/tagro/picker-search'
import { useFestagMobile } from '@/hooks/useFestagMobile'

const PICK_GROUP_ORDER: PickGroup[] = [
  'Quellen', 'Personen', 'Projekte', 'Aufgaben', 'Entscheidungen', 'Berichte', 'Dokumente', 'Kunden', 'Notizen',
]

type Props = {
  open: boolean
  onClose: () => void
  onPick: (label: string) => void
}

export default function BriefingContextPicker({ open, onClose, onPick }: Props) {
  const isMobile = useFestagMobile()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PickResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    setResults([])
    setActiveIdx(0)
    const t = window.setTimeout(() => searchRef.current?.focus(), 40)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const t = window.setTimeout(async () => {
      try {
        const out = await searchTagroPicker(q)
        if (!cancelled) {
          setResults(out)
          setActiveIdx(0)
        }
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 180)
    return () => { cancelled = true; window.clearTimeout(t) }
  }, [open, q])

  const groups = useMemo(() => {
    const map = new Map<PickGroup, PickResult[]>()
    for (const r of results) {
      if (!map.has(r.group)) map.set(r.group, [])
      map.get(r.group)!.push(r)
    }
    return PICK_GROUP_ORDER
      .filter(g => map.has(g))
      .map(g => [g, map.get(g)!] as const)
  }, [results])

  const flatResults = useMemo(() => groups.flatMap(([, items]) => items), [groups])

  function pickAt(idx: number) {
    const r = flatResults[idx]
    if (!r) return
    rememberRecentPick(r)
    const chip = pickResultToChip(r)
    onPick(chip.label)
    onClose()
  }

  if (!open || typeof document === 'undefined') return null

  let flatCursor = 0

  return createPortal(
    <div
      className={['wsb-ctx-backdrop', isMobile ? 'wsb-ctx-backdrop--mobile' : ''].filter(Boolean).join(' ')}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={['wsb-ctx-sheet', isMobile ? 'wsb-ctx-sheet--mobile' : ''].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Kontext hinzufügen"
        onClick={e => e.stopPropagation()}
      >
        <div className="wsb-ctx-head">
          <div>
            <p className="wsb-ctx-kicker">Tagro</p>
            <h3 className="wsb-ctx-title">Kontext hinzufügen</h3>
          </div>
          <button type="button" className="wsb-ctx-close" onClick={onClose} aria-label="Schließen">
            <X size={16} weight="bold" />
          </button>
        </div>
        <div className="wsb-ctx-search">
          <MagnifyingGlass size={16} weight="regular" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            className="wsb-ctx-search-input"
            placeholder="Personen, Projekte, Berichte …"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (!flatResults.length) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIdx(i => Math.min(i + 1, flatResults.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIdx(i => Math.max(i - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                pickAt(activeIdx)
              }
            }}
          />
        </div>
        <div className="wsb-ctx-results">
          {loading && results.length === 0 ? (
            <p className="wsb-ctx-empty">Lade …</p>
          ) : null}
          {!loading && results.length === 0 ? (
            <p className="wsb-ctx-empty">Nichts gefunden{q ? ` für „${q}"` : ''}.</p>
          ) : null}
          {groups.map(([group, items]) => (
            <div key={group} className="wsb-ctx-group">
              <p className="wsb-ctx-group-label">{group}</p>
              {items.map((r) => {
                const idx = flatCursor++
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={['wsb-ctx-item', idx === activeIdx ? 'on' : ''].filter(Boolean).join(' ')}
                    onClick={() => pickAt(idx)}
                  >
                    <span className="wsb-ctx-item-title">{r.title}</span>
                    {r.hint ? <span className="wsb-ctx-item-sub">{r.hint}</span> : null}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
