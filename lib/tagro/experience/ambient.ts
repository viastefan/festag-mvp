import { resolveTagroFocusContext } from '@/lib/tagro/resolve-focus-context'
import type { TagroEditTarget, TagroPlace, TagroSubject, TagroSubjectKind } from '@/lib/tagro/experience/types'

/**
 * Ambient context resolution.
 *
 * Tagro reads the screen the way the user sees it: whatever element the
 * attention is on declares itself through `data-tagro-*` attributes, and the
 * nearest declaration wins. Pages opt in by rendering those attributes (or via
 * the `useTagroSubject` hook) — no surface has to wire Tagro up by hand.
 */

const KINDS: TagroSubjectKind[] = [
  'text', 'task', 'project', 'decision', 'document', 'file',
  'meeting', 'image', 'design', 'report', 'note', 'issue', 'client', 'page',
]

function asKind(value: string | null | undefined): TagroSubjectKind | null {
  if (!value) return null
  const v = value.trim().toLowerCase() as TagroSubjectKind
  return KINDS.includes(v) ? v : null
}

/** Elements Tagro must never attach itself to. */
export function isTagroOwnSurface(el: Element | null): boolean {
  if (!el) return false
  return Boolean(
    el.closest?.(
      '[data-tagro-surface], .tx-toolbar, .tx-panel, .tx-inline, .tx-hint, .tov-root, [data-tagro-overlay], [data-tagro-focus-compose]',
    ),
  )
}

/**
 * Walk up from an element to the nearest declared subject. Falls back through
 * ancestors so a selection inside a task description still resolves the task.
 */
export function subjectFromElement(el: Element | null): TagroSubject | null {
  let node: Element | null = el
  while (node) {
    if (node instanceof HTMLElement) {
      const kind = asKind(node.dataset.tagroKind)
      if (kind) {
        const facts: Record<string, string> = {}
        for (const [key, value] of Object.entries(node.dataset)) {
          if (key.startsWith('tagroFact') && value) {
            const name = key.slice('tagroFact'.length)
            facts[name.charAt(0).toLowerCase() + name.slice(1)] = value
          }
        }
        return {
          kind,
          id: node.dataset.tagroId || undefined,
          title: node.dataset.tagroTitle || undefined,
          detail: node.dataset.tagroDetail || undefined,
          projectId: node.dataset.tagroProject || undefined,
          facts: Object.keys(facts).length ? facts : undefined,
        }
      }
    }
    node = node.parentElement
  }
  return null
}

/** Every subject currently rendered on screen — Tagro's peripheral vision. */
export function ambientSubjects(limit = 12): TagroSubject[] {
  if (typeof document === 'undefined') return []
  const out: TagroSubject[] = []
  const seen = new Set<string>()
  const nodes = document.querySelectorAll<HTMLElement>('[data-tagro-kind]')
  for (const node of Array.from(nodes)) {
    if (isTagroOwnSurface(node)) continue
    const subject = subjectFromElement(node)
    if (!subject) continue
    const key = `${subject.kind}:${subject.id ?? subject.title ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(subject)
    if (out.length >= limit) break
  }
  return out
}

const PORTAL_LABELS: Record<string, string> = {
  '/dev': 'Execution Panel',
  '/dev/tasks': 'Aufgaben',
  '/dev/review': 'Review',
  '/dev/github': 'GitHub',
  '/dev/deliverables': 'Lieferungen',
  '/dev/team': 'Team',
  '/dev/activity': 'Aktivität',
}

export function resolvePlace(pathname: string): TagroPlace {
  const path = String(pathname || '/').split('?')[0] || '/'
  const portal: TagroPlace['portal'] = path.startsWith('/dev')
    ? 'dev'
    : path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/docs')
      ? 'public'
      : 'client'

  const label = PORTAL_LABELS[path] ?? resolveTagroFocusContext(path).label
  const projectMatch = path.match(/^\/(?:dev\/)?project\/([^/]+)/)

  return {
    pathname: path,
    label,
    portal,
    projectId: projectMatch?.[1],
  }
}

// ── Selection ──────────────────────────────────────────────────────────────

export type TagroSelectionInfo = {
  text: string
  /** Viewport rect of the selection, used to place the toolbar. */
  rect: DOMRect
  subject: TagroSubject
  /** Present when the selection sits inside an editable field. */
  editTarget: TagroEditTarget | null
}

function isEditableField(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
}

/** Reads the current selection, from both normal DOM and form fields. */
export function readSelection(): TagroSelectionInfo | null {
  if (typeof window === 'undefined') return null

  const active = document.activeElement
  if (isEditableField(active) && !active.readOnly && !active.disabled) {
    const start = active.selectionStart ?? 0
    const end = active.selectionEnd ?? 0
    if (end > start) {
      const text = active.value.slice(start, end)
      if (text.trim().length >= 2) {
        const rect = fieldSelectionRect(active)
        const subject = subjectFromElement(active) ?? { kind: 'text' as const }
        return {
          text,
          rect,
          subject: { ...subject, kind: subject.kind === 'page' ? 'text' : subject.kind, content: text, fromSelection: true },
          editTarget: { element: active, start, end, original: text },
        }
      }
    }
    return null
  }

  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  const text = selection.toString()
  if (text.trim().length < 2) return null

  const range = selection.getRangeAt(0)
  const anchor = range.commonAncestorContainer
  const anchorEl = anchor instanceof Element ? anchor : anchor.parentElement
  if (!anchorEl || isTagroOwnSurface(anchorEl)) return null

  const rect = range.getBoundingClientRect()
  if (!rect || (rect.width === 0 && rect.height === 0)) return null

  const declared = subjectFromElement(anchorEl)
  const editableHost = anchorEl.closest<HTMLElement>('[contenteditable="true"]')

  const subject: TagroSubject = {
    ...(declared ?? { kind: 'text' as const }),
    kind: !declared || declared.kind === 'page' ? 'text' : declared.kind,
    content: text,
    fromSelection: true,
  }

  return {
    text,
    rect,
    subject,
    editTarget: editableHost
      ? { element: editableHost, start: 0, end: text.length, original: text }
      : null,
  }
}

/**
 * Approximate the on-screen rect of a selection inside an input/textarea by
 * mirroring the field into a hidden clone and measuring the range there.
 */
function fieldSelectionRect(field: HTMLInputElement | HTMLTextAreaElement): DOMRect {
  const fieldRect = field.getBoundingClientRect()
  try {
    const style = window.getComputedStyle(field)
    const mirror = document.createElement('div')
    const copy = [
      'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
      'lineHeight', 'textTransform', 'textIndent',
    ] as const
    for (const prop of copy) mirror.style[prop as any] = style[prop as any]
    mirror.style.position = 'fixed'
    mirror.style.visibility = 'hidden'
    mirror.style.whiteSpace = field instanceof HTMLTextAreaElement ? 'pre-wrap' : 'pre'
    mirror.style.wordWrap = 'break-word'
    mirror.style.overflow = 'hidden'
    mirror.style.top = `${fieldRect.top}px`
    mirror.style.left = `${fieldRect.left}px`
    mirror.style.height = `${fieldRect.height}px`

    const start = field.selectionStart ?? 0
    const end = field.selectionEnd ?? 0
    const before = document.createTextNode(field.value.slice(0, start))
    const marker = document.createElement('span')
    marker.textContent = field.value.slice(start, end) || '.'
    mirror.appendChild(before)
    mirror.appendChild(marker)
    document.body.appendChild(mirror)

    const markerRect = marker.getBoundingClientRect()
    const scrolled = new DOMRect(
      markerRect.left,
      markerRect.top - field.scrollTop,
      markerRect.width,
      markerRect.height,
    )
    document.body.removeChild(mirror)

    // Keep the rect inside the visible field so the toolbar never floats away.
    if (scrolled.top < fieldRect.top - 4 || scrolled.bottom > fieldRect.bottom + 4) return fieldRect
    return scrolled
  } catch {
    return fieldRect
  }
}

/** Write text back into an editable target, preserving undo where possible. */
export function applyToEditTarget(target: TagroEditTarget, text: string): boolean {
  const el = target.element
  if (isEditableField(el)) {
    el.focus()
    el.setSelectionRange(target.start, target.end)
    // execCommand keeps the browser's native undo stack intact.
    const inserted = document.execCommand?.('insertText', false, text)
    if (!inserted) {
      const value = el.value
      el.value = value.slice(0, target.start) + text + value.slice(target.end)
      el.setSelectionRange(target.start, target.start + text.length)
    }
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }
  if (el.isContentEditable) {
    el.focus()
    const ok = document.execCommand?.('insertText', false, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return Boolean(ok)
  }
  return false
}
