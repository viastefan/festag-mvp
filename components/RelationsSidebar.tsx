'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { autoAvatarColor, avatarInitials } from '@/lib/avatar'
import {
  broadcastProfileSync,
  getRememberedProfileAvatarColor,
  rememberProfileAvatarColor,
  subscribeProfileSync,
} from '@/lib/profile-sync'
import {
  House, Briefcase, FileText, ChatCircle,
  Notebook, Brain, List, X,
} from '@phosphor-icons/react'

import SidebarProfileFooter from '@/components/SidebarProfileFooter'
import SupportButton from '@/components/SupportButton'
import TeamsModal from '@/components/TeamsModal'
import ViewSwitch from '@/components/ViewSwitch'

type NavItem = {
  href: string
  label: string
  Icon: React.ComponentType<any>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/relations', label: 'Übersicht', Icon: House },
  { href: '/relations/projects', label: 'Projekte', Icon: Briefcase },
  { href: '/relations/messages', label: 'Nachrichten', Icon: ChatCircle },
  { href: '/relations/documents', label: 'Dokumente', Icon: FileText },
  { href: '/relations/notes', label: 'Notizen', Icon: Notebook },
  { href: '/relations/ai', label: 'Tagro AI', Icon: Brain },
]

function missingProfileColumn(error: unknown) {
  const message = String((error as any)?.message ?? '')
  const raw = (
    message.match(/'([^']+)' column/)?.[1] ||
    message.match(/column "?([a-zA-Z0-9_.]+)"? does not exist/)?.[1] ||
    null
  )
  return raw?.split('.').pop() ?? null
}

export default function RelationsSidebar() {
  const pathname = usePathname()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [fullName, setFullName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [avatarColor, setAvatarColor] = useState<string | null>(null)
  const [plan, setPlan] = useState('free')
  const [mobOpen, setMobOpen] = useState(false)
  const [teamsOpen, setTeamsOpen] = useState(false)

  useEffect(() => {
    const handler = () => setTeamsOpen(true)
    window.addEventListener('open-teams-modal', handler)
    return () => window.removeEventListener('open-teams-modal', handler)
  }, [])

  useEffect(() => {
    setMobOpen(false)
    createClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) return

      setEmail(data.user.email ?? '')
      const rememberedColor = getRememberedProfileAvatarColor(data.user.id)

      let result = await createClient()
        .from('profiles')
        .select('first_name,full_name,avatar_url,avatar_color,plan')
        .eq('id', data.user.id)
        .single()
      if (result.error && missingProfileColumn(result.error)) {
        result = await createClient()
          .from('profiles')
          .select('first_name,full_name,avatar_url,plan')
          .eq('id', data.user.id)
          .single()
      }

      const profile = result.data

      if (!profile) return

      setFirstName((profile as any).first_name ?? '')
      setFullName((profile as any).full_name ?? '')
      setAvatar((profile as any).avatar_url ?? null)
      setAvatarColor((profile as any).avatar_color ?? rememberedColor ?? null)
      setPlan((profile as any).plan ?? 'free')
    })
  }, [pathname])

  useEffect(() => {
    return subscribeProfileSync((payload) => {
      if (payload.email !== undefined) setEmail(payload.email ?? '')
      if (payload.firstName !== undefined) setFirstName(payload.firstName ?? '')
      if (payload.fullName !== undefined) setFullName(payload.fullName ?? '')
      if (payload.avatarUrl !== undefined) setAvatar(payload.avatarUrl ?? null)
      if (payload.avatarColor !== undefined) setAvatarColor(payload.avatarColor ?? null)
      if (payload.plan !== undefined && payload.plan !== null) setPlan(payload.plan)
    })
  }, [])

  const logout = async () => {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  const isOn = (href: string) =>
    href === '/relations' ? pathname === '/relations' : pathname.startsWith(href)

  const displayName = firstName || fullName.split(' ')[0] || email.split('@')[0] || 'Konto'
  const initials = avatarInitials(firstName, fullName, email)
  const resolvedAvatarColor = avatarColor || autoAvatarColor(email || displayName)

  async function changeAvatarColor(color: string) {
    setAvatarColor(color)
    broadcastProfileSync({ avatarColor: color })

    const { data } = await createClient().auth.getUser()
    if (!data.user) return

    rememberProfileAvatarColor(data.user.id, color)
    try {
      await (createClient() as any).from('profiles').update({ avatar_color: color }).eq('id', data.user.id)
    } catch {}
  }

  return (
    <>
      <TeamsModal open={teamsOpen} onClose={() => setTeamsOpen(false)} />

      <aside className="sidebar" style={{ pointerEvents: 'none' }}>
        <div
          className="sidebar-inner"
          style={{ pointerEvents: 'all', padding: '14px 8px 14px', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', marginBottom: 10, gap: 8 }}>
            <Link href="/relations" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <img src="/brand/logo.svg" alt="festag" style={{ height: 17, display: 'block', filter: 'var(--logo-filter,none)' }} />
            </Link>
            <SupportButton />
          </div>

          <div style={{ padding: '0 2px', marginBottom: 10 }}>
            <ViewSwitch />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none' }}>
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const active = isOn(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobOpen(false)}
                  className={`rni ${active ? 'rni-on' : 'rni-off'}`}
                >
                  <Icon size={14} weight={active ? 'bold' : 'regular'} color={active ? 'var(--text)' : 'var(--text-muted)'} />
                  <span style={{ flex: 1 }}>{label}</span>
                </Link>
              )
            })}
          </div>

          <SidebarProfileFooter
            avatarColor={resolvedAvatarColor}
            avatarUrl={avatar}
            displayName={displayName}
            email={email}
            initials={initials}
            isClient
            onAvatarColorChange={changeAvatarColor}
            onLogout={logout}
            plan={plan}
          />
        </div>
      </aside>

      <div
        className="show-mobile"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(36px) saturate(200%)',
          WebkitBackdropFilter: 'blur(36px) saturate(200%)',
          borderBottom: '1px solid var(--sidebar-border)',
        }}
      >
        <button
          onClick={() => setMobOpen((open) => !open)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text)',
            fontFamily: 'inherit',
          }}
        >
          {mobOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
        </button>

        <Link href="/relations" style={{ textDecoration: 'none' }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height: 16, display: 'block', filter: 'var(--logo-filter,none)' }} />
        </Link>
      </div>

      {mobOpen && (
        <>
          <div
            onClick={() => setMobOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 280,
              maxWidth: '85vw',
              zIndex: 251,
              background: 'var(--sidebar-bg)',
              borderRight: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideInLeft .2s cubic-bezier(.16,1,.3,1) both',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '14px 8px 14px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', marginBottom: 10, gap: 8 }}>
                <Link href="/relations" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                  <img src="/brand/logo.svg" alt="festag" style={{ height: 17, display: 'block', filter: 'var(--logo-filter,none)' }} />
                </Link>
                <SupportButton />
              </div>

              <div style={{ padding: '0 2px', marginBottom: 10 }}>
                <ViewSwitch />
              </div>

              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none' }}>
                {NAV_ITEMS.map(({ href, label, Icon }) => {
                  const active = isOn(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobOpen(false)}
                      className={`rni ${active ? 'rni-on' : 'rni-off'}`}
                    >
                      <Icon size={14} weight={active ? 'bold' : 'regular'} color={active ? 'var(--text)' : 'var(--text-muted)'} />
                      <span style={{ flex: 1 }}>{label}</span>
                    </Link>
                  )
                })}
              </div>

              <SidebarProfileFooter
                avatarColor={resolvedAvatarColor}
                avatarUrl={avatar}
                displayName={displayName}
                email={email}
                initials={initials}
                isClient
                onAvatarColorChange={changeAvatarColor}
                onLogout={logout}
                plan={plan}
              />
            </div>
          </div>
        </>
      )}

      <style>{`
        .rni {
          display:flex; align-items:center; gap:7px;
          padding:5px 9px; border-radius:7px;
          font-size:13px; font-weight:500;
          letter-spacing:.017em;
          cursor:pointer; text-decoration:none; color:inherit;
          transition:background .12s, color .12s;
          white-space:nowrap; overflow:hidden;
          margin:0 2px;
        }
        .rni-on  { background:rgba(0,0,0,0.055); font-weight:600; color:var(--text); }
        [data-theme="dark"] .rni-on { background:rgba(255,255,255,0.09); color:var(--nav-on-text); }
        .rni-off { color:var(--text-secondary); }
        .rni-off:hover { background:rgba(0,0,0,0.035); color:var(--text); }
        [data-theme="dark"] .rni-off:hover { background:rgba(255,255,255,0.05); }
        @keyframes slideInLeft { from{opacity:0;transform:translateX(-24px);}to{opacity:1;transform:translateX(0);} }
        @media (min-width:769px) { .show-mobile{display:none!important;} }
      `}</style>
    </>
  )
}
