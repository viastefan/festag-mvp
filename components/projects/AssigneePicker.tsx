'use client'

/**
 * Assignee picker — type "@" and Festag suggests who can take the project.
 *
 * Suggestions appear the moment the field is focused, so handing work over
 * never starts from a blank box.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DevSuggestion } from '@/app/api/dev/search/route'

type Props = {
  onSelect: (person: DevSuggestion) => void
  selected?: DevSuggestion | null
  placeholder?: string
  label?: string
}

export default function AssigneePicker({
  onSelect,
  selected,
  placeholder = '@benutzername',
  label = 'An wen soll das Projekt gehen?',
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DevSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dev/search?q=${encodeURIComponent(q)}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        setResults([])
        return
      }
      const json = await res.json()
      setResults(json.results || [])
      setActive(0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  /* Debounce so typing does not hammer the endpoint. */
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => void search(query), query ? 180 : 0)
    return () => window.clearTimeout(t)
  }, [query, open, search])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function choose(person: DevSuggestion) {
    onSelect(person)
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="fap" ref={rootRef}>
      <style>{ASSIGNEE_PICKER_STYLES}</style>
      {label ? <label className="fap-label">{label}</label> : null}

      {selected ? (
        <div className="fap-chosen">
          <Avatar person={selected} />
          <span className="fap-chosen-copy">
            <span className="fap-chosen-name">{selected.name}</span>
            <span className="fap-chosen-handle">@{selected.username}</span>
          </span>
          <button
            type="button"
            className="fap-clear"
            onClick={() => onSelect({ ...selected, id: '' })}
            aria-label="Auswahl entfernen"
          >
            Ändern
          </button>
        </div>
      ) : (
        <>
          <input
            className="fap-input"
            value={query}
            placeholder={placeholder}
            onChange={(e) => setQuery(e.target.value.replace(/^@+/, ''))}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            aria-autocomplete="list"
            aria-expanded={open}
          />

          {open ? (
            <div className="fap-menu" role="listbox">
              {loading && results.length === 0 ? (
                <p className="fap-empty">Suche…</p>
              ) : results.length === 0 ? (
                <p className="fap-empty">
                  {query ? 'Niemand gefunden.' : 'Noch keine Benutzernamen vorhanden.'}
                </p>
              ) : (
                results.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    className={`fap-item${i === active ? ' is-active' : ''}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(p)}
                  >
                    <Avatar person={p} />
                    <span className="fap-item-copy">
                      <span className="fap-item-name">{p.name}</span>
                      <span className="fap-item-handle">@{p.username}</span>
                    </span>
                    {p.role ? <span className="fap-item-role">{p.role}</span> : null}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function Avatar({ person }: { person: DevSuggestion }) {
  if (person.avatarUrl) {
    return <img className="fap-avatar" src={person.avatarUrl} alt="" />
  }
  const initial = (person.name || person.username || '?').charAt(0).toUpperCase()
  return (
    <span className="fap-avatar fap-avatar-fallback" aria-hidden>
      {initial}
    </span>
  )
}

const ASSIGNEE_PICKER_STYLES = `
.fap { position: relative; display: flex; flex-direction: column; gap: 8px; }
.fap-label { font-size: 15px; color: #8891a0; }
.fap-input {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border-radius: 6px;
  border: 1px solid rgba(30, 30, 32, 0.12);
  background: #FFFFFF;
  color: #1e1e20;
  font: inherit;
  font-size: 16px;
  outline: none;
  transition: border-color 0.16s ease;
}
.fap-input:focus { border-color: rgba(30, 30, 32, 0.28); }
.fap-input::placeholder { color: #8891a0; }

.fap-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 40;
  padding: 6px;
  border-radius: 10px;
  background: #FFFFFF;
  border: 1px solid rgba(30, 30, 32, 0.08);
  box-shadow: 0 12px 34px rgba(20, 20, 20, 0.12), 0 1px 2px rgba(0, 0, 0, 0.04);
  max-height: 300px;
  overflow-y: auto;
}
.fap-empty { margin: 0; padding: 14px 10px; font-size: 15px; color: #8891a0; }

.fap-item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.fap-item.is-active { background: rgba(201, 147, 43, 0.09); }
.fap-item-copy { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.fap-item-name { font-size: 16px; color: #1e1e20; }
.fap-item-handle { font-size: 14px; color: #8891a0; }
.fap-item-role {
  font-size: 13px;
  color: #5c5c62;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(15, 15, 18, 0.05);
  flex-shrink: 0;
}

.fap-avatar {
  width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
  object-fit: cover;
}
.fap-avatar-fallback {
  display: flex; align-items: center; justify-content: center;
  background: #5C554C; color: #FBF7EE; font-size: 15px;
}

.fap-chosen {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(30, 30, 32, 0.10);
  background: #FFFFFF;
}
.fap-chosen-copy { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.fap-chosen-name { font-size: 16px; color: #1e1e20; }
.fap-chosen-handle { font-size: 14px; color: #8891a0; }
.fap-clear {
  border: 1px solid rgba(30, 30, 32, 0.10);
  background: #FFFFFF;
  border-radius: 6px;
  padding: 7px 12px;
  font: inherit;
  font-size: 14px;
  color: #5c5c62;
  cursor: pointer;
}
.fap-clear:hover { background: #FCFBF8; color: #1e1e20; }

html[data-theme="dark"] .fap-input,
html[data-theme="dark"] .fap-menu,
html[data-theme="dark"] .fap-chosen,
html[data-theme="classic-dark"] .fap-input,
html[data-theme="classic-dark"] .fap-menu,
html[data-theme="classic-dark"] .fap-chosen {
  background: #1A1A1E;
  border-color: rgba(255, 255, 255, 0.10);
  color: #F5F4F1;
}
html[data-theme="dark"] .fap-item-name,
html[data-theme="classic-dark"] .fap-item-name { color: #F5F4F1; }
`.trim()
