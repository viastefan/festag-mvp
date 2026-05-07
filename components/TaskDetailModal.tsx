'use client'

import { useEffect, useState } from 'react'
import Modal, { ModalButton } from '@/components/Modal'
import TagroLogo from '@/components/TagroLogo'

interface Task {
  id: string
  title: string
  status: string
  priority?: string
}

interface Props {
  task: Task | null
  projectTitle: string
  onClose: () => void
}

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Kritisch',
  high: 'Hoch',
  medium: 'Mittel',
  low: 'Niedrig',
}
const PRIORITY_COLOR: Record<string, string> = {
  critical: '#D14343',
  high: '#f97316',
  medium: '#d97706',
  low: 'var(--text-muted)',
}

export default function TaskDetailModal({ task, projectTitle, onClose }: Props) {
  const [explanation, setExplanation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!task) { setExplanation(null); return }
    setLoading(true)
    setExplanation(null)

    fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: `Du bist Tagro, der AI-Assistent von Festag. Erkläre Tasks auf Deutsch klar und verständlich für einen Client (Auftraggeber), nicht für einen Entwickler. Halte die Erklärung kurz (3–5 Sätze max). Keine technischen Fachbegriffe ohne Erklärung. Beantworte: Was wird hier gemacht, warum ist das wichtig für das Projekt, und was ist das Ergebnis?`,
        messages: [{
          role: 'user',
          content: `Erkläre mir diese Aufgabe aus meinem Projekt "${projectTitle}" auf Deutsch, verständlich als Laie:\n\nAufgabe: "${task.title}"\nStatus: ${task.status}\nPriorität: ${task.priority ?? 'nicht gesetzt'}`,
        }],
      }),
    })
      .then(r => r.json())
      .then(d => setExplanation(d.content?.[0]?.text ?? 'Keine Erklärung verfügbar.'))
      .catch(() => setExplanation('Verbindungsfehler. Bitte später erneut versuchen.'))
      .finally(() => setLoading(false))
  }, [task?.id])

  const priColor = task?.priority ? PRIORITY_COLOR[task.priority] : 'var(--text-muted)'

  return (
    <Modal
      open={!!task}
      onClose={onClose}
      size="sm"
      bare
      footer={<ModalButton variant="ghost" onClick={onClose}>Schließen</ModalButton>}
    >
      {task && (
        <>
          {/* Task header */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:16 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'transparent', border:'2px solid var(--border-strong)', boxSizing:'border-box', flexShrink:0, marginTop:5 }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <h2 style={{ margin:0, fontSize:15, fontWeight:600, letterSpacing:'-.2px', color:'var(--text)', lineHeight:1.4 }}>
                {task.title}
              </h2>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5 }}>
                {task.priority && (
                  <span style={{ fontSize:10.5, fontWeight:700, color:priColor, letterSpacing:'.04em' }}>
                    {PRIORITY_LABEL[task.priority] ?? task.priority.toUpperCase()}
                  </span>
                )}
                <span style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:500, background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:4, padding:'1px 6px' }}>
                  {task.status === 'todo' ? 'Offen' : task.status === 'doing' ? 'In Arbeit' : 'Erledigt'}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height:1, background:'var(--border)', margin:'0 0 14px' }} />

          {/* Tagro explanation */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
            <div style={{ flexShrink:0, marginTop:1 }}>
              <TagroLogo size={22} thinking={loading} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:11.5, fontWeight:700, color:'var(--text-muted)', margin:'0 0 6px', letterSpacing:'.04em', textTransform:'uppercase' }}>
                Tagro erklärt
              </p>
              {loading ? (
                <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--text-muted)', fontSize:13 }}>
                  <span style={{ display:'flex', gap:3 }}>
                    {[0,1,2].map(j => (
                      <span key={j} style={{ width:5, height:5, borderRadius:'50%', background:'var(--text-muted)', animation:`pulse 1.1s ${j*.18}s ease-in-out infinite`, display:'inline-block' }}/>
                    ))}
                  </span>
                  <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}`}</style>
                </div>
              ) : (
                <p style={{ fontSize:13.5, color:'var(--text-secondary)', lineHeight:1.65, margin:0, whiteSpace:'pre-wrap' }}>
                  {explanation}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
