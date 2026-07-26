/**
 * Persistent remember-me for Dev Panel PIN logins (until browser storage is cleared).
 */

const DEV_MEMORY_KEY = 'festag_dev_device_memory'
const DEV_LAST_USERNAME_KEY = 'festag_dev_last_username'
const DEV_LAST_WORKSPACE_KEY = 'festag_dev_last_workspace_name'

export type DevDeviceMemory = {
  username: string
  workspaceName: string | null
  userId: string | null
  rememberedAt: string
}

export function rememberDevDevice(account: {
  username: string
  workspaceName?: string | null
  userId?: string | null
}) {
  if (typeof window === 'undefined') return
  const username = String(account.username || '').trim().toLowerCase()
  if (!username) return
  const workspaceName = String(account.workspaceName || '').trim() || null
  const payload: DevDeviceMemory = {
    username,
    workspaceName,
    userId: account.userId ?? null,
    rememberedAt: new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(DEV_MEMORY_KEY, JSON.stringify(payload))
    window.localStorage.setItem(DEV_LAST_USERNAME_KEY, username)
    if (workspaceName) window.localStorage.setItem(DEV_LAST_WORKSPACE_KEY, workspaceName)
  } catch { /* noop */ }
}

export function getRememberedDevDevice(): DevDeviceMemory | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DEV_MEMORY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DevDeviceMemory>
      if (parsed?.username) {
        return {
          username: String(parsed.username).trim().toLowerCase(),
          workspaceName: parsed.workspaceName ? String(parsed.workspaceName).trim() : null,
          userId: parsed.userId ? String(parsed.userId) : null,
          rememberedAt: parsed.rememberedAt || new Date().toISOString(),
        }
      }
    }
    const username = window.localStorage.getItem(DEV_LAST_USERNAME_KEY)?.trim().toLowerCase()
    if (!username) return null
    return {
      username,
      workspaceName: window.localStorage.getItem(DEV_LAST_WORKSPACE_KEY)?.trim() || null,
      userId: null,
      rememberedAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function hasDevDeviceMemory(): boolean {
  return !!getRememberedDevDevice()?.username
}

export function clearDevDeviceMemory() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DEV_MEMORY_KEY)
    window.localStorage.removeItem(DEV_LAST_USERNAME_KEY)
    window.localStorage.removeItem(DEV_LAST_WORKSPACE_KEY)
  } catch { /* noop */ }
}
