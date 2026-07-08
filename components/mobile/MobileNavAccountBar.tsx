'use client'

import { useEffect, useRef, useState } from 'react'
import NotificationsBell from '@/components/NotificationsBell'
import PortalWorkspacePopover from '@/components/PortalWorkspacePopover'
import { createClient } from '@/lib/supabase/client'

const WORKSPACE_MODE_LABELS: Record<string, string> = {
  delivery: 'Festag Delivery',
  team: 'Teams',
  agency: 'Agency',
}

function workspaceModeLabel(mode: string) {
  return WORKSPACE_MODE_LABELS[mode] || 'Festag Delivery'
}

type TeamMember = {
  id: string
  name: string
}

type Props = {
  /** Reload profile/workspace when the nav sheet opens. */
  active?: boolean
}

export default function MobileNavAccountBar({ active = true }: Props) {
  const wsTriggerRef = useRef<HTMLButtonElement>(null)
  const [wsMenuOpen, setWsMenuOpen] = useState(false)
  const [displayName, setDisplayName] = useState('Festag')
  const [email, setEmail] = useState('')
  const [workspaceMode, setWorkspaceMode] = useState('delivery')
  const [members, setMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    if (!active) return
    let alive = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const u = sessionData.session?.user
        if (!u || !alive) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, first_name, email')
          .eq('id', u.id)
          .maybeSingle()

        if (!alive) return
        const p = profile as {
          full_name?: string | null
          first_name?: string | null
          email?: string | null
        } | null
        const userEmail = p?.email || u.email || ''
        const name = (p?.full_name || '').trim() || (p?.first_name || '').trim() || userEmail.split('@')[0] || 'Festag'
        setDisplayName(name)
        setEmail(userEmail)

        const { data: ws } = await supabase
          .from('workspaces')
          .select('id, mode')
          .eq('primary_owner_id', u.id)
          .eq('is_personal', true)
          .maybeSingle()
        if (!alive) return

        const mode = (ws as { mode?: string } | null)?.mode
        if (mode === 'team' || mode === 'agency' || mode === 'delivery') setWorkspaceMode(mode)

        const wsId = (ws as { id?: string } | null)?.id
        if (wsId) {
          try {
            const { data: mem } = await supabase
              .from('workspace_members')
              .select('user_id, role')
              .eq('workspace_id', wsId)
            const memRows = (mem as { user_id: string }[] | null) ?? []
            const ids = Array.from(new Set([u.id, ...memRows.map(r => r.user_id)].filter(Boolean)))
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, full_name, first_name, email')
              .in('id', ids)
            const pById = new Map(
              ((profs ?? []) as Array<{
                id: string
                full_name?: string | null
                first_name?: string | null
                email?: string | null
              }>).map(row => [row.id, row]),
            )
            const toMember = (uid: string): TeamMember => {
              const pr = pById.get(uid)
              const nm = (pr?.full_name || '').trim() || (pr?.first_name || '').trim() || (pr?.email || '').split('@')[0] || 'Mitglied'
              return { id: uid, name: nm }
            }
            const ordered = [u.id, ...memRows.map(r => r.user_id).filter(x => x !== u.id)]
            setMembers(Array.from(new Set(ordered)).map(toMember))
          } catch { /* noop */ }
        }
      } catch { /* noop */ }
    })()
    return () => { alive = false }
  }, [active])

  async function logout() {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  const workspaceLabel = workspaceModeLabel(workspaceMode)

  return (
    <div className="mns-account">
      <PortalWorkspacePopover
        open={wsMenuOpen}
        onOpenChange={setWsMenuOpen}
        anchorRef={wsTriggerRef}
        displayName={displayName}
        email={email}
        members={members}
        onLogout={logout}
        trigger={(
          <button
            ref={wsTriggerRef}
            type="button"
            className={`mns-account-card${wsMenuOpen ? ' is-open' : ''}`}
            aria-label="Workspace und Profil"
            aria-haspopup="menu"
            aria-expanded={wsMenuOpen}
            onClick={() => setWsMenuOpen(v => !v)}
          >
            <span className="mns-account-copy">
              <span className="mns-account-value">{workspaceLabel}</span>
              <span className="mns-account-user">{displayName}</span>
            </span>
          </button>
        )}
      />

      <div className="mns-bell-slot">
        <NotificationsBell variant="portal" limit={14} />
      </div>
    </div>
  )
}
