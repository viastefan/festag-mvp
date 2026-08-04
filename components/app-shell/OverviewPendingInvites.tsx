'use client'

/**
 * Pending project invitations — prominent Overview section (not buried in a bell).
 */

import { useCallback, useEffect, useState } from 'react'
import {
  WORKSPACE_CREATED_EVENT,
  WORKSPACE_SETUP_DONE_EVENT,
} from '@/lib/workspace-create-open'
import { WORKSPACE_SETUP_COPY as SETUP } from '@/lib/platform/workspace-setup'

type PendingInvite = {
  id: string
  projectId: string | null
  projectTitle: string
  workspaceId: string | null
  workspaceName: string
  invitedBy: string
  role: string
  roleLabel: string
  createdAt: string
}

export default function OverviewPendingInvites() {
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/invites/pending', { credentials: 'include' })
      const data = await res.json().catch(() => null)
      if (res.ok && Array.isArray(data?.invites)) {
        setInvites(data.invites)
      }
    } catch { /* best-effort */ }
  }, [])

  useEffect(() => {
    void load()
    function onRefresh() {
      void load()
    }
    window.addEventListener(WORKSPACE_SETUP_DONE_EVENT, onRefresh)
    window.addEventListener(WORKSPACE_CREATED_EVENT, onRefresh)
    return () => {
      window.removeEventListener(WORKSPACE_SETUP_DONE_EVENT, onRefresh)
      window.removeEventListener(WORKSPACE_CREATED_EVENT, onRefresh)
    }
  }, [load])

  async function respond(inviteId: string, action: 'accept' | 'decline') {
    setBusyId(inviteId)
    try {
      const res = await fetch('/api/invites/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inviteId, action }),
      })
      if (res.ok) {
        setInvites((prev) => prev.filter((i) => i.id !== inviteId))
      }
    } catch { /* ignore */ }
    setBusyId(null)
  }

  if (invites.length === 0) return null

  return (
    <section className="fas-pending" aria-label={SETUP.pendingSectionTitle}>
      <h2 className="fas-pending-title">{SETUP.pendingSectionTitle}</h2>
      <div className="fas-pending-list">
        {invites.map((inv) => (
          <article key={inv.id} className="fas-pending-card">
            <div className="fas-pending-meta">
              <div className="fas-pending-row">
                <span className="fas-pending-k">{SETUP.pendingProject}</span>
                <span className="fas-pending-v">{inv.projectTitle}</span>
              </div>
              <div className="fas-pending-row">
                <span className="fas-pending-k">{SETUP.pendingWorkspace}</span>
                <span className="fas-pending-v">{inv.workspaceName}</span>
              </div>
              <div className="fas-pending-row">
                <span className="fas-pending-k">{SETUP.pendingInvitedBy}</span>
                <span className="fas-pending-v">{inv.invitedBy}</span>
              </div>
              <div className="fas-pending-row">
                <span className="fas-pending-k">{SETUP.pendingRole}</span>
                <span className="fas-pending-v">{inv.roleLabel}</span>
              </div>
            </div>
            <div className="fas-pending-actions">
              <button
                type="button"
                className="fas-pending-btn fas-pending-btn--primary"
                disabled={busyId === inv.id}
                onClick={() => void respond(inv.id, 'accept')}
              >
                {SETUP.pendingAccept}
              </button>
              <button
                type="button"
                className="fas-pending-btn"
                disabled={busyId === inv.id}
                onClick={() => void respond(inv.id, 'decline')}
              >
                {SETUP.pendingDecline}
              </button>
            </div>
          </article>
        ))}
      </div>
      <style>{PENDING_CSS}</style>
    </section>
  )
}

const PENDING_CSS = `
.fas-pending {
  width: 100%;
  margin: 0 0 28px;
  animation: fasPendingIn 0.5s cubic-bezier(.22, 1, .36, 1) both;
}
@keyframes fasPendingIn {
  from { opacity: 0; transform: translate3d(0, 8px, 0); }
  to { opacity: 1; transform: none; }
}
.fas-pending-title {
  margin: 0 0 14px;
  font-size: 22px;
  font-weight: 400;
  letter-spacing: 0.006em;
  color: var(--fas-ink, #1A1917);
}
.fas-pending-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fas-pending-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 18px 16px;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}
html[data-theme="dark"] .fas-pending-card {
  background: rgba(186, 194, 210, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: none;
}
.fas-pending-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fas-pending-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  align-items: baseline;
}
.fas-pending-k {
  font-size: 13px;
  color: var(--fas-muted, #8891a0);
  letter-spacing: 0.01em;
}
.fas-pending-v {
  font-size: 15px;
  color: var(--fas-ink, #1A1917);
  letter-spacing: 0.01em;
}
.fas-pending-actions {
  display: flex;
  gap: 8px;
}
.fas-pending-btn {
  height: 40px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid rgba(30, 30, 32, 0.08);
  background: #fff;
  color: #1e1e20;
  font-family: inherit;
  font-size: 14px;
  letter-spacing: 0.01em;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.fas-pending-btn:disabled {
  opacity: 0.55;
  cursor: default;
}
html[data-theme="dark"] .fas-pending-btn {
  background: rgba(186, 194, 210, 0.08);
  color: rgba(245, 245, 247, 0.88);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
html[data-theme="dark"] .fas-pending-btn--primary {
  background: #EBE8E3;
  color: #1A1917;
  border-color: transparent;
  box-shadow: none;
}
@media (max-width: 560px) {
  .fas-pending-row {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
`
