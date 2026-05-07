'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CaretDown, Check, Handshake, House, StackSimple, UsersThree } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  getWorkspaceSurfaceConfig,
  WORKSPACE_SURFACES,
} from '@/lib/workspace-system'

const SURFACE_ICONS = {
  festwerk: House,
  relations: Handshake,
  teams: UsersThree,
} as const

export default function ViewSwitch() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const activeSurface = useMemo(() => getWorkspaceSurfaceConfig(pathname), [pathname])
  const ActiveIcon = SURFACE_ICONS[activeSurface.id]

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

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
          padding: '10px 12px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          color: 'var(--text)',
          textAlign: 'left',
          boxShadow: open ? '0 8px 26px rgba(0,0,0,0.08)' : '0 1px 0 rgba(255,255,255,0.03)',
          transition: 'border-color .16s ease, box-shadow .16s ease, background .16s ease',
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.05)',
            color: 'var(--text)',
            flexShrink: 0,
          }}
        >
          <ActiveIcon size={17} weight="regular" />
        </span>
        <span style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
            Workspace
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
            {activeSurface.shortLabel}
          </span>
          <span
            style={{
              fontSize: 11.5,
              color: 'var(--text-secondary)',
              lineHeight: 1.25,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {activeSurface.description}
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px 10px',
              color: 'var(--text-secondary)',
              borderBottom: '1px solid var(--border)',
              marginBottom: 4,
            }}
          >
            <StackSimple size={14} weight="regular" />
            <span style={{ fontSize: 11.5, fontWeight: 600 }}>Festag OS Bereiche</span>
          </div>

          {WORKSPACE_SURFACES.map((surface) => {
            const Icon = SURFACE_ICONS[surface.id]
            const isActive = surface.id === activeSurface.id

            return (
              <Link
                key={surface.id}
                href={surface.href}
                prefetch
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: '10px 10px',
                  borderRadius: 10,
                  background: isActive ? 'rgba(0,0,0,0.055)' : 'transparent',
                  transition: 'background .14s ease',
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
                    background: isActive ? 'var(--sidebar-bg)' : 'rgba(0,0,0,0.04)',
                    color: 'var(--text)',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} weight={isActive ? 'bold' : 'regular'} />
                </span>
                <span style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 600, color: 'var(--text)' }}>{surface.label}</span>
                  <span
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {surface.description}
                  </span>
                </span>
                {isActive ? <Check size={15} weight="bold" color="var(--text)" /> : null}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
