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

const IDLE_CLOSE_MS = 5000
const SURFACE_SEL = '.dl-panel, .al-signin, .al-mobile-sheet'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size'> & {
  /** Under-title compact input class (e.g. dl-ws-name-input). */
  inputClassName?: string
  /** Line wrapper class (e.g. dl-ws-name-line dl-ws-name-line--user). */
  lineClassName?: string
  /** Optional screen-reader label. */
  srLabel?: string
  /** After Enter closes the expand popup. */
  onExpandEnter?: () => void
  /**
   * Leading `/` like AuthWorkspacePath. When set, value is muted Apple gray
   * while blurred and strong while focused for editing.
   */
  withSlash?: boolean
}

function measureOverflow(el: HTMLInputElement | null): boolean {
  if (!el) return false
  return el.scrollWidth > el.clientWidth + 1
}

/**
 * Auth under-title text field with overflow expand popup.
 * When the compact 32px field clips, a centered horizontal popup lets the user
 * keep typing the full value; after close the compact field shows ellipsis again.
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
      placeholder,
      ...rest
    },
    forwardedRef,
  ) {
    const compactRef = useRef<HTMLInputElement>(null)
    const expandRef = useRef<HTMLInputElement>(null)
    const wrapRef = useRef<HTMLLabelElement>(null)
    const popRef = useRef<HTMLDivElement>(null)
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const dismissedRef = useRef(false)
    const openRef = useRef(false)
    const popId = useId()

    const [open, setOpen] = useState(false)
    const [overflowing, setOverflowing] = useState(false)
    const [popStyle, setPopStyle] = useState<CSSProperties>({})
    const [mounted, setMounted] = useState(false)

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

    const clearIdle = useCallback(() => {
      if (idleTimer.current) {
        clearTimeout(idleTimer.current)
        idleTimer.current = null
      }
    }, [])

    const closeExpand = useCallback(() => {
      clearIdle()
      setOpen(false)
      dismissedRef.current = true
      requestAnimationFrame(() => {
        const el = compactRef.current
        if (!el) return
        el.focus({ preventScroll: true })
        const len = el.value.length
        try {
          el.setSelectionRange(len, len)
        } catch {
          /* noop */
        }
      })
    }, [clearIdle])

    const bumpIdle = useCallback(() => {
      clearIdle()
      if (!openRef.current) return
      idleTimer.current = setTimeout(() => {
        closeExpand()
      }, IDLE_CLOSE_MS)
    }, [clearIdle, closeExpand])

    const placePopup = useCallback(() => {
      const wrap = wrapRef.current
      if (!wrap) return
      const surface = (wrap.closest(SURFACE_SEL) as HTMLElement | null) || wrap
      const s = surface.getBoundingClientRect()
      const maxW = Math.min(Math.max(s.width + 48, 300), window.innerWidth - 24)
      const fieldTop = wrap.getBoundingClientRect().top
      setPopStyle({
        position: 'fixed',
        left: s.left + s.width / 2,
        top: Math.max(12, fieldTop - 4),
        maxWidth: maxW,
        minWidth: Math.min(s.width, maxW),
      })
    }, [])

    const checkOverflow = useCallback(() => {
      const next = measureOverflow(compactRef.current)
      setOverflowing(next)
      return next
    }, [])

    useLayoutEffect(() => {
      checkOverflow()
    }, [strValue, checkOverflow, open])

    useEffect(() => {
      if (!open) return
      placePopup()
      const onResize = () => placePopup()
      window.addEventListener('resize', onResize)
      window.addEventListener('scroll', onResize, true)
      return () => {
        window.removeEventListener('resize', onResize)
        window.removeEventListener('scroll', onResize, true)
      }
    }, [open, placePopup, strValue])

    useEffect(() => {
      if (!open) {
        clearIdle()
        return
      }
      bumpIdle()
      const t = window.setTimeout(() => {
        const el = expandRef.current
        if (!el) return
        el.focus({ preventScroll: true })
        const len = el.value.length
        try {
          el.setSelectionRange(len, len)
        } catch {
          /* noop */
        }
      }, 16)
      return () => window.clearTimeout(t)
    }, [open, bumpIdle, clearIdle])

    useEffect(() => {
      if (!open) return
      function onDown(e: MouseEvent | TouchEvent) {
        const t = e.target
        if (!(t instanceof Node)) return
        if (popRef.current?.contains(t)) return
        if (wrapRef.current?.contains(t)) return
        closeExpand()
      }
      document.addEventListener('mousedown', onDown)
      document.addEventListener('touchstart', onDown, { passive: true })
      return () => {
        document.removeEventListener('mousedown', onDown)
        document.removeEventListener('touchstart', onDown)
      }
    }, [open, closeExpand])

    useEffect(() => () => clearIdle(), [clearIdle])

    const openExpand = useCallback(
      (force = false) => {
        const overflow = checkOverflow()
        if (!overflow && !force) return
        if (dismissedRef.current && !force) return
        dismissedRef.current = false
        setOpen(true)
      },
      [checkOverflow],
    )

    const handleCompactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      dismissedRef.current = false
      onChange?.(e)
      requestAnimationFrame(() => {
        if (measureOverflow(compactRef.current)) openExpand()
      })
    }

    const handleExpandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      bumpIdle()
      onChange?.(e)
    }

    const handleCompactFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      onFocus?.(e)
      if (overflowing || measureOverflow(compactRef.current)) {
        openExpand(true)
      }
    }

    const handleCompactKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e)
      if (e.defaultPrevented) return
      if (e.key === 'Enter' && open) {
        e.preventDefault()
        closeExpand()
        onExpandEnter?.()
      }
    }

    const handleExpandKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      bumpIdle()
      if (e.key === 'Enter') {
        e.preventDefault()
        closeExpand()
        onExpandEnter?.()
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        closeExpand()
        return
      }
      onKeyDown?.(e)
    }

    const handleExpandBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const next = e.relatedTarget
      if (next instanceof Node && popRef.current?.contains(next)) return
      window.setTimeout(() => {
        if (!openRef.current) return
        const active = document.activeElement
        if (active && popRef.current?.contains(active)) return
        closeExpand()
      }, 0)
    }

    const lineClass = [
      'auth-expand-line',
      withSlash ? 'auth-expand-line--slash' : '',
      lineClassName,
      strValue ? 'has-value' : '',
      overflowing && !open ? 'auth-expand-line--truncated' : '',
      open ? 'auth-expand-line--open' : '',
    ]
      .filter(Boolean)
      .join(' ')

    const inputClass = ['auth-expand-compact', inputClassName].filter(Boolean).join(' ')
    const ch = Math.max(12, strValue.length + 2)

    return (
      <label ref={wrapRef} className={lineClass}>
        <style>{AUTH_EXPAND_CSS}</style>
        {srLabel ? <span className="sr-only">{srLabel}</span> : null}
        {withSlash ? (
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
          onBlur={onBlur}
          onKeyDown={handleCompactKeyDown}
          aria-expanded={open}
          aria-controls={open ? popId : undefined}
        />
        {mounted && open
          ? createPortal(
              <div
                ref={popRef}
                id={popId}
                className="auth-expand-pop"
                style={popStyle}
                role="dialog"
                aria-label={srLabel || rest['aria-label'] || 'Text erweitern'}
              >
                {withSlash ? (
                  <span className="auth-expand-slash auth-expand-slash--pop" aria-hidden="true">/</span>
                ) : null}
                <input
                  ref={expandRef}
                  className="auth-expand-pop-input"
                  style={{ width: `${ch}ch` }}
                  type={rest.type || 'text'}
                  value={strValue}
                  placeholder={placeholder}
                  onChange={handleExpandChange}
                  onInput={e => {
                    bumpIdle()
                    onInput?.(e)
                  }}
                  onKeyDown={handleExpandKeyDown}
                  onBlur={handleExpandBlur}
                  spellCheck={rest.spellCheck}
                  autoCapitalize={rest.autoCapitalize as string | undefined}
                  autoComplete={rest.autoComplete}
                  autoCorrect={rest.autoCorrect as string | undefined}
                  maxLength={rest.maxLength}
                  inputMode={rest.inputMode}
                  aria-label={rest['aria-label']}
                  disabled={rest.disabled}
                  name={rest.name ? `${rest.name}-expand` : undefined}
                />
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
    min-height: 39px;
    margin: 6px 0 0;
    pointer-events: auto;
  }
  .auth-expand-line--slash {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .auth-expand-slash {
    flex-shrink: 0;
    font-family: inherit;
    font-size: 32px;
    line-height: 39px;
    letter-spacing: -0.025em;
    font-weight: 400;
    color: var(--al-text-muted, var(--dl-text-muted, #8891a0));
    user-select: none;
  }
  .auth-expand-slash--pop {
    font-size: 18px;
    line-height: 1.35;
    letter-spacing: -0.02em;
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
  }
  .auth-expand-pop {
    z-index: 80;
    box-sizing: border-box;
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 14px;
    border: 1px solid rgba(210, 210, 215, 0.9);
    background: #ffffff;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    transform: translateX(-50%);
    animation: authExpandPop .2s cubic-bezier(.16,1,.3,1) both;
    width: max-content;
  }
  .auth-expand-pop-input {
    display: block;
    max-width: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: #1e1e20;
    caret-color: #5B647D;
    font-family: inherit;
    font-size: 18px;
    line-height: 1.35;
    letter-spacing: -0.02em;
    font-weight: 400;
    white-space: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    text-overflow: clip;
    box-shadow: none;
    -webkit-appearance: none;
    appearance: none;
  }
  @keyframes authExpandPop {
    from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.98); }
    to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  }
  @media (max-width: 768px) {
    .auth-expand-slash {
      font-size: 24px;
      line-height: 30px;
      letter-spacing: -0.025em;
    }
  }
  [data-theme="dark"] .auth-expand-pop,
  .al-root[data-theme="dark"] .auth-expand-pop,
  .dl-root[data-theme="dark"] .auth-expand-pop {
    background: var(--festag-black-popup, #121214);
    border-color: transparent;
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.5);
  }
  [data-theme="dark"] .auth-expand-pop-input,
  .al-root[data-theme="dark"] .auth-expand-pop-input,
  .dl-root[data-theme="dark"] .auth-expand-pop-input {
    color: #f5f5f7;
    caret-color: rgba(245, 245, 247, 0.45);
  }
  [data-theme="dark"] .auth-expand-slash,
  .al-root[data-theme="dark"] .auth-expand-slash,
  .dl-root[data-theme="dark"] .auth-expand-slash {
    color: var(--al-text-muted, var(--dl-text-muted, #9aa3b5));
  }
  [data-theme="dark"] .auth-expand-line--slash.has-value:not(:focus-within) .auth-expand-compact,
  .al-root[data-theme="dark"] .auth-expand-line--slash.has-value:not(:focus-within) .auth-expand-compact,
  .dl-root[data-theme="dark"] .auth-expand-line--slash.has-value:not(:focus-within) .auth-expand-compact {
    color: var(--al-text-muted, var(--dl-text-muted, #9aa3b5));
  }
  [data-theme="dark"] .auth-expand-line--slash:focus-within .auth-expand-compact,
  .al-root[data-theme="dark"] .auth-expand-line--slash:focus-within .auth-expand-compact,
  .dl-root[data-theme="dark"] .auth-expand-line--slash:focus-within .auth-expand-compact {
    color: #f5f5f7;
  }
`
