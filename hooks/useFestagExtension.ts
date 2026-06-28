'use client'

import { useCallback, useEffect, useState } from 'react'

export type FestagExtensionState = 'checking' | 'missing' | 'installed'

export function useFestagExtension() {
  const [state, setState] = useState<FestagExtensionState>('checking')
  const [version, setVersion] = useState<string | null>(null)

  const ping = useCallback(() => {
    if (typeof window === 'undefined') return
    const domVersion = document.documentElement.dataset.festagExtension
    if (domVersion) {
      setState('installed')
      setVersion(domVersion)
      return
    }
    setState('checking')
    window.dispatchEvent(new CustomEvent('festag-extension-ping'))
    window.postMessage({ type: 'festag-extension-ping' }, window.location.origin)
    window.setTimeout(() => {
      setState((prev) => (prev === 'checking' ? 'missing' : prev))
    }, 500)
  }, [])

  useEffect(() => {
    function onPong(event: Event) {
      const detail = (event as CustomEvent<{ version?: string }>).detail
      if (detail?.version) {
        setState('installed')
        setVersion(detail.version)
      }
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'festag-extension-pong') return
      if (event.data?.version) {
        setState('installed')
        setVersion(String(event.data.version))
      }
    }

    window.addEventListener('festag-extension-pong', onPong)
    window.addEventListener('message', onMessage)
    ping()

    const timer = window.setTimeout(() => {
      setState((prev) => (prev === 'checking' ? 'missing' : prev))
    }, 500)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('festag-extension-pong', onPong)
      window.removeEventListener('message', onMessage)
    }
  }, [ping])

  return {
    state,
    version,
    installed: state === 'installed',
    checking: state === 'checking',
    ping,
  }
}
