'use client'

import { useEffect, useRef, useState } from 'react'

type UseTypewriterOptions = {
  start?: boolean
  speed?: number
  delay?: number
  onDone?: () => void
}

export function useTypewriter(
  text: string,
  { start = true, speed = 56, delay = 0, onDone }: UseTypewriterOptions = {},
) {
  const [value, setValue] = useState('')
  const [done, setDone] = useState(false)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    if (!start) {
      setValue('')
      setDone(false)
      return
    }

    let index = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    setValue('')
    setDone(false)

    const typeNext = () => {
      if (cancelled) return
      index += 1
      setValue(text.slice(0, index))

      if (index >= text.length) {
        setDone(true)
        onDoneRef.current?.()
        return
      }

      timeoutId = setTimeout(typeNext, speed)
    }

    timeoutId = setTimeout(typeNext, delay)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [delay, speed, start, text])

  return { value, done }
}
