'use client'

import { FormEvent, KeyboardEvent, useEffect, useRef, useState, type RefObject } from 'react'
import { ArrowUp, File, Plus, X } from '@phosphor-icons/react'
import BriefingContextPicker from '@/components/briefing/BriefingContextPicker'

type Props = {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void | Promise<void>
  inputRef?: RefObject<HTMLTextAreaElement | null>
  disabled?: boolean
}

export default function BriefingTagroComposer({
  placeholder = 'Mit Tagro bearbeiten oder @ für Kontext',
  value,
  onChange,
  onSubmit,
  inputRef: externalInputRef,
  disabled = false,
}: Props) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null)
  const textareaRef = externalInputRef ?? internalRef
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [focused, setFocused] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [attachments, setAttachments] = useState<{ id: string; name: string }[]>([])

  const canSend = value.trim().length > 0 && !disabled
  const sendReady = canSend || focused

  useEffect(() => {
    if (!attachOpen) return
    function onDoc(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (t.closest('.btg-plus-wrap')) return
      setAttachOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [attachOpen])

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    const text = value.trim()
    if (!text || disabled) return
    const attachNote = attachments.length
      ? `\n\n[Anhänge: ${attachments.map(a => a.name).join(', ')}]`
      : ''
    await onSubmit(`${text}${attachNote}`)
    onChange('')
    setAttachments([])
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === '@') {
      window.setTimeout(() => setPickerOpen(true), 0)
      return
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  function insertContext(label: string) {
    const mention = label.startsWith('@') ? label : `@${label}`
    const next = value.trim()
      ? `${value.replace(/\s+$/, '')} ${mention} `
      : `${mention} `
    onChange(next)
    setAttachOpen(false)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function onFilesSelected(files: FileList | null) {
    if (!files?.length) return
    const next = Array.from(files).map(file => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
    }))
    setAttachments(prev => {
      const seen = new Set(prev.map(p => p.id))
      return [...prev, ...next.filter(n => !seen.has(n.id))]
    })
    setAttachOpen(false)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  return (
    <>
      <form className="tagro-composer tagro-composer--briefing" onSubmit={submit}>
        {attachments.length > 0 ? (
          <div className="btg-attach-row" aria-label="Anhänge">
            {attachments.map(file => (
              <span key={file.id} className="btg-attach-chip">
                <File size={12} weight="regular" aria-hidden />
                <span>{file.name}</span>
                <button
                  type="button"
                  aria-label={`${file.name} entfernen`}
                  onClick={() => setAttachments(prev => prev.filter(p => p.id !== file.id))}
                >
                  <X size={10} weight="bold" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div
          className={[
            'tagro-composer-bar',
            focused ? 'is-focused' : '',
            canSend ? 'is-ready' : '',
          ].filter(Boolean).join(' ')}
        >
          <div className="btg-plus-wrap">
            <button
              className="tagro-composer-plus"
              type="button"
              aria-label="Kontext oder Datei hinzufügen"
              aria-expanded={attachOpen}
              onClick={() => setAttachOpen(v => !v)}
            >
              <Plus size={17} weight="bold" />
            </button>
            {attachOpen ? (
              <div className="btg-attach-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAttachOpen(false)
                    setPickerOpen(true)
                  }}
                >
                  @ Kontext
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => fileRef.current?.click()}
                >
                  Datei
                </button>
              </div>
            ) : null}
          </div>
          <textarea
            ref={textareaRef}
            className="tagro-composer-input"
            value={value}
            rows={1}
            disabled={disabled}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            className={['tagro-composer-send', sendReady ? 'is-visible' : ''].filter(Boolean).join(' ')}
            type="submit"
            disabled={!canSend}
            aria-label="An Tagro senden"
          >
            <ArrowUp size={17} weight="bold" />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          hidden
          multiple
          accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.csv,.xlsx"
          onChange={e => {
            onFilesSelected(e.target.files)
            e.target.value = ''
          }}
        />
      </form>
      <BriefingContextPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={insertContext}
      />
    </>
  )
}
