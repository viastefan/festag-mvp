export type DevSession = {
  user_id: string
  user_email?: string
  user_name?: string
  user_role?: string
  workspace_name?: string | null
  access_mode?: 'pool' | 'closed' | 'company' | string
  /** Unix ms — omit or far-future means remember until storage cleared. */
  expires?: number
}

export function getStoredDevSession(): DevSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem('festag_dev_session')
    if (!raw) return null
    const session = JSON.parse(raw) as DevSession
    if (!session?.user_id) return null
    if (session.expires && Date.now() > session.expires) {
      window.localStorage.removeItem('festag_dev_session')
      return null
    }
    return session
  } catch {
    return null
  }
}

export function clearStoredDevSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('festag_dev_session')
}

export function storeDevSession(session: DevSession) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem('festag_dev_session', JSON.stringify(session))
  } catch { /* noop */ }
}

export function devDisplayName(session?: DevSession | null) {
  if (!session) return 'Developer'
  return session.workspace_name || session.user_name || session.user_email?.split('@')[0] || 'Developer'
}
