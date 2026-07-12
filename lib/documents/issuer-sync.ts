import type { InvoiceIssuer } from '@/lib/documents/issuer'

export const ISSUER_SYNC_EVENT = 'festag-issuer-sync'

export type IssuerSyncPayload = {
  issuer: InvoiceIssuer
  ready: boolean
}

export function broadcastIssuerSync(payload: IssuerSyncPayload) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ISSUER_SYNC_EVENT, { detail: payload }))
}

export function subscribeIssuerSync(handler: (payload: IssuerSyncPayload) => void) {
  if (typeof window === 'undefined') return () => {}
  const onSync = (event: Event) => {
    const detail = (event as CustomEvent<IssuerSyncPayload>).detail
    if (detail?.issuer) handler(detail)
  }
  window.addEventListener(ISSUER_SYNC_EVENT, onSync)
  return () => window.removeEventListener(ISSUER_SYNC_EVENT, onSync)
}
