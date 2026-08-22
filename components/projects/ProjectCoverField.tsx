'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { COVER_MIME, checkCoverFile } from '@/lib/projects/cover'

/**
 * Titelbild eines Projekts — setzen, ersetzen, entfernen.
 *
 * Ein Projekt darf ein Gesicht haben; in einer Liste findet das Auge ein Bild
 * schneller als einen Namen. Das Feld ist bewusst klein: es ist Identität,
 * kein Inhalt, und soll die Seite nicht anführen.
 *
 * Die Prüfung läuft zweimal — hier, damit der Nutzer sofort erfährt, dass
 * seine 12-MB-Datei zu groß ist, und in der Route, weil eine Grenze, die nur
 * das Frontend kennt, keine Grenze ist. Beide lesen dieselben Regeln aus
 * lib/projects/cover.ts, damit sie nicht auseinanderlaufen können.
 */

type Props = {
  projectId: string
  /** Signierter Link auf das aktuelle Bild, falls es eines gibt. */
  initialUrl?: string | null
  /** Wer nicht darf, sieht das Bild — aber keine Knöpfe. */
  canEdit?: boolean
  onChange?: (url: string | null) => void
}

type State =
  | { kind: 'idle' }
  | { kind: 'busy'; label: string }
  | { kind: 'error'; message: string }

export default function ProjectCoverField({
  projectId,
  initialUrl,
  canEdit = true,
  onChange,
}: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const aliveRef = useRef(true)

  useEffect(() => () => { aliveRef.current = false }, [])
  useEffect(() => { if (initialUrl !== undefined) setUrl(initialUrl) }, [initialUrl])

  /* Reicht die Seite keinen Link herein, holt sich das Feld ihn selbst. So
     muss keine aufrufende Seite ihre Datenladung um eine Spalte erweitern,
     nur um ein 72px-Bild zu zeigen — das Feld ist für sich vollständig. */
  useEffect(() => {
    if (initialUrl !== undefined) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/cover`)
        if (!res.ok || cancelled || !aliveRef.current) return
        const data = await res.json().catch(() => ({}))
        if (!cancelled && aliveRef.current) setUrl(data?.url ?? null)
      } catch { /* ohne Bild ist die Seite vollständig, nur ärmer */ }
    })()
    return () => { cancelled = true }
  }, [projectId, initialUrl])

  const apply = useCallback((next: string | null) => {
    if (!aliveRef.current) return
    setUrl(next)
    onChange?.(next)
  }, [onChange])

  const upload = useCallback(async (file: File) => {
    /* Sofortige Antwort auf den offensichtlichen Fehler — niemand soll auf
       einen Upload warten, um zu erfahren, dass die Datei zu groß ist. */
    const check = checkCoverFile(file.type, file.size)
    if (!check.ok) {
      setState({ kind: 'error', message: check.reason })
      return
    }

    setState({ kind: 'busy', label: 'Bild wird hochgeladen…' })
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch(`/api/projects/${projectId}/cover`, { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!aliveRef.current) return
      if (!res.ok) {
        setState({ kind: 'error', message: data?.error || 'Das Bild konnte nicht gespeichert werden.' })
        return
      }
      apply(data?.url ?? null)
      setState({ kind: 'idle' })
    } catch {
      if (!aliveRef.current) return
      setState({ kind: 'error', message: 'Keine Verbindung. Am Projekt hat sich nichts geändert.' })
    }
  }, [projectId, apply])

  const clear = useCallback(async () => {
    setState({ kind: 'busy', label: 'Bild wird entfernt…' })
    try {
      const res = await fetch(`/api/projects/${projectId}/cover`, { method: 'DELETE' })
      if (!aliveRef.current) return
      if (!res.ok) {
        setState({ kind: 'error', message: 'Das Titelbild konnte nicht entfernt werden.' })
        return
      }
      apply(null)
      setState({ kind: 'idle' })
    } catch {
      if (!aliveRef.current) return
      setState({ kind: 'error', message: 'Keine Verbindung. Am Projekt hat sich nichts geändert.' })
    }
  }, [projectId, apply])

  const busy = state.kind === 'busy'

  return (
    <div className="pcf">
      <style dangerouslySetInnerHTML={{ __html: COVER_FIELD_CSS }} />

      <div className={`pcf-frame${url ? ' has-image' : ''}${busy ? ' is-busy' : ''}`}>
        {url ? (
          /* Ein Nutzerbild in unbekanntem Seitenverhältnis — object-fit deckt
             den Rahmen ab, statt ihn zu verzerren oder Ränder zu lassen. */
          <img src={url} alt="" className="pcf-img" />
        ) : (
          <span className="pcf-placeholder" aria-hidden />
        )}
      </div>

      <div className="pcf-side">
        <p className="pcf-label">Titelbild</p>
        {state.kind === 'error' ? (
          <p className="pcf-msg is-error" role="alert">{state.message}</p>
        ) : busy ? (
          <p className="pcf-msg">{state.label}</p>
        ) : (
          <p className="pcf-msg">
            {url ? 'Erscheint in Listen und Berichten.' : 'PNG, JPG oder WebP, bis 4 MB.'}
          </p>
        )}

        {canEdit && (
          <div className="pcf-actions">
            <button
              type="button"
              className="pcf-btn"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {url ? 'Ersetzen' : 'Bild wählen'}
            </button>
            {url && (
              <button type="button" className="pcf-btn is-quiet" disabled={busy} onClick={() => void clear()}>
                Entfernen
              </button>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={COVER_MIME.join(',')}
        className="pcf-input"
        onChange={(e) => {
          const file = e.target.files?.[0]
          /* Zurücksetzen, sonst löst dieselbe Datei kein zweites change aus —
             und ein fehlgeschlagener Upload wäre nicht wiederholbar. */
          e.target.value = ''
          if (file) void upload(file)
        }}
      />
    </div>
  )
}

const COVER_FIELD_CSS = `
.pcf { display: flex; align-items: flex-start; gap: 14px; }
.pcf-input { display: none; }

.pcf-frame {
  flex: 0 0 auto;
  width: 72px; height: 72px;
  border-radius: var(--r-row, 12px);
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: color-mix(in srgb, var(--surface-2) 45%, transparent);
  overflow: hidden;
  display: grid; place-items: center;
  transition: opacity var(--dur-1, 140ms) var(--ease-out);
}
.pcf-frame.is-busy { opacity: .55; }
.pcf-img { width: 100%; height: 100%; object-fit: cover; display: block; }
/* Kein Icon, kein „Bild"-Symbol — eine leere Fläche sagt schon, dass sie leer
   ist. Der Satz daneben sagt, was hineingehört. */
.pcf-placeholder {
  width: 22px; height: 22px;
  border-radius: var(--r-mark, 4px);
  background: color-mix(in srgb, var(--text-muted) 22%, transparent);
}

.pcf-side { min-width: 0; display: flex; flex-direction: column; gap: 3px; padding-top: 2px; }
.pcf-label { margin: 0; font-size: 13.5px; color: var(--text); }
.pcf-msg { margin: 0; font-size: 12.5px; line-height: 1.45; color: var(--text-muted); }
.pcf-msg.is-error { color: var(--f-err, #dc2626); }

.pcf-actions { display: flex; gap: 6px; margin-top: 8px; }
.pcf-btn {
  height: 28px; padding: 0 11px;
  border-radius: var(--r-control, 6px);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font: inherit; font-size: 12.5px;
  cursor: pointer;
  transition: background var(--dur-1, 140ms) var(--ease-out),
              border-color var(--dur-1, 140ms) var(--ease-out);
}
.pcf-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--surface-2) 60%, var(--surface)); }
.pcf-btn:disabled { opacity: .5; cursor: default; }
.pcf-btn.is-quiet { border-color: transparent; background: transparent; color: var(--text-muted); }
.pcf-btn.is-quiet:hover:not(:disabled) { color: var(--text); background: color-mix(in srgb, var(--surface-2) 45%, transparent); }

@media (max-width: 780px) {
  .pcf-frame { width: 64px; height: 64px; }
  /* Touch-Ziele: 28px sind mit dem Daumen nicht zu treffen. */
  .pcf-btn { height: 36px; padding: 0 14px; font-size: 13px; }
}
`
