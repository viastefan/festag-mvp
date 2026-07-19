export type FestagLoginMethod = 'google' | 'apple' | 'email' | 'sso' | 'passkey' | 'github'

export type FestagDeviceAccount = {
  userId: string
  email: string | null
  method: FestagLoginMethod
  onboardingCompleted: boolean
  lastSeenAt: string
  workspaceName?: string | null
  /** Personal bits for fast autofill on this device (onboarding, settings, forms). */
  fullName?: string | null
  position?: string | null
  phone?: string | null
}

const MEMORY_KEY = 'festag_device_auth_memory'
const LAST_EMAIL_KEY = 'festag_last_email'
const LAST_METHOD_KEY = 'festag_last_method'
const LAST_WS_KEY = 'festag_last_workspace_name'
const LAST_NAME_KEY = 'festag_last_full_name'
const LAST_POSITION_KEY = 'festag_last_position'
const LAST_PHONE_KEY = 'festag_last_phone'

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
  const existing = memory.accounts.find(item => item.userId === account.userId)
  const nextAccount: FestagDeviceAccount = {
    ...account,
    email: account.email?.trim() || null,
    workspaceName: account.workspaceName?.trim() || existingWorkspaceName(memory, account.userId),
    fullName: account.fullName?.trim() || existing?.fullName || null,
    position: account.position?.trim() || existing?.position || null,
    phone: account.phone?.trim() || existing?.phone || null,
    lastSeenAt: account.lastSeenAt ?? new Date().toISOString(),
  }
  const accounts = [nextAccount, ...memory.accounts.filter(item => item.userId !== account.userId)].slice(0, 6)
  writeMemory({ version: 1, activeUserId: account.userId, accounts })

  if (typeof window === 'undefined') return
  try {
    if (nextAccount.email) window.localStorage.setItem(LAST_EMAIL_KEY, nextAccount.email)
    window.localStorage.setItem(LAST_METHOD_KEY, nextAccount.method)
    if (nextAccount.workspaceName) window.localStorage.setItem(LAST_WS_KEY, nextAccount.workspaceName)
    if (nextAccount.fullName) window.localStorage.setItem(LAST_NAME_KEY, nextAccount.fullName)
    if (nextAccount.position) window.localStorage.setItem(LAST_POSITION_KEY, nextAccount.position)
    if (nextAccount.phone) window.localStorage.setItem(LAST_PHONE_KEY, nextAccount.phone)
  } catch {}
}

function existingWorkspaceName(memory: DeviceMemory, userId: string): string | null {
  return memory.accounts.find(item => item.userId === userId)?.workspaceName?.trim() || null
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
    workspaceName: existing?.workspaceName ?? null,
    fullName: existing?.fullName ?? null,
    position: existing?.position ?? null,
    phone: existing?.phone ?? null,
    lastSeenAt: new Date().toISOString(),
  }
  const accounts = [nextAccount, ...memory.accounts.filter(item => item.userId !== userId)].slice(0, 6)
  writeMemory({ version: 1, activeUserId: userId, accounts })

  if (typeof window === 'undefined') return
  try {
    if (nextEmail) window.localStorage.setItem(LAST_EMAIL_KEY, nextEmail)
    window.localStorage.setItem(LAST_METHOD_KEY, nextAccount.method)
    if (nextAccount.workspaceName) window.localStorage.setItem(LAST_WS_KEY, nextAccount.workspaceName)
  } catch {}
}

/** Persist name / title / phone for device autofill (does not clear unset fields). */
export function rememberPersonalDetails(details: {
  userId?: string | null
  fullName?: string | null
  position?: string | null
  phone?: string | null
}) {
  if (typeof window === 'undefined') return
  const memory = readMemory()
  const userId = details.userId || memory.activeUserId || getLastFestagAccount()?.userId
  const fullName = details.fullName?.trim() || null
  const position = details.position?.trim() || null
  const phone = details.phone?.trim() || null

  try {
    if (fullName) window.localStorage.setItem(LAST_NAME_KEY, fullName)
    if (position) window.localStorage.setItem(LAST_POSITION_KEY, position)
    if (phone) window.localStorage.setItem(LAST_PHONE_KEY, phone)
  } catch {}

  if (!userId) return
  const existing = memory.accounts.find(account => account.userId === userId)
  const nextAccount: FestagDeviceAccount = {
    userId,
    email: existing?.email ?? null,
    method: existing?.method ?? 'email',
    onboardingCompleted: existing?.onboardingCompleted ?? false,
    workspaceName: existing?.workspaceName ?? null,
    fullName: fullName || existing?.fullName || null,
    position: position || existing?.position || null,
    phone: phone || existing?.phone || null,
    lastSeenAt: new Date().toISOString(),
  }
  const accounts = [nextAccount, ...memory.accounts.filter(account => account.userId !== userId)].slice(0, 6)
  writeMemory({ version: 1, activeUserId: userId, accounts })
}

export type RememberedPersonalDetails = {
  fullName: string | null
  position: string | null
  phone: string | null
  email: string | null
}

/** Best-effort personal autofill from this device (account memory + legacy keys). */
export function getRememberedPersonalDetails(): RememberedPersonalDetails {
  if (typeof window === 'undefined') {
    return { fullName: null, position: null, phone: null, email: null }
  }
  try {
    const account = getLastFestagAccount()
    return {
      fullName: account?.fullName?.trim() || window.localStorage.getItem(LAST_NAME_KEY)?.trim() || null,
      position: account?.position?.trim() || window.localStorage.getItem(LAST_POSITION_KEY)?.trim() || null,
      phone: account?.phone?.trim() || window.localStorage.getItem(LAST_PHONE_KEY)?.trim() || null,
      email: account?.email?.trim() || window.localStorage.getItem(LAST_EMAIL_KEY)?.trim() || null,
    }
  } catch {
    return { fullName: null, position: null, phone: null, email: null }
  }
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

export function getLastWorkspaceName(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const fromAccount = getLastFestagAccount()?.workspaceName?.trim() || null
    if (fromAccount) return fromAccount
    const raw = window.localStorage.getItem(LAST_WS_KEY)
    return raw?.trim() || null
  } catch {
    return null
  }
}

export function getLastFestagMethod(): FestagLoginMethod | null {
  if (typeof window === 'undefined') return null
  try {
    const method = getLastFestagAccount()?.method ?? window.localStorage.getItem(LAST_METHOD_KEY)
    return method === 'google' || method === 'apple' || method === 'email' || method === 'sso' || method === 'passkey' || method === 'github' ? method : null
  } catch {
    return null
  }
}

/** True only after a successful Festag session on this device (not a partial click). */
export function hasFestagDeviceAccount(): boolean {
  return getLastFestagAccount() != null
}
