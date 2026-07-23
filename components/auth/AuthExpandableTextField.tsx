'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'

const SURFACE_SEL = '.dl-panel, .al-signin, .al-mobile-sheet, .al-hero-copy, .dl-hero-copy'
const EXIT_MS = 160

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size'> & {
  /** Under-title compact input class (e.g. dl-ws-name-input). */
  inputClassName?: string
  /** Line wrapper class (e.g. dl-ws-name-line dl-ws-name-line--user). */
  lineClassName?: string
  /** Optional screen-reader label. */
  srLabel?: string
  /** After Enter while the tip is open / field focused. */
  onExpandEnter?: () => void
  /**
   * Leading `/` like AuthWorkspacePath. When set, value is muted Apple gray
   * while blurred and strong while focused for editing.
   */
  withSlash?: boolean
  /**
   * Keep a blinking idle caret after the value whenever the field is not focused
   * (mobile register workspace name). Sizes the input to its content.
   */
  persistIdleCaret?: boolean
}

function measureOverflow(el: HTMLInputElement | null): boolean {
  if (!el) return false
  return el.scrollWidth > el.clientWidth + 1
}

/**
 * Auth under-title text field with overflow info tip.
 * Typing always stays in the compact field. When the value clips, a small
 * borderless tip below shows the full name — dismiss via outside click / Esc.
 */
const AuthExpandableTextField = forwardRef<HTMLInputElement, Props>(
  function AuthExpandableTextField(
    {
      value,
      onChange,
      onInput,
      onFocus,
      onBlur,
      onKeyDown,
      inputClassName = '',
      lineClassName = '',
      srLabel,
      onExpandEnter,
      withSlash = false,
      persistIdleCaret = false,
      placeholder,
      ...rest
    },
    forwardedRef,
  ) {
    const compactRef = useRef<HTMLInputElement>(null)
    const wrapRef = useRef<HTMLLabelElement>(null)
    const tipRef = useRef<HTMLDivElement>(null)
    const openRef = useRef(false)
    const closingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const tipId = useId()

    const [open, setOpen] = useState(false)
    const [visible, setVisible] = useState(false)
    const [overflowing, setOverflowing] = useState(false)
    const [tipStyle, setTipStyle] = useState<CSSProperties>({})
    const [mounted, setMounted] = useState(false)
    const [tipDark, setTipDark] = useState(false)
    /** withSlash: hide leading `/` while focused (edit mode), show muted when settled. */
    const [pathFocused, setPathFocused] = useState(false)
    const [fieldFocused, setFieldFocused] = useState(false)
    const [fitWidth, setFitWidth] = useState<number | null>(null)

    const strValue = String(value ?? '')
    openRef.current = open

    const setCompactRef = useCallback(
      (el: HTMLInputElement | null) => {
        ;(compactRef as React.MutableRefObject<HTMLInputElement | null>).current = el
        if (typeof forwardedRef === 'function') {
          forwardedRef(el)
        } else if (forwardedRef) {
          ;(forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = el
        }
      },
      [forwardedRef],
    )

    useEffect(() => {
      setMounted(true)
    }, [])

    const placeTip = useCallback(() => {
      const wrap = wrapRef.current
      if (!wrap) return
      const surface = (wrap.closest(SURFACE_SEL) as HTMLElement | null) || wrap
      const root = wrap.closest('.al-root, .dl-root') as HTMLElement | null
      setTipDark(root?.getAttribute('data-theme') === 'dark')
      const s = surface.getBoundingClientRect()
      const field = wrap.getBoundingClientRect()
      const maxW = Math.min(Math.max(s.width, 240), window.innerWidth - 24)
      setTipStyle({
        position: 'fixed',
        left: s.left + s.width / 2,
        top: field.bottom + 10,
        maxWidth: maxW,
      })
    }, [])

    const checkOverflow = useCallback(() => {
      if (persistIdleCaret) {
        setOverflowing(false)
        return false
      }
      const next = measureOverflow(compactRef.current)
      setOverflowing(next)
      return next
    }, [persistIdleCaret])

    const fitContentWidth = useCallback(() => {
      if (!persistIdleCaret) {
        setFitWidth(null)
        return
      }
      const el = compactRef.current
      if (!el) return
      const prev = el.style.width
      el.style.width = '0'
      const next = Math.max(el.scrollWidth, 2)
      el.style.width = prev
      setFitWidth(next)
    }, [persistIdleCaret])

    useLayoutEffect(() => {
      fitContentWidth()
    }, [strValue, persistIdleCaret, fitContentWidth, fieldFocused])

    useEffect(() => {
      if (!persistIdleCaret) return
      const onResize = () => fitContentWidth()
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }, [persistIdleCaret, fitContentWidth])

    const finishClose = useCallback(() => {
      setOpen(false)
      setVisible(false)
    }, [])

    const closeTip = useCallback((immediate = false) => {
      if (closingTimer.current) {
        clearTimeout(closingTimer.current)
        closingTimer.current = null
      }
      if (!openRef.current) return
      if (immediate) {
        finishClose()
        return
      }
      setVisible(false)
      closingTimer.current = setTimeout(finishClose, EXIT_MS)
    }, [finishClose])

    const openTip = useCallback(() => {
      if (closingTimer.current) {
        clearTimeout(closingTimer.current)
        closingTimer.current = null
      }
      const overflow = checkOverflow()
      if (!overflow) return
      setOpen(true)
      requestAnimationFrame(() => {
        placeTip()
        setVisible(true)
      })
    }, [checkOverflow, placeTip])

    useLayoutEffect(() => {
      checkOverflow()
    }, [strValue, checkOverflow])

    useEffect(() => {
      if (!open) return
      placeTip()
      const onResize = () => placeTip()
      window.addEventListener('resize', onResize)
      window.addEventListener('scroll', onResize, true)
      return () => {
        window.removeEventListener('resize', onResize)
        window.removeEventListener('scroll', onResize, true)
      }
    }, [open, placeTip, strValue])

    useEffect(() => {
      if (!open) return
      function onDown(e: MouseEvent | TouchEvent) {
        const t = e.target
        if (!(t instanceof Node)) return
        if (tipRef.current?.contains(t)) return
        if (wrapRef.current?.contains(t)) return
        closeTip()
      }
      function onKey(e: globalThis.KeyboardEvent) {
        if (e.key === 'Escape') closeTip()
      }
      // pointerdown catches before focus moves — more reliable than mousedown alone.
      document.addEventListener('pointerdown', onDown, true)
      window.addEventListener('keydown', onKey)
      return () => {
        document.removeEventListener('pointerdown', onDown, true)
        window.removeEventListener('keydown', onKey)
      }
    }, [open, closeTip])

    useEffect(() => () => {
      if (closingTimer.current) clearTimeout(closingTimer.current)
    }, [])

    // Auto-close when the value fits again.
    useEffect(() => {
      if (!open) return
      if (!overflowing) closeTip()
    }, [overflowing, open, closeTip])

    const handleCompactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      requestAnimationFrame(() => {
        if (measureOverflow(compactRef.current)) openTip()
        else if (openRef.current) closeTip()
      })
    }

    const handleCompactFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (withSlash) setPathFocused(true)
      if (persistIdleCaret) setFieldFocused(true)
      onFocus?.(e)
      if (!persistIdleCaret && (overflowing || measureOverflow(compactRef.current))) openTip()
    }

    const handleCompactBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (withSlash) setPathFocused(false)
      if (persistIdleCaret) setFieldFocused(false)
      onBlur?.(e)
      const next = e.relatedTarget
      if (next instanceof Node && tipRef.current?.contains(next)) return
      if (next instanceof Node && wrapRef.current?.contains(next)) return
      window.setTimeout(() => {
        if (!openRef.current) return
        const active = document.activeElement
        if (active && wrapRef.current?.contains(active)) return
        closeTip()
      }, 120)
    }

    const handleCompactKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e)
      if (e.defaultPrevented) return
      if (e.key === 'Enter') {
        if (open) closeTip()
        onExpandEnter?.()
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        closeTip()
      }
    }

    const lineClass = [
      'auth-expand-line',
      withSlash ? 'auth-expand-line--slash' : '',
      withSlash && pathFocused ? 'auth-expand-line--slash-editing' : '',
      persistIdleCaret ? 'auth-expand-line--idle-caret' : '',
      lineClassName,
      strValue ? 'has-value' : '',
      overflowing && !open ? 'auth-expand-line--truncated' : '',
      open ? 'auth-expand-line--open' : '',
    ]
      .filter(Boolean)
      .join(' ')

    const inputClass = ['auth-expand-compact', inputClassName].filter(Boolean).join(' ')
    const showSlash = withSlash && !pathFocused
    const tipLabel = withSlash ? `/ ${strValue}` : strValue
    const showIdleCaret = persistIdleCaret && !fieldFocused

    return (
      <label ref={wrapRef} className={lineClass}>
        <style>{AUTH_EXPAND_CSS}</style>
        {srLabel ? <span className="sr-only">{srLabel}</span> : null}
        {showSlash ? (
          <span className="auth-expand-slash" aria-hidden="true">/</span>
        ) : null}
        <input
          {...rest}
          ref={setCompactRef}
          className={inputClass}
          value={strValue}
          placeholder={placeholder}
          onChange={handleCompactChange}
          onInput={onInput}
          onFocus={handleCompactFocus}
          onBlur={handleCompactBlur}
          onKeyDown={handleCompactKeyDown}
          aria-expanded={open}
          aria-describedby={open ? tipId : undefined}
          style={
            persistIdleCaret && fitWidth != null
              ? { width: fitWidth, maxWidth: '100%' }
              : undefined
          }
        />
        {showIdleCaret ? (
          <i className="auth-expand-idle-caret" aria-hidden="true" />
        ) : null}
        {mounted && open
          ? createPortal(
              <div
                ref={tipRef}
                id={tipId}
                className={`auth-expand-tip${visible ? ' is-visible' : ''}${tipDark ? ' auth-expand-tip--dark' : ''}`}
                style={tipStyle}
                role="status"
                aria-live="polite"
                aria-label={srLabel || rest['aria-label'] || 'Vollständiger Name'}
              >
                <p className="auth-expand-tip-text">{tipLabel}</p>
              </div>,
              document.body,
            )
          : null}
      </label>
    )
  },
)

export default AuthExpandableTextField

const AUTH_EXPAND_CSS = `
  .auth-expand-line {
    position: relative;
    display: block;
    width: 100%;
    min-height: var(--al-hero-display-lh, 39px);
    margin: 6px 0 0;
    pointer-events: auto;
    overflow: visible;
    font-size: var(--al-hero-display-size, 32px) !important;
    line-height: var(--al-hero-display-lh, 39px) !important;
    font-weight: 400 !important;
  }
  .auth-expand-line--slash {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .auth-expand-slash {
    flex-shrink: 0;
    font-family: inherit;
    font-size: var(--al-hero-display-size, 32px) !important;
    line-height: var(--al-hero-display-lh, 39px) !important;
    letter-spacing: -0.025em;
    font-weight: 400 !important;
    color: var(--al-text-muted, var(--dl-text-muted, #8891a0));
    user-select: none;
  }
  .auth-expand-line--slash .auth-expand-compact {
    flex: 1;
    min-width: 0;
  }
  /* Path-like: muted when settled, strong while editing */
  .auth-expand-line--slash.has-value:not(:focus-within) .auth-expand-compact {
    color: var(--al-text-muted, var(--dl-text-muted, #8891a0));
  }
  .auth-expand-line--slash:focus-within .auth-expand-compact {
    color: #1e1e20;
  }
  .auth-expand-compact {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--al-hero-display-size, 32px) !important;
    line-height: var(--al-hero-display-lh, 39px) !important;
    font-weight: 400 !important;
    letter-spacing: -0.025em;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  .auth-expand-line--idle-caret {
    display: inline-flex;
    align-items: center;
    width: auto;
    max-width: 100%;
    overflow: visible;
  }
  .auth-expand-line--idle-caret .auth-expand-compact {
    overflow: visible;
    text-overflow: clip;
    flex: 0 1 auto;
    min-width: 2px;
    max-width: 100%;
  }
  .auth-expand-idle-caret {
    flex-shrink: 0;
    display: block;
    width: 2px !important;
    max-width: 2px;
    height: var(--al-hero-caret-h, var(--al-hero-display-size, 32px)) !important;
    min-height: var(--al-hero-caret-h, var(--al-hero-display-size, 32px)) !important;
    margin-left: 1px;
    border-radius: 0;
    background: #5B647D;
    animation: authExpandCaretBlink 1.05s steps(1, end) infinite;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: var(--al-hero-display-size, 32px) !important;
    font-style: normal;
    font-weight: 400;
    pointer-events: none;
    box-sizing: border-box;
    align-self: center;
  }
  .al-root[data-theme="dark"] .auth-expand-idle-caret,
  .dl-root[data-theme="dark"] .auth-expand-idle-caret {
    background: rgba(198, 206, 222, 0.78);
  }
  @keyframes authExpandCaretBlink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
  /* Info tip — below field, no stroke, soft lift only. */
  .auth-expand-tip {
    z-index: 80;
    box-sizing: border-box;
    padding: 10px 14px;
    border-radius: 12px;
    border: 0;
    background: #ffffff;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 10px 28px rgba(15, 23, 42, 0.10);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    transform: translateX(-50%) translateY(-4px);
    opacity: 0;
    width: max-content;
    max-width: calc(100vw - 24px);
    pointer-events: auto;
    transition: opacity ${EXIT_MS}ms cubic-bezier(.16,1,.3,1), transform ${EXIT_MS}ms cubic-bezier(.16,1,.3,1);
  }
  .auth-expand-tip.is-visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  .auth-expand-tip-text {
    margin: 0;
    color: #1e1e20;
    font-size: 14px;
    line-height: 1.4;
    letter-spacing: -0.012em;
    font-weight: 400;
    white-space: nowrap;
    overflow-x: auto;
    max-width: min(420px, calc(100vw - 48px));
  }
  @media (max-width: 768px) {
    /* Inherit H1/display size from .al-root --al-hero-display-* (do not downsize). */
    .auth-expand-slash,
    .auth-expand-compact,
    .auth-expand-line {
      font-size: var(--al-hero-display-size, 32px) !important;
      line-height: var(--al-hero-display-lh, 38px) !important;
      letter-spacing: -0.025em;
    }
    .auth-expand-idle-caret {
      height: var(--al-hero-caret-h, var(--al-hero-display-size, 32px)) !important;
      min-height: var(--al-hero-caret-h, var(--al-hero-display-size, 32px)) !important;
      font-size: var(--al-hero-display-size, 32px) !important;
    }
  }
  .al-root[data-theme="dark"] .auth-expand-tip,
  .dl-root[data-theme="dark"] .auth-expand-tip,
  .auth-expand-tip--dark {
    background: var(--festag-black-popup, #121214);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.35),
      0 14px 36px rgba(0, 0, 0, 0.45);
  }
  .al-root[data-theme="dark"] .auth-expand-tip-text,
  .dl-root[data-theme="dark"] .auth-expand-tip-text,
  .auth-expand-tip--dark .auth-expand-tip-text {
    color: var(--festag-input-fg, rgba(232, 236, 242, 0.94));
  }
  .al-root:not([data-theme="dark"]) .auth-expand-slash,
  .dl-root:not([data-theme="dark"]) .auth-expand-slash {
    color: #8891a0 !important;
  }
  .al-root[data-theme="dark"] .auth-expand-slash,
  .dl-root[data-theme="dark"] .auth-expand-slash {
    color: rgba(245, 245, 247, 0.55) !important;
  }
  .al-root:not([data-theme="dark"]) .auth-expand-line--slash.has-value:not(:focus-within) .auth-expand-compact,
  .dl-root:not([data-theme="dark"]) .auth-expand-line--slash.has-value:not(:focus-within) .auth-expand-compact {
    color: #8891a0 !important;
  }
  .al-root[data-theme="dark"] .auth-expand-line--slash.has-value:not(:focus-within) .auth-expand-compact,
  .dl-root[data-theme="dark"] .auth-expand-line--slash.has-value:not(:focus-within) .auth-expand-compact {
    color: rgba(245, 245, 247, 0.55) !important;
  }
  .al-root[data-theme="dark"] .auth-expand-line--slash:focus-within .auth-expand-compact,
  .dl-root[data-theme="dark"] .auth-expand-line--slash:focus-within .auth-expand-compact {
    color: var(--festag-input-fg, rgba(232, 236, 242, 0.94));
  }
`
