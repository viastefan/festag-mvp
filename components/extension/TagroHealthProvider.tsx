'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  buildTagroChecklist,
  computeTagroReady,
  isExtensionVersionCurrent,
  parseExtensionDataset,
  type BackendState,
  type ExtensionSessionState,
  type TagroHealthSnapshot,
} from '@/lib/extension/tagro-health-logic'

type BrowserSession = {
  ok: boolean
  email: string | null
  backendReady: boolean | null
}

type FestagExtensionState = 'checking' | 'missing' | 'installed'

type TagroHealthContextValue = {
  state: FestagExtensionState
  version: string | null
  installed: boolean
  checking: boolean
  sessionLoading: boolean
  browserSessionOk: boolean
  browserBackendReady: boolean | null
  browserUserEmail: string | null
  extensionSessionOk: boolean | null
  extensionBackendReady: boolean | null
  extensionUserEmail: string | null
  versionCurrent: boolean
  ready: boolean
  snapshot: TagroHealthSnapshot
  checklist: ReturnType<typeof buildTagroChecklist>
  ping: () => void
  refreshAll: () => void
}

export const TagroHealthContext = createContext<TagroHealthContextValue | null>(null)

function readExtensionFromDom() {
  if (typeof document === 'undefined') {
    return {
      state: 'checking' as const,
      version: null as string | null,
      session: 'unknown' as ExtensionSessionState,
      backend: 'unknown' as BackendState,
      email: null as string | null,
    }
  }
  const parsed = parseExtensionDataset()
  const installed = Boolean(parsed.version)
  return {
    state: installed ? ('installed' as const) : ('missing' as const),
    version: parsed.version,
    session: parsed.session,
    backend: parsed.backend,
    email: parsed.email,
  }
}

function sessionOkFromDom(session: ExtensionSessionState) {
  if (session === 'ok') return true
  if (session === 'fail') return false
  return null
}

function backendOkFromDom(backend: BackendState) {
  if (backend === 'ready') return true
  if (backend === 'fail') return false
  return null
}

export function TagroHealthProvider({ children }: { children: ReactNode }) {
  const [extensionState, setExtensionState] = useState<FestagExtensionState>('checking')
  const [version, setVersion] = useState<string | null>(null)
  const [extensionSessionOk, setExtensionSessionOk] = useState<boolean | null>(null)
  const [extensionBackendReady, setExtensionBackendReady] = useState<boolean | null>(null)
  const [extensionUserEmail, setExtensionUserEmail] = useState<string | null>(null)
  const [browserSession, setBrowserSession] = useState<BrowserSession>({
    ok: false,
    email: null,
    backendReady: null,
  })
  const [sessionLoading, setSessionLoading] = useState(true)

  const applyDomState = useCallback((dom = readExtensionFromDom()) => {
    if (dom.version) {
      setExtensionState('installed')
      setVersion(dom.version)
    } else {
      setExtensionState('missing')
      setVersion(null)
      setExtensionSessionOk(null)
      setExtensionBackendReady(null)
      setExtensionUserEmail(null)
      return
    }
    setExtensionSessionOk(sessionOkFromDom(dom.session))
    setExtensionBackendReady(backendOkFromDom(dom.backend))
    setExtensionUserEmail(dom.email)
  }, [])

  const refreshBrowserSession = useCallback(async () => {
    setSessionLoading(true)
    try {
      const res = await fetch('/api/extension/session', { credentials: 'include' })
      const data = await res.json()
      if (res.ok && data.ok) {
        setBrowserSession({
          ok: true,
          email: data.user?.email ?? null,
          backendReady: data.backendReady === true ? true : data.backendReady === false ? false : null,
        })
      } else {
        setBrowserSession({ ok: false, email: null, backendReady: null })
      }
    } catch {
      setBrowserSession({ ok: false, email: null, backendReady: null })
    } finally {
      setSessionLoading(false)
    }
  }, [])

  const ping = useCallback(() => {
    applyDomState()
    const dom = readExtensionFromDom()
    if (dom.version) {
      setExtensionState('installed')
      setVersion(dom.version)
      setExtensionSessionOk(sessionOkFromDom(dom.session))
      setExtensionBackendReady(backendOkFromDom(dom.backend))
      setExtensionUserEmail(dom.email)
      return
    }

    setExtensionState('checking')
    window.dispatchEvent(new CustomEvent('festag-extension-ping'))
    window.postMessage({ type: 'festag-extension-ping' }, window.location.origin)

    window.setTimeout(() => {
      applyDomState()
      setExtensionState((prev) => {
        const next = readExtensionFromDom()
        return next.version ? 'installed' : prev === 'checking' ? 'missing' : prev
      })
    }, 800)
  }, [applyDomState])

  const refreshAll = useCallback(() => {
    ping()
    void refreshBrowserSession()
  }, [ping, refreshBrowserSession])

  useEffect(() => {
    function onPong(event: Event) {
      const detail = (event as CustomEvent<{
        version?: string | null
        session?: ExtensionSessionState
        backend?: BackendState
        email?: string | null
      }>).detail
      if (detail?.version) {
        setExtensionState('installed')
        setVersion(detail.version)
      }
      if (detail?.session) {
        setExtensionSessionOk(sessionOkFromDom(detail.session))
      }
      if (detail?.backend) {
        setExtensionBackendReady(backendOkFromDom(detail.backend))
      }
      if (detail?.email !== undefined) {
        setExtensionUserEmail(detail.email)
      }
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'festag-extension-pong') return
      onPong(new CustomEvent('festag-extension-pong', { detail: event.data }))
    }

    const observer = new MutationObserver(() => {
      applyDomState()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'data-festag-extension',
        'data-festag-extension-session',
        'data-festag-extension-backend',
        'data-festag-extension-email',
      ],
    })

    window.addEventListener('festag-extension-pong', onPong)
    window.addEventListener('message', onMessage)

    applyDomState()
    ping()
    void refreshBrowserSession()

    const timer = window.setTimeout(() => {
      applyDomState()
      setExtensionState((prev) => {
        const dom = readExtensionFromDom()
        return dom.version ? 'installed' : prev === 'checking' ? 'missing' : prev
      })
    }, 800)

    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
      window.removeEventListener('festag-extension-pong', onPong)
      window.removeEventListener('message', onMessage)
    }
  }, [applyDomState, ping, refreshBrowserSession])

  const installed = extensionState === 'installed'
  const checking = extensionState === 'checking'
  const versionCurrent = isExtensionVersionCurrent(version)

  const snapshot = useMemo<TagroHealthSnapshot>(() => ({
    installed,
    version,
    versionCurrent,
    browserSessionOk: browserSession.ok,
    browserBackendReady: browserSession.backendReady,
    browserUserEmail: browserSession.email,
    extensionSessionOk,
    extensionBackendReady,
    extensionUserEmail,
  }), [
    installed,
    version,
    versionCurrent,
    browserSession,
    extensionSessionOk,
    extensionBackendReady,
    extensionUserEmail,
  ])

  const checklist = useMemo(
    () => buildTagroChecklist(snapshot, sessionLoading),
    [snapshot, sessionLoading],
  )

  const ready = computeTagroReady(snapshot)

  const value: TagroHealthContextValue = {
    state: extensionState,
    version,
    installed,
    checking,
    sessionLoading,
    browserSessionOk: browserSession.ok,
    browserBackendReady: browserSession.backendReady,
    browserUserEmail: browserSession.email,
    extensionSessionOk,
    extensionBackendReady,
    extensionUserEmail,
    versionCurrent,
    ready,
    snapshot,
    checklist,
    ping,
    refreshAll,
  }

  return (
    <TagroHealthContext.Provider value={value}>
      {children}
    </TagroHealthContext.Provider>
  )
}

export function useTagroHealth() {
  const ctx = useContext(TagroHealthContext)
  if (!ctx) {
    throw new Error('useTagroHealth must be used within TagroHealthProvider')
  }
  return ctx
}

/** Sidebar / standalone surfaces without provider — lightweight install detection only. */
export function useFestagExtensionLite() {
  const [state, setState] = useState<FestagExtensionState>('checking')
  const [version, setVersion] = useState<string | null>(null)

  const ping = useCallback(() => {
    const dom = readExtensionFromDom()
    if (dom.version) {
      setState('installed')
      setVersion(dom.version)
      return
    }
    setState('checking')
    window.dispatchEvent(new CustomEvent('festag-extension-ping'))
    window.postMessage({ type: 'festag-extension-ping' }, window.location.origin)
    window.setTimeout(() => {
      const next = readExtensionFromDom()
      setState(next.version ? 'installed' : 'missing')
      setVersion(next.version)
    }, 800)
  }, [])

  useEffect(() => {
    function onPong(event: Event) {
      const detail = (event as CustomEvent<{ version?: string }>).detail
      if (detail?.version) {
        setState('installed')
        setVersion(detail.version)
      }
    }
    window.addEventListener('festag-extension-pong', onPong)
    ping()
    const timer = window.setTimeout(() => {
      const dom = readExtensionFromDom()
      setState(dom.version ? 'installed' : 'missing')
      setVersion(dom.version)
    }, 800)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('festag-extension-pong', onPong)
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
