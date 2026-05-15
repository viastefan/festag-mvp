'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, Plus, X } from '@phosphor-icons/react'
import Modal, { ModalButton } from '@/components/Modal'

type TeamScenarioId = 'strategic_core' | 'execution_squad' | 'agency_ecosystem' | 'corporate_integration'
type InviteMethod = 'email' | 'pin'
type AccessScope = 'workspace' | 'projects' | 'docs_status' | 'technical_tasks' | 'read_only'

type ScenarioConfig = {
  id: TeamScenarioId
  title: string
  subtitle: string
  purpose: string
  visibility: string[]
  cta: string
  helper: string
  roles: string[]
}

type InviteDraft = {
  email: string
  role: string
  access: AccessScope
  project: string
  activeWork: boolean
  inviteMethod: InviteMethod
}

type TeamMember = InviteDraft & {
  id: string
  seatRequired: boolean
}

const SCENARIOS: ScenarioConfig[] = [
  {
    id: 'strategic_core',
    title: 'Strategic Core',
    subtitle: 'Founder & Co-Founder',
    purpose: 'Strategie, Budget, Roadmap, AI-Kontext und Progress Reports gemeinsam steuern.',
    visibility: [
      'Voller Zugriff auf AI-Kontext',
      'Roadmap und Projektbriefings',
      'Projektentscheidungen und Notizen',
      'Aufgaben übergreifend steuern',
    ],
    cta: 'Strategic Core erstellen',
    helper: 'Lade Co-Founder oder Partner ein, die Strategie, Roadmap und AI-Kontext mitsteuern sollen.',
    roles: ['Founder', 'Co-Founder', 'Lead Dev', 'Viewer'],
  },
  {
    id: 'execution_squad',
    title: 'Execution Squad',
    subtitle: 'Developer & Partner-Dev',
    purpose: 'Technische Umsetzung, Tasks, Sprint Board, Deployments und Dokumentation.',
    visibility: [
      'Technische Tasks und Doku',
      'Deployments und Blocker',
      'Keine privaten Founder-Chats',
      'Keine Budgetstrategie ohne Freigabe',
    ],
    cta: 'Execution Squad erstellen',
    helper: 'Erstelle einen technischen Arbeitsbereich für Developer, Tasks, Sprint Board und Deployments.',
    roles: ['Developer', 'Lead Developer', 'Technical Partner', 'Viewer'],
  },
  {
    id: 'agency_ecosystem',
    title: 'Agency Ecosystem',
    subtitle: 'Multi-Client Management',
    purpose: 'Viele Kundenprojekte getrennt verwalten, Developer zuweisen und Client-Workspaces isolieren.',
    visibility: [
      'Agentur Admin sieht eigene Kunden',
      'Kunde A sieht niemals Kunde B',
      'Developer sehen nur zugewiesene Projekte',
      'AI-Kontext pro Kunde getrennt',
    ],
    cta: 'Agency Ecosystem erstellen',
    helper: 'Richte einen Agentur-Arbeitsbereich ein, um Kunden, Projekte und Developer getrennt zu verwalten.',
    roles: ['Agency Admin', 'Agency Developer', 'Client Member', 'Viewer'],
  },
  {
    id: 'corporate_integration',
    title: 'Corporate Integration',
    subtitle: 'Inhouse / Outbound Teams',
    purpose: 'Eigene Mitarbeiter oder externe Developer strukturiert in Projekte einbinden.',
    visibility: [
      'Nur zugewiesene Projekte',
      'Technische Aufgaben und Dokumente',
      'Projektstatus je Zugriff',
      'Keine anderen Unternehmensprojekte',
    ],
    cta: 'Corporate Integration erstellen',
    helper: 'Binde interne Mitarbeiter oder externe Auftragnehmer kontrolliert in Projekte ein.',
    roles: ['Enterprise Member', 'Inhouse Developer', 'External Contractor', 'Viewer'],
  },
]

const STEPS = ['Szenario', 'Setup', 'Einladen', 'Projekte', 'Seats', 'Review'] as const

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
}

export default function TeamsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [scenarioId, setScenarioId] = useState<TeamScenarioId | null>(null)

  const [teamName, setTeamName] = useState('')
  const [description, setDescription] = useState('')
  const [teamIcon, setTeamIcon] = useState('')
  const [workspaceRef, setWorkspaceRef] = useState('')
  const [visibilityPreset, setVisibilityPreset] = useState<'standard' | 'restricted' | 'open'>('standard')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [inviteAccess, setInviteAccess] = useState<AccessScope>('projects')
  const [inviteProject, setInviteProject] = useState('')
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>('email')
  const [activeWork, setActiveWork] = useState(true)
  const [members, setMembers] = useState<TeamMember[]>([])

  const [projectSelection, setProjectSelection] = useState<'existing' | 'new' | 'later'>('later')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [newTeamProjectName, setNewTeamProjectName] = useState('')

  const [projects, setProjects] = useState<{ id: string; title: string }[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const scenario = useMemo(() => SCENARIOS.find(s => s.id === scenarioId) ?? null, [scenarioId])

  const seatSummary = useMemo(() => {
    const required = members.filter(m => m.seatRequired).length
    const viewers = members.filter(m => !m.seatRequired).length
    return { required, viewers }
  }, [members])

  useEffect(() => {
    if (!open) return
    setError(null)
    setSuccess(null)
    setStep(0)
    setScenarioId(null)
    setTeamName('')
    setDescription('')
    setTeamIcon('')
    setWorkspaceRef('')
    setVisibilityPreset('standard')
    setInviteEmail('')
    setInviteRole('')
    setInviteAccess('projects')
    setInviteProject('')
    setInviteMethod('email')
    setActiveWork(true)
    setMembers([])
    setProjectSelection('later')
    setSelectedProjectId('')
    setNewTeamProjectName('')

    let cancelled = false
    ;(async () => {
      try {
        const sb = createClient()
        const { data } = await (sb as any)
          .from('projects')
          .select('id,title')
          .order('created_at', { ascending: false })
          .limit(20)
        if (!cancelled) setProjects((data as any[]) ?? [])
      } catch {
        if (!cancelled) setProjects([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!scenario) return
    if (!inviteRole) setInviteRole(scenario.roles[0])
  }, [scenario, inviteRole])

  useEffect(() => {
    if (scenario && !teamName) setTeamName(scenario.title)
  }, [scenario, teamName])

  function nextStep() {
    if (step === 0 && !scenarioId) {
      setError('Bitte zuerst ein Team-Szenario auswählen.')
      return
    }
    if (step === 1 && !teamName.trim()) {
      setError('Bitte gib einen Teamnamen ein.')
      return
    }
    setError(null)
    setStep(prev => Math.min(prev + 1, STEPS.length - 1))
  }

  function prevStep() {
    setError(null)
    setStep(prev => Math.max(prev - 1, 0))
  }

  function addMemberDraft() {
    if (!inviteEmail.includes('@')) {
      setError('Bitte gib eine gültige E-Mail ein.')
      return
    }
    if (!inviteRole) {
      setError('Bitte wähle eine Rolle.')
      return
    }
    setError(null)
    const newMember: TeamMember = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      access: inviteAccess,
      project: inviteProject,
      activeWork,
      inviteMethod,
      seatRequired: activeWork,
    }
    setMembers(prev => [newMember, ...prev])
    setInviteEmail('')
    setInviteProject('')
    setActiveWork(true)
    setInviteMethod('email')
  }

  function removeMember(id: string) {
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  async function createTeam() {
    if (!scenario) return
    setCreating(true)
    setError(null)
    setSuccess(null)

    try {
      const sb = createClient()
      const { data: authData } = await sb.auth.getUser()
      const user = authData.user
      if (!user) {
        setError('Bitte neu einloggen und erneut versuchen.')
        setCreating(false)
        return
      }

      const teamSetupDraft = {
        createdBy: user.id,
        name: teamName.trim(),
        slug: slugify(teamName),
        description: description.trim() || null,
        icon: teamIcon.trim() || null,
        workspaceRef: workspaceRef.trim() || null,
        scenario: scenario.id,
        visibilityPreset,
        projectSelection,
        selectedProjectId: selectedProjectId || null,
        newTeamProjectName: newTeamProjectName || null,
        members,
        seatRequired: seatSummary.required,
      }
      try {
        window.localStorage.setItem('festag-team-setup-draft', JSON.stringify(teamSetupDraft))
      } catch {}

      for (const member of members) {
        if (member.inviteMethod !== 'email') continue
        await fetch('/api/invites/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: member.email,
            role: member.role,
            fromUserId: user.id,
            fromUserEmail: user.email ?? null,
            accessMode: 'team',
          }),
        }).catch(() => null)
      }

      setSuccess('Team erstellt. Du wirst zur Teams-Übersicht weitergeleitet…')
      setTimeout(() => {
        onClose()
        router.push('/teams?tab=overview')
      }, 800)
    } catch (e: any) {
      setError(e?.message ?? 'Team konnte nicht erstellt werden.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Team einrichten"
      subtitle="Wähle, wie Zusammenarbeit in diesem Workspace funktionieren soll."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 20 }}>
        <aside style={{ borderRight: '1px solid var(--border)', paddingRight: 14 }}>
          {STEPS.map((label, idx) => {
            const active = idx === step
            const done = idx < step
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
                <span style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: `1px solid ${active || done ? 'var(--text)' : 'var(--border)'}`,
                  background: done ? 'var(--text)' : 'transparent',
                  color: done ? 'var(--bg)' : 'var(--text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {done ? <Check size={11} weight="bold" /> : idx + 1}
                </span>
                <span style={{ fontSize: 12.5, color: active ? 'var(--text)' : 'var(--text-muted)', fontWeight: active ? 600 : 500 }}>{label}</span>
              </div>
            )
          })}
        </aside>

        <section>
          {step === 0 && (
            <div style={{ display: 'grid', gap: 10 }}>
              {SCENARIOS.map(s => {
                const selected = scenarioId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScenarioId(s.id)}
                    style={{
                      textAlign: 'left',
                      border: `1px solid ${selected ? 'var(--text)' : 'var(--border)'}`,
                      background: selected ? 'var(--surface-2)' : 'var(--surface)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: 5,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <strong style={{ fontSize: 14 }}>{s.title}</strong>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{selected ? s.cta : s.subtitle}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{s.purpose}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {s.visibility.slice(0, 3).map(v => (
                        <span key={v} style={{ fontSize: 11, color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 8px' }}>{v}</span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {step === 1 && scenario && (
            <div style={{ display: 'grid', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>{scenario.helper}</p>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Team name</span>
                <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="z. B. Product Core" style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Beschreibung (optional)</span>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Kurzer Kontext für das Team" style={{ ...inputStyle, resize: 'vertical', minHeight: 78 }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Icon (optional)</span>
                  <input value={teamIcon} onChange={e => setTeamIcon(e.target.value)} placeholder="z. B. 🧠" style={inputStyle} />
                </label>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Workspace / Projektbezug (optional)</span>
                  <input value={workspaceRef} onChange={e => setWorkspaceRef(e.target.value)} placeholder="z. B. Stefan Workspace" style={inputStyle} />
                </label>
              </div>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Standard-Sichtbarkeit</span>
                <select value={visibilityPreset} onChange={e => setVisibilityPreset(e.target.value as any)} style={inputStyle}>
                  <option value="standard">Standard</option>
                  <option value="restricted">Restricted</option>
                  <option value="open">Open</option>
                </select>
              </label>
            </div>
          )}

          {step === 2 && scenario && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr 1fr', gap: 8 }}>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="name@firma.com" style={inputStyle} />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={inputStyle}>
                  {scenario.roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={inviteAccess} onChange={e => setInviteAccess(e.target.value as AccessScope)} style={inputStyle}>
                  <option value="workspace">gesamter Workspace</option>
                  <option value="projects">bestimmte Projekte</option>
                  <option value="docs_status">nur Dokumente/Status</option>
                  <option value="technical_tasks">nur technische Tasks</option>
                  <option value="read_only">nur Read-only</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                <input value={inviteProject} onChange={e => setInviteProject(e.target.value)} placeholder="Projektzuweisung (optional)" style={inputStyle} />
                <select value={inviteMethod} onChange={e => setInviteMethod(e.target.value as InviteMethod)} style={inputStyle}>
                  <option value="email">Email Invite</option>
                  <option value="pin">PIN Invite</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={activeWork} onChange={e => setActiveWork(e.target.checked)} />
                  aktive Mitarbeit
                </label>
                <ModalButton variant="secondary" onClick={addMemberDraft}>
                  <Plus size={12} /> Hinzufügen
                </ModalButton>
              </div>

              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                Eingeladene Personen sehen nur den für sie freigegebenen Kontext.
              </p>

              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {members.length === 0 ? (
                  <p style={{ margin: 0, padding: '12px 14px', fontSize: 12.5, color: 'var(--text-muted)' }}>Noch keine Mitglieder hinzugefügt.</p>
                ) : members.map((m, idx) => (
                  <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr .9fr .9fr .8fr auto', gap: 8, alignItems: 'center', padding: '9px 12px', borderTop: idx === 0 ? 'none' : '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{m.email}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.role}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.access.replace('_', ' ')}</span>
                    <span style={{ fontSize: 12, color: m.seatRequired ? 'var(--text)' : 'var(--text-muted)' }}>{m.seatRequired ? 'Seat nötig' : 'Viewer'}</span>
                    <button type="button" onClick={() => removeMember(m.id)} style={iconBtnStyle}><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'grid', gap: 11 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="radio" checked={projectSelection === 'existing'} onChange={() => setProjectSelection('existing')} />
                Bestehendes Projekt zuweisen
              </label>
              {projectSelection === 'existing' && (
                <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} style={inputStyle}>
                  <option value="">Projekt wählen…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="radio" checked={projectSelection === 'new'} onChange={() => setProjectSelection('new')} />
                Neues Team-Projekt erstellen
              </label>
              {projectSelection === 'new' && (
                <input value={newTeamProjectName} onChange={e => setNewTeamProjectName(e.target.value)} placeholder="Name des neuen Team-Projekts" style={inputStyle} />
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="radio" checked={projectSelection === 'later'} onChange={() => setProjectSelection('later')} />
                Später zuweisen
              </label>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'grid', gap: 11 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Für aktive Mitarbeit wird ein zusätzlicher Sitz benötigt. Du kannst den Sitz jetzt hinzufügen oder die Person zunächst als Viewer einladen.
              </p>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Seat erforderlich</span>
                  <strong>{seatSummary.required}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Als Viewer möglich</span>
                  <strong>{seatSummary.viewers}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setMembers(prev => prev.map(m => ({ ...m, seatRequired: false, activeWork: false })))} style={secondaryBtnStyle}>Als Viewer einladen</button>
                <button type="button" onClick={() => setMembers(prev => prev.map(m => ({ ...m, seatRequired: m.activeWork })))} style={secondaryBtnStyle}>Seat hinzufügen</button>
                <button type="button" style={ghostBtnStyle}>Später entscheiden</button>
              </div>
            </div>
          )}

          {step === 5 && scenario && (
            <div style={{ display: 'grid', gap: 10 }}>
              <SummaryRow label="Team-Szenario" value={scenario.title} />
              <SummaryRow label="Teamname" value={teamName || '—'} />
              <SummaryRow label="Mitglieder" value={`${members.length}`} />
              <SummaryRow label="Rollen" value={members.map(m => m.role).slice(0, 4).join(', ') || '—'} />
              <SummaryRow label="Projekt" value={projectSelection === 'existing' ? (projects.find(p => p.id === selectedProjectId)?.title || 'Nicht gewählt') : projectSelection === 'new' ? (newTeamProjectName || 'Neues Team-Projekt') : 'Später'} />
              <SummaryRow label="Seat Status" value={`${seatSummary.required} aktiv · ${seatSummary.viewers} viewer`} />
            </div>
          )}

          {error && <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--red)' }}>{error}</p>}
          {success && <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--green)' }}>{success}</p>}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <div>
              {step > 0 ? (
                <ModalButton variant="ghost" onClick={prevStep}>Zurück</ModalButton>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {step < STEPS.length - 1 ? (
                <ModalButton variant="primary" onClick={nextStep}>Weiter</ModalButton>
              ) : (
                <ModalButton variant="primary" onClick={createTeam} loading={creating}>Team erstellen</ModalButton>
              )}
            </div>
          </div>
        </section>
      </div>
    </Modal>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 10, fontSize: 12.5, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: 12.5,
  fontFamily: 'inherit',
}

const secondaryBtnStyle: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  borderRadius: 8,
  padding: '7px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const ghostBtnStyle: CSSProperties = {
  border: '1px solid transparent',
  background: 'transparent',
  color: 'var(--text-secondary)',
  borderRadius: 8,
  padding: '7px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const iconBtnStyle: CSSProperties = {
  width: 22,
  height: 22,
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--text-muted)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}
