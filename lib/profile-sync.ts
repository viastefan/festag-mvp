'use client'

export type ProfileSyncPayload = {
  firstName?: string | null
  fullName?: string | null
  avatarUrl?: string | null
  avatarColor?: string | null
  plan?: string | null
}

const PROFILE_SYNC_EVENT = 'festag-profile-sync'
const PROFILE_SYNC_STORAGE_KEY = 'festag-profile-sync'

export function broadcastProfileSync(payload: ProfileSyncPayload) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent(PROFILE_SYNC_EVENT, { detail: payload }))

  try {
    window.localStorage.setItem(
      PROFILE_SYNC_STORAGE_KEY,
      JSON.stringify({ payload, ts: Date.now() }),
    )
  } catch {}
}

export function subscribeProfileSync(listener: (payload: ProfileSyncPayload) => void) {
  if (typeof window === 'undefined') return () => {}

  const onEvent = (event: Event) => {
    const detail = (event as CustomEvent<ProfileSyncPayload>).detail
    if (detail) listener(detail)
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== PROFILE_SYNC_STORAGE_KEY || !event.newValue) return

    try {
      const parsed = JSON.parse(event.newValue) as { payload?: ProfileSyncPayload }
      if (parsed.payload) listener(parsed.payload)
    } catch {}
  }

  window.addEventListener(PROFILE_SYNC_EVENT, onEvent as EventListener)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(PROFILE_SYNC_EVENT, onEvent as EventListener)
    window.removeEventListener('storage', onStorage)
  }
}
