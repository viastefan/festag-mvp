export type FestagLoginMethod = 'google' | 'email' | 'sso' | 'passkey' | 'github'

export type FestagDeviceAccount = {
  userId: string
  email: string | null
  method: FestagLoginMethod
  onboardingCompleted: boolean
  lastSeenAt: string
}

const MEMORY_KEY = 'festag_device_auth_memory'
const LAST_EMAIL_KEY = 'festag_last_email'
const LAST_METHOD_KEY = 'festag_last_method'

type DeviceMemory = {
  version: 1
  activeUserId: string | null
  accounts: FestagDeviceAccount[]
}

function emptyMemory(): DeviceMemory {
  return { version: 1, activeUserId: null, accounts: [] }
}

function readMemory(): DeviceMemory {
  if (typeof window === 'undefined') return emptyMemory()
  try {
    const raw = window.localStorage.getItem(MEMORY_KEY)
    if (!raw) return emptyMemory()
    const parsed = JSON.parse(raw) as Partial<DeviceMemory>
    if (!Array.isArray(parsed.accounts)) return emptyMemory()
    return {
      version: 1,
      activeUserId: typeof parsed.activeUserId === 'string' ? parsed.activeUserId : null,
      accounts: parsed.accounts.filter(account => account && typeof account.userId === 'string') as FestagDeviceAccount[],
    }
  } catch {
    return emptyMemory()
  }
}

function writeMemory(memory: DeviceMemory) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(MEMORY_KEY, JSON.stringify(memory))
  } catch {}
}

export function rememberFestagAccount(account: Omit<FestagDeviceAccount, 'lastSeenAt'> & { lastSeenAt?: string }) {
  const memory = readMemory()
  const nextAccount: FestagDeviceAccount = {
    ...account,
    email: account.email?.trim() || null,
    lastSeenAt: account.lastSeenAt ?? new Date().toISOString(),
  }
  const accounts = [nextAccount, ...memory.accounts.filter(item => item.userId !== account.userId)].slice(0, 6)
  writeMemory({ version: 1, activeUserId: account.userId, accounts })

  if (typeof window === 'undefined') return
  try {
    if (nextAccount.email) window.localStorage.setItem(LAST_EMAIL_KEY, nextAccount.email)
    window.localStorage.setItem(LAST_METHOD_KEY, nextAccount.method)
  } catch {}
}

export function rememberFestagEmail(userId: string, email: string | null, method: FestagLoginMethod = 'email') {
  const nextEmail = email?.trim() || null
  const memory = readMemory()
  const existing = memory.accounts.find(account => account.userId === userId)
  const nextAccount: FestagDeviceAccount = {
    userId,
    email: nextEmail,
    method: existing?.method ?? method,
    onboardingCompleted: existing?.onboardingCompleted ?? false,
    lastSeenAt: new Date().toISOString(),
  }
  const accounts = [nextAccount, ...memory.accounts.filter(item => item.userId !== userId)].slice(0, 6)
  writeMemory({ version: 1, activeUserId: userId, accounts })

  if (typeof window === 'undefined') return
  try {
    if (nextEmail) window.localStorage.setItem(LAST_EMAIL_KEY, nextEmail)
    window.localStorage.setItem(LAST_METHOD_KEY, nextAccount.method)
  } catch {}
}

export function getLastFestagAccount(): FestagDeviceAccount | null {
  const memory = readMemory()
  return memory.accounts.find(account => account.userId === memory.activeUserId) ?? memory.accounts[0] ?? null
}

export function getLastFestagEmail(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return getLastFestagAccount()?.email ?? window.localStorage.getItem(LAST_EMAIL_KEY)
  } catch {
    return null
  }
}

export function getLastFestagMethod(): FestagLoginMethod | null {
  if (typeof window === 'undefined') return null
  try {
    const method = getLastFestagAccount()?.method ?? window.localStorage.getItem(LAST_METHOD_KEY)
    return method === 'google' || method === 'email' || method === 'sso' || method === 'passkey' || method === 'github' ? method : null
  } catch {
    return null
  }
}
