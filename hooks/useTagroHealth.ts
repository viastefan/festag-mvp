'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FESTAG_CHROME_EXTENSION } from '@/lib/extension/chrome-extension'
import { isExtensionVersionCurrent } from '@/lib/extension/tagro-setup'
import { useFestagExtension } from '@/hooks/useFestagExtension'

type SessionPayload = {
  ok?: boolean
  user?: { id: string; email?: string | null }
  backendReady?: boolean
}

export function useTagroHealth() {
  const { state, version, installed, checking, ping } = useFestagExtension()
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)

  const refreshSession = useCallback(async () => {
    setSessionLoading(true)
    try {
      const res = await fetch('/api/extension/session', { credentials: 'include' })
      const data = (await res.json()) as SessionPayload
      if (res.ok && data.ok) {
        setSession(data)
      } else {
        setSession({ ok: false })
      }
    } catch {
      setSession({ ok: false })
    } finally {
      setSessionLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!installed) {
      setSession(null)
      return
    }
    void refreshSession()
  }, [installed, refreshSession])

  const sessionOk = session?.ok === true
  const backendReady = sessionOk ? session?.backendReady === true : null
  const userEmail = sessionOk ? session?.user?.email ?? null : null
  const versionCurrent = isExtensionVersionCurrent(version)

  const ready = installed && sessionOk && backendReady === true && versionCurrent

  const checklist = useMemo(() => {
    const items = [
      {
        id: 'extension',
        label: 'Chrome-Erweiterung installiert',
        detail: installed
          ? version
            ? `Version ${version}${versionCurrent ? '' : ` — neuere Version ${FESTAG_CHROME_EXTENSION.version} verfügbar`}`
            : 'Erkannt'
          : 'ZIP laden, in Chrome entpacken und Ordner laden',
        done: installed,
        action: !installed
          ? { label: 'Erweiterung laden', href: FESTAG_CHROME_EXTENSION.downloadPath }
          : !versionCurrent
            ? { label: 'Update laden', href: FESTAG_CHROME_EXTENSION.downloadPath }
            : undefined,
      },
      {
        id: 'login',
        label: 'Bei Festag angemeldet',
        detail: sessionOk
          ? userEmail ?? 'Verbunden'
          : 'Im selben Chrome-Profil bei festag.app einloggen',
        done: sessionOk,
        action: !sessionOk
          ? { label: 'Anmelden', href: '/login?returnTo=/settings/apps' }
          : undefined,
      },
      {
        id: 'backend',
        label: 'KI-Backend bereit',
        detail: backendReady === true
          ? 'Schreibhilfe und Live-Feedback sind einsatzbereit'
          : backendReady === false
            ? 'Backend noch nicht bereit — kurz warten oder Support kontaktieren'
            : sessionLoading
              ? 'Wird geprüft…'
              : 'Nach Anmeldung automatisch geprüft',
        done: backendReady === true,
      },
      {
        id: 'test',
        label: 'Auf Testseite ausprobiert',
        detail: 'Beliebige Seite mit F5 neu laden, Text markieren oder Feld fokussieren',
        done: false,
      },
    ]
    return items
  }, [installed, version, versionCurrent, sessionOk, userEmail, backendReady, sessionLoading])

  function refreshAll() {
    ping()
    if (installed) void refreshSession()
  }

  return {
    state,
    version,
    installed,
    checking,
    sessionOk,
    backendReady,
    userEmail,
    versionCurrent,
    ready,
    checklist,
    sessionLoading,
    ping,
    refreshSession,
    refreshAll,
  }
}
