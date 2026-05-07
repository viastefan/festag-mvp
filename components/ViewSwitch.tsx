'use client'

import { CaretDown, Check, House, Buildings, Briefcase, UserCircle } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { effectiveRole } from '@/lib/role'

type WorkspaceGroup = 'Persönlich' | 'Agentur' | 'Kunden' | 'Unternehmen'

type WorkspaceOption = {
  id: string
  name: string
  group: WorkspaceGroup
  subtitle: string
}

const GROUP_ORDER: WorkspaceGroup[] = ['Persönlich', 'Agentur', 'Kunden', 'Unternehmen']

const GROUP_ICONS = {
  Persönlich: UserCircle,
  Agentur: Buildings,
  Kunden: Briefcase,
  Unternehmen: House,
} as const

export default function ViewSwitch() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<WorkspaceOption[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    async function loadWorkspaces() {
      const sb = createClient()
      const { data } = await sb.auth.getUser()
      const user = data.user
      if (!user || cancelled) return

      const { data: profile } = await sb
        .from('profiles')
        .select('first_name, full_name, role, company_name')
        .eq('id', user.id)
        .single()

      if (cancelled) return

      const firstName = (profile as any)?.first_name?.trim()
      const fullName = (profile as any)?.full_name?.trim()
      const companyName = (profile as any)?.company_name?.trim()
      const role = effectiveRole((profile as any)?.role)
      const baseName = firstName || fullName?.split(' ')[0] || user.email?.split('@')[0] || 'Festag'

      const nextOptions: WorkspaceOption[] = [
        {
          id: 'personal',
          name: `${baseName} Workspace`,
          group: 'Persönlich',
          subtitle: 'Dein persönlicher Arbeitskontext',
        },
      ]

      if (role === 'admin') {
        nextOptions.push({
          id: 'festag-internal',
          name: 'Festag Internal',
          group: 'Agentur',
          subtitle: 'Interner Workspace für Administration und Delivery',
        })
      }

      if (companyName) {
        nextOptions.push({
          id: 'company-primary',
          name: companyName,
          group: 'Unternehmen',
          subtitle: 'Unternehmens-Workspace und Teamkontext',
        })
      }

      const storedId = typeof window !== 'undefined' ? window.localStorage.getItem('festag_selected_workspace') : null
      const initialId = nextOptions.find((option) => option.id === storedId)?.id ?? nextOptions[0]?.id ?? ''

      setOptions(nextOptions)
      setSelectedId(initialId)
    }

    loadWorkspaces()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const selectedWorkspace = useMemo(() => {
    return options.find((option) => option.id === selectedId) ?? options[0] ?? null
  }, [options, selectedId])

  const groupedOptions = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      items: options.filter((option) => option.group === group),
    }))
  }, [options])

  function selectWorkspace(option: WorkspaceOption) {
    setSelectedId(option.id)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('festag_selected_workspace', option.id)
    }
    setOpen(false)
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 11px',
          borderRadius: 11,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          color: 'var(--text)',
          textAlign: 'left',
          transition: 'border-color .16s ease, background .16s ease, box-shadow .16s ease',
          boxShadow: open ? '0 8px 24px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.045)',
            color: 'var(--text)',
            flexShrink: 0,
          }}
        >
          <Buildings size={15} weight="regular" />
        </span>
        <span style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
            Aktueller Workspace
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedWorkspace?.name ?? 'Workspace'}
          </span>
        </span>
        <CaretDown
          size={14}
          weight="bold"
          color="var(--text-muted)"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .16s ease' }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: '0 20px 48px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08)',
            padding: 6,
            zIndex: 40,
          }}
        >
          {groupedOptions.map(({ group, items }) => {
            const GroupIcon = GROUP_ICONS[group]

            return (
              <div key={group} style={{ padding: '4px 2px 2px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '7px 8px 6px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <GroupIcon size={13} weight="regular" />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{group}</span>
                </div>

                {items.length > 0 ? (
                  items.map((option) => {
                    const isActive = option.id === selectedWorkspace?.id

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectWorkspace(option)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          border: 'none',
                          background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                          borderRadius: 10,
                          padding: '10px 10px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                          color: 'inherit',
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: isActive ? 'var(--text)' : 'var(--border-strong)',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 600, color: 'var(--text)' }}>{option.name}</span>
                          <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {option.subtitle}
                          </span>
                        </span>
                        {isActive ? <Check size={15} weight="bold" color="var(--text)" /> : null}
                      </button>
                    )
                  })
                ) : (
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: 0, padding: '4px 10px 10px 28px', lineHeight: 1.4 }}>
                    Noch kein Workspace verbunden.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
