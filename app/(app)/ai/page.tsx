'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, DotsThree, Microphone, Plus, Sparkle } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import ChatMarkdown from '@/components/ChatMarkdown'

type Msg = { role: 'user' | 'ai'; text: string; time: string; thinking?: string | null }
type Project = { id: string; title: string; status: string; description?: string }
type Task = { id: string; title: string; status: string; project_id: string }

const PHASE: Record<string, string> = {
  intake: 'Intake',
  planning: 'Planning',
  active: 'In Arbeit',
  testing: 'Testing',
  done: 'Abgeschlossen',
}

const TEST_TRIGGER = /^\s*test[\s\-_]*projekt\s*$/i

const SYSTEM = `Du bist Tagro, das AI-Produktionssystem von Festag.
Verhalte dich wie ein erfahrener CTO und Projektmanager in einem.
Beantworte Fragen klar und direkt. Maximal 5 Sätze pro Antwort.
Wenn du Projektdaten hast, nutze sie konkret.
Sprache: Deutsch. Kein Smalltalk. Keine Emojis.

FORMATIERUNG: Nutze Markdown wenn es Klarheit schafft.
- **fett** für Schlüsselbegriffe
- Listen (- oder 1.) für mehrere Punkte
- \`code\` für Datei-, Feld- oder Statusnamen
- Überschriften (### oder ####) nur bei längeren Berichten
Halte den Text trotzdem knapp.`

export default function AIPage() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const feedRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sb = createClient()

  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        window.location.href = '/login'
        return
      }
      const { data: p } = await sb.from('projects').select('id,title,status,description').order('created_at', { ascending: false }).limit(8)
      const { data: t } = await sb.from('tasks').select('id,title,status,project_id').order('created_at', { ascending: false }).limit(50)
      setProjects(p ?? [])
      setTasks(t ?? [])
      setMsgs([
        {
          role: 'ai',
          text: p?.length
            ? `Ich bin Tagro — dein AI-Projektmanager.\n\nDu hast ${p.length} aktives Projekt${p.length !== 1 ? 'e' : ''}. Wie kann ich dir helfen?`
            : 'Ich bin Tagro — dein AI-Projektmanager.\n\nDu hast noch keine Projekte. Starte ein Projekt um loszulegen.',
          time: fmt(),
        },
      ])
    })
  }, [])

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [msgs, loading])

  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 176)}px`
  }, [input])

  function fmt() {
    return new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
  }

  function buildContext() {
    if (!projects.length) return ''
    return '\n\nAktuelle Projekte:\n' + projects.map(p =>
      `- ${p.title} (${PHASE[p.status] ?? p.status})${p.description ? ': ' + p.description : ''}`
    ).join('\n')
  }

  async function createTestProject() {
    setLoading(true)
    try {
      const { data: { session } } = await sb.auth.getSession()
      const userId = session?.user.id
      if (!userId) {
        setLoading(false)
        return
      }
      const res = await fetch('/api/ai/test-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const d = await res.json()
      if (d.projectId) {
        const title = d.decomposed?.project_title ?? 'Demo-Projekt'
        const epics = d.decomposed?.epics?.length ?? 0
        const ntasks = d.decomposed?.epics?.reduce((a: number, e: any) => a + (e.tasks?.length ?? 0), 0) ?? 0
        setMsgs(m => [...m, { role: 'ai', text: `**Demo-Projekt erstellt: "${title}"**\n\n- ${epics} Epics\n- ${ntasks} Tasks\n- Status: \`intake\`\n\n[Projekt öffnen →](/project/${d.projectId})`, time: fmt() }])
        const { data: p } = await sb.from('projects').select('id,title,status,description').order('created_at', { ascending: false }).limit(8)
        setProjects(p ?? [])
      } else {
        setMsgs(m => [...m, { role: 'ai', text: `Konnte Demo-Projekt nicht anlegen: ${d.error ?? 'unbekannter Fehler'}`, time: fmt() }])
      }
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'Verbindungsfehler beim Anlegen des Demo-Projekts.', time: fmt() }])
    }
    setLoading(false)
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Msg = { role: 'user', text: msg, time: fmt() }
    setMsgs(m => [...m, userMsg])

    if (TEST_TRIGGER.test(msg)) {
      setMsgs(m => [...m, { role: 'ai', text: 'Tagro generiert ein realistisches Demo-Projekt — einen Moment…', time: fmt() }])
      createTestProject()
      return
    }

    setLoading(true)
    try {
      const history = [...msgs.slice(-8), userMsg]
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM + buildContext(),
          max_tokens: 500,
          messages: history.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
        }),
      })
      const d = await res.json()
      const text = d.content?.[0]?.text
      if (text) {
        setMsgs(m => [...m, { role: 'ai', text, time: fmt(), thinking: d.thinking ?? null }])
      } else {
        const errMsg = d?.message || d?.error || 'Unbekannter Fehler'
        setMsgs(m => [...m, { role: 'ai', text: `**AI-Fehler:** ${errMsg}`, time: fmt() }])
      }
    } catch (e: any) {
      setMsgs(m => [...m, { role: 'ai', text: `**Verbindungsfehler:** ${e?.message ?? 'unbekannt'}`, time: fmt() }])
    }
    setLoading(false)
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    send()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'doing').length
  const activeProjectName = projects[0]?.title ?? 'kein Projekt gewählt'

  return (
    <div className="tagro-operating-root">
      <style>{`
        .tagro-operating-root {
          height: 100%;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          color: #e8e7e3;
          background:
            radial-gradient(circle at 18% 8%, rgba(115, 129, 164, 0.13), transparent 34%),
            radial-gradient(circle at 78% 2%, rgba(255, 255, 255, 0.045), transparent 26%),
            linear-gradient(180deg, #0b0d0f 0%, #0a0c0e 100%);
        }
        .tagro-head {
          min-height: 82px;
          padding: 23px 36px 15px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          flex-shrink: 0;
        }
        .tagro-title-wrap { display: flex; align-items: center; gap: 13px; min-width: 0; }
        .tagro-mark {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: #f4f3ee;
          background: linear-gradient(145deg, rgba(255,255,255,.13), rgba(255,255,255,.035));
          border: 1px solid rgba(255,255,255,.075);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
        }
        .tagro-title { margin: 0; color: #f1f0ec; font-size: 17px; font-weight: 700; letter-spacing: -.02em; line-height: 1.1; }
        .tagro-sub { margin: 4px 0 0; color: rgba(232,231,227,.48); font-size: 12.5px; font-weight: 500; letter-spacing: -.01em; }
        .tagro-actions { display: flex; align-items: center; gap: 10px; padding-top: 2px; }
        .tagro-live {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          height: 34px;
          padding: 0 14px;
          border-radius: 32px;
          color: #d9f7dd;
          background: rgba(51, 195, 91, .09);
          border: 1px solid rgba(78, 210, 119, .18);
          font-size: 12px;
          font-weight: 700;
        }
        .tagro-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #50d56d; box-shadow: 0 0 18px rgba(80,213,109,.48); }
        .tagro-menu-btn {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,.075);
          border-radius: 32px;
          background: rgba(255,255,255,.025);
          color: rgba(232,231,227,.72);
          display: grid;
          place-items: center;
          padding: 0;
        }
        .tagro-flow {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 22px 36px 168px;
          display: flex;
          flex-direction: column;
          gap: 40px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,.12) transparent;
        }
        .tagro-flow::-webkit-scrollbar { width: 7px; }
        .tagro-flow::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 20px; }
        .tagro-message {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 16px;
          width: min(720px, 76vw);
          animation: fadeUp .35s cubic-bezier(.16,1,.3,1) both;
        }
        .tagro-message.user {
          align-self: flex-end;
          display: flex;
          justify-content: flex-end;
          width: min(560px, 58vw);
        }
        .tagro-avatar {
          width: 34px;
          height: 34px;
          border-radius: 32px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.07);
          color: rgba(244,243,238,.92);
          margin-top: 2px;
        }
        .tagro-ai-block {
          color: rgba(239,238,234,.88);
          background:
            radial-gradient(circle at 10% 0%, rgba(255,255,255,.07), transparent 45%),
            linear-gradient(145deg, rgba(21,24,27,.92), rgba(14,16,18,.96));
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 22px;
          padding: 20px 24px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
          font-size: 15px;
          line-height: 1.68;
        }
        .tagro-ai-block p { margin-top: 0; }
        .tagro-user-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
        .tagro-user-block {
          color: rgba(245,244,239,.92);
          background: linear-gradient(145deg, rgba(38,41,45,.96), rgba(28,31,34,.94));
          border: 1px solid rgba(255,255,255,.055);
          border-radius: 22px 22px 6px 22px;
          padding: 16px 20px;
          font-size: 14.5px;
          line-height: 1.55;
          font-weight: 560;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.045);
        }
        .tagro-time {
          color: rgba(232,231,227,.34);
          font-size: 11px;
          letter-spacing: -.01em;
        }
        .tagro-meta-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
          color: rgba(232,231,227,.34);
          font-size: 11px;
        }
        .tagro-thinking {
          margin-bottom: 10px;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: rgba(232,231,227,.32);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
          user-select: none;
        }
        .tagro-thinking-line { width: 26px; height: 1px; background: rgba(255,255,255,.09); }
        .tagro-loading {
          width: 54px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .tagro-loading span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(232,231,227,.46);
          animation: pulse 1.2s ease-in-out infinite;
        }
        .tagro-loading span:nth-child(2) { animation-delay: .15s; }
        .tagro-loading span:nth-child(3) { animation-delay: .3s; }
        .tagro-command-shell {
          flex-shrink: 0;
          margin-top: auto;
          padding: 18px 26px calc(18px + env(safe-area-inset-bottom));
          border-radius: 32px 32px 0 0;
          background:
            radial-gradient(circle at 22% 0%, rgba(255,255,255,.055), transparent 34%),
            linear-gradient(180deg, rgba(21,24,27,.98), rgba(15,17,19,.98));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.07),
            0 -28px 90px rgba(0,0,0,.42);
        }
        .tagro-context-line {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(232,231,227,.42);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .02em;
          margin: 0 0 12px 6px;
        }
        .tagro-context-line strong { color: rgba(232,231,227,.72); font-weight: 700; }
        .tagro-command {
          min-height: 74px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .tagro-command-icon {
          width: 42px;
          height: 42px;
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.035);
          color: rgba(232,231,227,.68);
          display: grid;
          place-items: center;
          flex-shrink: 0;
          margin-top: 3px;
        }
        .tagro-textarea {
          flex: 1;
          min-height: 48px;
          max-height: 176px;
          resize: none;
          border: 0;
          outline: none;
          padding: 13px 0 8px;
          background: transparent;
          color: rgba(244,243,238,.92);
          font: inherit;
          font-size: 17px;
          font-weight: 520;
          line-height: 1.55;
          overflow-y: auto;
        }
        .tagro-textarea::placeholder { color: rgba(232,231,227,.28); transition: opacity .18s ease; }
        .tagro-textarea:focus::placeholder { opacity: .55; }
        .tagro-submit {
          width: 44px;
          height: 44px;
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.9);
          color: #0b0d0f;
          display: grid;
          place-items: center;
          padding: 0;
          flex-shrink: 0;
          margin-top: 2px;
          opacity: 1;
          transform: scale(1);
          transition: transform .18s ease, opacity .18s ease, background .18s ease;
        }
        .tagro-submit:disabled { opacity: .38; transform: scale(.96); }
        .tagro-mic {
          width: 44px;
          height: 44px;
          border-radius: 32px;
          border: 0;
          background: transparent;
          color: rgba(232,231,227,.62);
          display: grid;
          place-items: center;
          padding: 0;
          flex-shrink: 0;
          margin-top: 2px;
        }
        @media (max-width: 760px) {
          .tagro-head { padding: 20px 20px 12px; min-height: 74px; }
          .tagro-flow { padding: 18px 20px 156px; gap: 30px; }
          .tagro-message, .tagro-message.user { width: 100%; }
          .tagro-message { grid-template-columns: 34px minmax(0, 1fr); gap: 11px; }
          .tagro-ai-block { padding: 17px 18px; border-radius: 20px; }
          .tagro-command-shell { padding-left: 18px; padding-right: 18px; }
          .tagro-textarea { font-size: 15.5px; }
        }
      `}</style>

      <header className="tagro-head">
        <div className="tagro-title-wrap">
          <div className="tagro-mark" aria-hidden="true"><Sparkle size={18} weight="bold" /></div>
          <div>
            <h1 className="tagro-title">Tagro AI</h1>
            <p className="tagro-sub">AI Project Operations</p>
          </div>
        </div>
        <div className="tagro-actions">
          <span className="tagro-live"><span className="tagro-live-dot" />Aktiv</span>
          <button className="tagro-menu-btn" type="button" aria-label="Tagro Optionen"><DotsThree size={21} weight="bold" /></button>
        </div>
      </header>

      <main ref={feedRef} className="tagro-flow">
        {msgs.map((m, i) => (
          <div key={`${m.time}-${i}`} className={`tagro-message ${m.role === 'user' ? 'user' : 'ai'}`}>
            {m.role === 'ai' ? (
              <>
                <div className="tagro-avatar" aria-hidden="true"><Sparkle size={15} weight="bold" /></div>
                <div>
                  {m.thinking && <ThinkingBlock text={m.thinking} />}
                  <div className="tagro-ai-block"><ChatMarkdown text={m.text} /></div>
                  <div className="tagro-meta-row"><span>Tagro</span><span>·</span><span>{m.time}</span></div>
                </div>
              </>
            ) : (
              <div className="tagro-user-wrap">
                <div className="tagro-user-block"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.text}</p></div>
                <span className="tagro-time">{m.time} ✓✓</span>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="tagro-message ai">
            <div className="tagro-avatar" aria-hidden="true"><Sparkle size={15} weight="bold" /></div>
            <div>
              <div className="tagro-thinking"><span className="tagro-thinking-line" />System verarbeitet Projektkontext</div>
              <div className="tagro-ai-block" style={{ width: 118 }}>
                <span className="tagro-loading"><span /><span /><span /></span>
              </div>
            </div>
          </div>
        )}
      </main>

      <section className="tagro-command-shell" aria-label="Tagro Eingabe">
        <p className="tagro-context-line">
          Kontext <strong>{activeProjectName}</strong>
          <span>·</span>
          <span>{projects.length} Projekte</span>
          <span>·</span>
          <span>{doneTasks}/{totalTasks} Tasks erledigt</span>
          <span>·</span>
          <span>{inProgress} aktiv</span>
        </p>
        <form className="tagro-command" onSubmit={submit}>
          <button className="tagro-command-icon" type="button" aria-label="Kontext hinzufügen"><Plus size={22} /></button>
          <textarea
            ref={inputRef}
            className="tagro-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Frag Tagro — was soll dein Projekt können?"
            rows={1}
            autoFocus
          />
          {input.trim() ? (
            <button className="tagro-submit" type="submit" disabled={loading} aria-label="An Tagro senden"><ArrowUp size={19} weight="bold" /></button>
          ) : (
            <button className="tagro-mic" type="button" aria-label="Voice Input vorbereitet"><Microphone size={21} /></button>
          )}
        </form>
      </section>
    </div>
  )
}

function ThinkingBlock({ text }: { text: string }) {
  return (
    <div>
      <div className="tagro-thinking"><span className="tagro-thinking-line" />Denkprozess · Tagro</div>
      <div style={{
        marginBottom: 12,
        maxWidth: 620,
        color: 'rgba(232,231,227,.36)',
        fontSize: 12,
        lineHeight: 1.55,
        fontStyle: 'italic',
        whiteSpace: 'pre-wrap',
      }}>
        {text}
      </div>
    </div>
  )
}
