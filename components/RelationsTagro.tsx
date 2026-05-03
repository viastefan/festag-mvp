'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PaperPlaneTilt, Robot, User, Lightning,
  FileText, ChatCircle, ListChecks, Handshake,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

type Msg = { role: 'user' | 'ai'; text: string; time: string }

type ProjectContext = {
  id: string
  title: string
  description: string | null
  status: string
} | null

const QUICK_ACTIONS = [
  { label: 'Erstelle ein Angebot für dieses Projekt', icon: FileText },
  { label: 'Fasse den Chatverlauf zusammen', icon: ChatCircle },
  { label: 'Schlage nächste Schritte vor', icon: ListChecks },
  { label: 'Hilf mir bei der Kundenkommunikation', icon: Handshake },
]

const AI_RESPONSES: Record<string, string> = {
  'Erstelle ein Angebot für dieses Projekt': `Hier ist ein Vorschlag für die Angebotsstruktur:

**Positionen:**
1. **Konzeption & Planung** — Anforderungsanalyse, Wireframing, Projektplanung
2. **Design** — UI/UX Design, Prototyping, Design-System
3. **Entwicklung** — Frontend, Backend, Integrationen
4. **Testing & QA** — Qualitätssicherung, Bugfixing, Performance
5. **Launch & Support** — Deployment, Dokumentation, Support (1 Monat)

Gehe zum **Angebote-Tab** in deinem Projekt, um das Angebot direkt zu erstellen. Ich empfehle eine Gültigkeit von 30 Tagen.`,

  'Fasse den Chatverlauf zusammen': `Ich habe keinen direkten Zugriff auf den Chatverlauf, aber hier ist, wie du vorgehen kannst:

1. Öffne den **Chat-Tab** in deinem Projekt
2. Scrolle durch die wichtigsten Nachrichten
3. Notiere dir die Kernpunkte und offenen Fragen

**Tipp:** Halte regelmäßig Zwischenstände fest, damit nichts verloren geht. Du kannst auch im Chat eine Zusammenfassung posten, damit alle Beteiligten auf dem gleichen Stand sind.`,

  'Schlage nächste Schritte vor': `Basierend auf einem typischen Projektverlauf empfehle ich:

1. **Statuscheck** — Prüfe den aktuellen Projektstand und offene Tasks
2. **Dokumente prüfen** — Sind alle relevanten Unterlagen vorhanden?
3. **Team-Kommunikation** — Sende ein Update an alle Projektmitglieder
4. **Angebot aktualisieren** — Falls Änderungen im Scope waren, Angebot anpassen
5. **Nächsten Meilenstein planen** — Definiere klare Ziele und Deadlines

Soll ich bei einem dieser Punkte helfen?`,

  'Hilf mir bei der Kundenkommunikation': `Hier sind Vorlagen für häufige Kundenanfragen:

**Statusupdate:**
> "Hallo [Name], hier ein kurzes Update zu unserem Projekt: [Status]. Die nächsten Schritte sind [Schritte]. Bei Fragen stehe ich gerne zur Verfügung."

**Angebotsnachfassung:**
> "Ich wollte kurz nachfragen, ob Sie unser Angebot vom [Datum] erhalten haben und ob es Rückfragen gibt."

**Projektabschluss:**
> "Freue mich, Ihnen mitteilen zu können, dass wir [Milestone] erfolgreich abgeschlossen haben. Im Anhang finden Sie [Dokument]."

Sag mir, welche Situation du hast, und ich helfe dir beim Formulieren.`,
}

function fmt() {
  return new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
}

function typewriterEffect(
  text: string,
  setMsgs: React.Dispatch<React.SetStateAction<Msg[]>>,
  cb?: () => void
) {
  const words = text.split(' ')
  let current = ''
  let i = 0
  const msgTime = fmt()

  // Add empty ai message
  setMsgs(prev => [...prev, { role: 'ai', text: '', time: msgTime }])

  const interval = setInterval(() => {
    if (i < words.length) {
      current += (i > 0 ? ' ' : '') + words[i]
      i++
      setMsgs(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'ai', text: current, time: msgTime }
        return copy
      })
    } else {
      clearInterval(interval)
      cb?.()
    }
  }, 35)
}

export default function RelationsTagro({
  project,
}: {
  project?: ProjectContext
}) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const greeting = project
      ? `Hallo! Ich bin Tagro, dein AI-Assistent für **${project.title}**. Status: \`${project.status}\`. Wie kann ich dir helfen?`
      : 'Hallo! Ich bin Tagro, dein AI-Assistent im Relations-Panel. Frag mich zu Projekten, Angeboten oder Kommunikation.'
    setMsgs([{ role: 'ai', text: greeting, time: fmt() }])
  }, [project?.id])

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [msgs, loading])

  function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Msg = { role: 'user', text: msg, time: fmt() }
    setMsgs(prev => [...prev, userMsg])
    setLoading(true)

    // Check for pre-defined responses
    const predefined = AI_RESPONSES[msg]

    setTimeout(() => {
      const response = predefined ?? generateResponse(msg)
      typewriterEffect(response, setMsgs, () => setLoading(false))
    }, 600 + Math.random() * 400)
  }

  function generateResponse(msg: string): string {
    const lower = msg.toLowerCase()

    if (lower.includes('angebot') || lower.includes('quote')) {
      return 'Für ein neues Angebot gehe zum **Angebote-Tab** in deinem Projekt. Dort kannst du Positionen, Preise und Konditionen festlegen. Soll ich dir bei der Struktur helfen?'
    }
    if (lower.includes('projekt') || lower.includes('status')) {
      return project
        ? `Das Projekt **${project.title}** ist aktuell im Status \`${project.status}\`. ${project.description ? `Beschreibung: ${project.description}` : ''} Was möchtest du wissen?`
        : 'Wähle ein Projekt aus, damit ich dir spezifischere Informationen geben kann. Du findest alle Projekte unter **Projekte** in der Sidebar.'
    }
    if (lower.includes('dokument') || lower.includes('datei')) {
      return 'Dokumente kannst du im **Dokumente-Tab** eines Projekts hochladen und verwalten. Unterstützte Kategorien: Rechnung, Angebot, Vertrag, Sonstiges. Brauchst du Hilfe dabei?'
    }
    if (lower.includes('nachricht') || lower.includes('chat') || lower.includes('message')) {
      return 'Der **Chat-Tab** in jedem Projekt ermöglicht Echtzeit-Kommunikation mit deinem Team. Nachrichten werden sofort zugestellt. Eine Übersicht aller Nachrichten findest du unter **Nachrichten** in der Sidebar.'
    }
    if (lower.includes('hilfe') || lower.includes('help') || lower.includes('was kannst')) {
      return 'Ich kann dir bei folgenden Themen helfen:\n\n- **Angebote** erstellen und strukturieren\n- **Projektstatus** prüfen und nächste Schritte empfehlen\n- **Kundenkommunikation** formulieren\n- **Dokumente** organisieren\n- **Team-Koordination** planen\n\nFrag einfach los!'
    }

    return 'Gute Frage! Lass mich kurz überlegen... Ich empfehle, die relevanten Projekt-Details zu prüfen und dann gemeinsam die nächsten Schritte zu planen. Wie kann ich dir konkret weiterhelfen?'
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // Simple markdown rendering for bold and code
  function renderText(text: string) {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\n)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} style={{
          padding: '1px 5px', borderRadius: 4,
          background: 'var(--surface-2)', fontSize: '0.9em',
          fontFamily: 'monospace',
        }}>{part.slice(1, -1)}</code>
      }
      if (part === '\n') return <br key={i} />
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: project ? 'calc(100vh - 200px)' : 'calc(100dvh - 60px)',
      minHeight: 400,
      background: 'var(--bg)',
      borderRadius: project ? 'var(--r-lg)' : 0,
      overflow: 'hidden',
      border: project ? '1px solid var(--border)' : 'none',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
        background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg) 100%)',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Robot size={17} weight="bold" color="var(--bg)" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>
            Tagro AI
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1 }}>
            {project ? `Kontext: ${project.title}` : 'Relations Assistent'}
          </p>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10, fontWeight: 700, color: 'var(--green-dark)',
          background: 'var(--green-bg)', padding: '3px 9px', borderRadius: 7,
          border: '1px solid var(--green-border)', letterSpacing: '.06em',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
          AKTIV
        </span>
      </div>

      {/* Messages */}
      <div ref={feedRef} style={{
        flex: 1, overflowY: 'auto', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: 16,
        scrollbarWidth: 'thin',
      }}>
        <AnimatePresence>
          {msgs.map((m, i) => (
            <motion.div
              key={i}
              initial={i === msgs.length - 1 ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: .2 }}
              style={{
                display: 'flex', gap: 10,
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {m.role === 'ai' && (
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--text)', flexShrink: 0, marginTop: 3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Robot size={13} weight="bold" color="var(--bg)" />
                </div>
              )}
              <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  padding: '11px 15px',
                  borderRadius: m.role === 'ai' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                  background: m.role === 'ai' ? 'var(--card)' : 'var(--btn-prim)',
                  border: m.role === 'ai' ? '1px solid var(--border)' : 'none',
                  color: m.role === 'ai' ? 'var(--text)' : 'var(--btn-prim-text)',
                  fontSize: 13.5, lineHeight: 1.6, wordBreak: 'break-word',
                }}>
                  {m.role === 'ai' ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{renderText(m.text)}</div>
                  ) : (
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontWeight: 600 }}>{m.text}</p>
                  )}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {m.role === 'ai' ? 'Tagro' : 'Du'} · {m.time}
                </span>
              </div>
              {m.role === 'user' && (
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  flexShrink: 0, marginTop: 3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <User size={13} weight="bold" color="var(--text-secondary)" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && msgs[msgs.length - 1]?.role === 'user' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--text)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Robot size={13} weight="bold" color="var(--bg)" />
            </div>
            <div style={{
              padding: '12px 16px', background: 'var(--card)',
              border: '1px solid var(--border)', borderRadius: '4px 14px 14px 14px',
              display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0, 1, 2].map(j => (
                <span key={j} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--text-muted)',
                  animation: `pulse 1.2s ${j * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Input area */}
      <div style={{
        flexShrink: 0, padding: '0 16px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        {/* Quick actions */}
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          padding: '12px 0 10px', scrollbarWidth: 'none',
        }}>
          {QUICK_ACTIONS.map(q => {
            const Icon = q.icon
            return (
              <button
                key={q.label}
                onClick={() => send(q.label)}
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 18,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  fontSize: 11.5, fontWeight: 500, color: 'var(--text-secondary)',
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  fontFamily: 'inherit',
                  transition: 'border-color .12s, background .12s, color .12s',
                }}
              >
                <Icon size={12} weight="bold" />
                {q.label}
              </button>
            )
          })}
        </div>

        {/* Text input */}
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frag Tagro..."
            rows={1}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 12,
              border: '1px solid var(--border)', background: 'var(--inp)',
              color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
              fontWeight: 500, outline: 'none', resize: 'none',
              minHeight: 42, maxHeight: 120,
              transition: 'border-color .15s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: input.trim() ? 'var(--btn-prim)' : 'var(--surface-2)',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .15s, transform .1s',
            }}
          >
            <PaperPlaneTilt
              size={16}
              weight="bold"
              color={input.trim() ? 'var(--btn-prim-text)' : 'var(--text-muted)'}
            />
          </button>
        </div>
        <p style={{
          fontSize: 10, color: 'var(--text-muted)', textAlign: 'center',
          margin: '6px 0 0', letterSpacing: '.03em',
        }}>
          Enter senden · Shift+Enter neue Zeile
        </p>
      </div>
    </div>
  )
}
