'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
  length?: number
  'aria-label'?: string
}

export type AuthOtpInputHandle = {
  focus: () => void
}

function onlyDigits(raw: string, max: number) {
  return String(raw || '').replace(/\D/g, '').slice(0, max)
}

const AuthOtpInput = forwardRef<AuthOtpInputHandle, Props>(function AuthOtpInput(
  {
    value,
    onChange,
    onComplete,
    disabled = false,
    autoFocus = false,
    length = 6,
    'aria-label': ariaLabel = 'Bestätigungscode',
  },
  ref,
) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const code = onlyDigits(value, length)

  useImperativeHandle(ref, () => ({
    focus: () => {
      refs.current[0]?.focus()
    },
  }))

  useEffect(() => {
    if (!autoFocus) return
    const t = window.setTimeout(() => refs.current[0]?.focus(), 40)
    return () => window.clearTimeout(t)
  }, [autoFocus])

  function commit(next: string, focusIndex: number) {
    const cleaned = onlyDigits(next, length)
    onChange(cleaned)
    if (cleaned.length === length) onComplete?.(cleaned)
    requestAnimationFrame(() => {
      refs.current[Math.max(0, Math.min(focusIndex, length - 1))]?.focus()
    })
  }

  function onDigitChange(index: number, raw: string) {
    const incoming = onlyDigits(raw, length)
    if (incoming.length > 1) {
      commit(incoming, Math.min(incoming.length, length - 1))
      return
    }
    const digit = incoming.slice(-1)
    const chars = Array.from({ length }, (_, i) => code[i] || '')
    chars[index] = digit
    const next = chars.join('')
    commit(next, digit ? index + 1 : index)
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const chars = Array.from({ length }, (_, i) => code[i] || '')
      if (chars[index]) {
        chars[index] = ''
        commit(chars.join(''), index)
      } else if (index > 0) {
        chars[index - 1] = ''
        commit(chars.join(''), index - 1)
      }
      return
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      refs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      refs.current[index + 1]?.focus()
    }
    if (e.key === 'Enter' && code.length === length) {
      onComplete?.(code)
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = onlyDigits(e.clipboardData.getData('text'), length)
    commit(pasted, Math.min(Math.max(pasted.length - 1, 0), length - 1))
  }

  return (
    <div className="al-otp" role="group" aria-label={ariaLabel}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          className="al-otp-cell"
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? length : 1}
          disabled={disabled}
          value={code[i] || ''}
          aria-label={`Ziffer ${i + 1} von ${length}`}
          onChange={e => onDigitChange(i, e.target.value)}
          onKeyDown={e => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={e => e.currentTarget.select()}
        />
      ))}
    </div>
  )
})

export default AuthOtpInput
