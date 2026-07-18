'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { usePathname } from 'next/navigation'
import { Microphone } from '@phosphor-icons/react'
import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import { TAGRO_FOCUS_COMPOSE_CSS } from '@/components/tagro/tagro-focus-compose-styles'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import type { WritingAction } from '@/lib/extension/writing-assistant'
import {
  isEditableFocusTarget,
  resolveTagroFocusContext,
  shouldIgnoreTagroFocusTarget,
} from '@/lib/tagro/resolve-focus-context'

type ActiveField = {
  el: HTMLElement
  label: string
}

function readFieldText(el: HTMLElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value
  return (el.innerText || el.textContent || '').trim()
}

function writeFieldText(el: HTMLElement, text: string) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
    const desc = Object.getOwnPropertyDescriptor(proto, 'value')
    if (desc?.set) desc.set.call(el, text)
    else el.value = text
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return
  }
  el.focus()
  try {
    document.execCommand('selectAll', false)
    document.execCommand('insertText', false, text)
  } catch {
    el.textContent = text
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

function fieldLabelFor(el: HTMLElement): string {
  const labelled = el.getAttribute('aria-label')
    || el.getAttribute('placeholder')
    || el.getAttribute('name')
    || el.getAttribute('id')
  return (labelled || 'Eingabe').slice(0, 80)
}

export default function TagroFocusComposeBar() {
  const pathname = usePathname() || '/'
  const context = resolveTagroFocusContext(pathname)
  const [open, setOpen] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [active, setActive] = useState<ActiveField | null>(null)
  const activeRef = useRef<ActiveField | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimer = useRef<number | null>(null)
  const liveTimer = useRef<number | null>(null)
  const liveSeq = useRef(0)

  const { supported: micSupported, listening, start: startMic, stop: stopMic } = useSpeechRecognition({
    lang: 'de-DE',
    onResult: (text, isFinal) => {
      if (!text) return
      setInstruction(prev => {
        if (!isFinal && prev) return prev
        return text
      })
    },
  })

  useEffect(() => {
    activeRef.current = active
  }, [active])

  const closeBar = useCallback(() => {
    if (listening) stopMic()
    setOpen(false)
    setActive(null)
    setStatus('')
    setBusy(false)
    if (liveTimer.current) window.clearTimeout(liveTimer.current)
  }, [listening, stopMic])

  const runAction = useCallback(async (action: WritingAction, opts?: { silent?: boolean }) => {
    const field = activeRef.current
    if (!field?.el?.isConnected) return
    const text = readFieldText(field.el).trim()
    if (!text) {
      setStatus('Tippe zuerst etwas in das Feld.')
      return
    }

    setBusy(true)
    if (!opts?.silent) setStatus(action === 'translate' ? 'Tagro übersetzt…' : 'Tagro schreibt mit…')
    try {
      const res = await fetch('/api/tagro/improve-text', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          action,
          pageTitle: context.label,
          fieldLabel: instruction.trim() || field.label,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.improved) {
        setStatus('Tagro ist gerade nicht verfügbar.')
        return
      }
      writeFieldText(field.el, String(json.improved))
      setStatus(action === 'translate' ? 'Übersetzt.' : 'Verbessert.')
      if (instruction.trim()) setInstruction('')
      window.setTimeout(() => setStatus(''), 1600)
    } catch {
      setStatus('Netzwerkproblem. Bitte erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }, [context.label, instruction])

  const scheduleLiveRewrite = useCallback(() => {
    if (liveTimer.current) window.clearTimeout(liveTimer.current)
    const seq = ++liveSeq.current
    liveTimer.current = window.setTimeout(() => {
      const field = activeRef.current
      if (!field?.el?.isConnected) return
      const text = readFieldText(field.el).trim()
      if (text.length < 12) return
      void (async () => {
        if (seq !== liveSeq.current) return
        setBusy(true)
        setStatus('Tagro schreibt live mit…')
        try {
          const res = await fetch('/api/tagro/improve-text', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              action: 'clearer',
              pageTitle: context.label,
              fieldLabel: field.label,
            }),
          })
          const json = await res.json().catch(() => ({}))
          if (seq !== liveSeq.current) return
          if (!res.ok || !json?.improved) {
            setStatus('')
            return
          }
          writeFieldText(field.el, String(json.improved))
          setStatus('Live verbessert.')
          window.setTimeout(() => {
            if (seq === liveSeq.current) setStatus('')
          }, 1200)
        } catch {
          if (seq === liveSeq.current) setStatus('')
        } finally {
          if (seq === liveSeq.current) setBusy(false)
        }
      })()
    }, 1400)
  }, [context.label])

  useEffect(() => {
    function onFocusIn(event: FocusEvent) {
      const target = event.target
      if (!isEditableFocusTarget(target)) return
      if (shouldIgnoreTagroFocusTarget(target)) return

      if (blurTimer.current) {
        window.clearTimeout(blurTimer.current)
        blurTimer.current = null
      }

      const next = { el: target, label: fieldLabelFor(target) }
      activeRef.current = next
      setActive(next)
      setOpen(true)
      setStatus('')
    }

    function onFocusOut(event: FocusEvent) {
      const next = event.relatedTarget
      if (next instanceof Element && next.closest('[data-tagro-focus-compose]')) return
      blurTimer.current = window.setTimeout(() => {
        const focused = document.activeElement
        if (focused instanceof Element && focused.closest('[data-tagro-focus-compose]')) return
        if (isEditableFocusTarget(focused) && !shouldIgnoreTagroFocusTarget(focused)) return
        closeBar()
      }, 160)
    }

    function onInput(event: Event) {
      const target = event.target
      if (!activeRef.current) return
      if (target !== activeRef.current.el) return
      scheduleLiveRewrite()
    }

    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
    document.addEventListener('input', onInput, true)
    return () => {
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('focusout', onFocusOut, true)
      document.removeEventListener('input', onInput, true)
      if (blurTimer.current) window.clearTimeout(blurTimer.current)
      if (liveTimer.current) window.clearTimeout(liveTimer.current)
    }
  }, [closeBar, scheduleLiveRewrite])

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && open) {
        event.preventDefault()
        closeBar()
        activeRef.current?.el?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeBar])

  function onComposeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void runAction('clearer')
    }
  }

  function toggleMic() {
    if (!micSupported || busy) return
    if (listening) stopMic()
    else startMic()
  }

  return (
    <>
      <style>{TAGRO_FOCUS_COMPOSE_CSS}</style>
      <div
        className={`tfc-root${open ? ' is-open' : ''}`}
        data-tagro-focus-compose
        role="region"
        aria-label="Tagro Schreibhilfe"
        aria-hidden={!open}
      >
        {status ? (
          <div className="tfc-status" role="status">
            <strong>Tagro</strong>
            {' '}
            {status}
          </div>
        ) : null}
        <div className="tfc-shell">
          <div className="tfc-context" title={`@ ${context.label}`}>
            <span className="tfc-context-icon" aria-hidden>
              <TagroComposeIcon size={14} />
            </span>
            <span className="tfc-context-label">@{context.label}</span>
          </div>

          <div className="tfc-input-wrap">
            <input
              ref={inputRef}
              className="tfc-input"
              type="text"
              value={instruction}
              disabled={busy}
              placeholder="Beschreiben oder mit Tagro verbessern…"
              onChange={e => setInstruction(e.target.value)}
              onKeyDown={onComposeKeyDown}
              aria-label="Tagro Anweisung"
            />
          </div>

          <div className="tfc-actions">
            <button
              type="button"
              className="tfc-translate"
              disabled={busy || !active}
              onClick={() => void runAction('translate')}
            >
              Mit Tagro übersetzen
            </button>
            {micSupported ? (
              <button
                type="button"
                className={`tfc-mic${listening ? ' is-listening' : ''}`}
                disabled={busy}
                onClick={toggleMic}
                aria-label={listening ? 'Aufnahme stoppen' : 'Spracheingabe'}
                title={listening ? 'Aufnahme stoppen' : 'Spracheingabe'}
              >
                <Microphone size={16} weight={listening ? 'fill' : 'regular'} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
