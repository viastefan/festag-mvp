import { randomBytes } from 'crypto'
import type { ProofCapsule } from '@/lib/proof/types'
import type { DeliveryPulse } from '@/lib/pulse/types'

export type ClientMomentBranding = {
  clientName: string
  brandColor: string
  logoUrl: string | null
  agencyName: string | null
  poweredByFestag: boolean
}

export type ClientMomentSnapshot = {
  title: string
  scope: 'overall' | 'project'
  projectId: string | null
  pulse: Pick<DeliveryPulse, 'progress' | 'risk' | 'next_step' | 'health' | 'generatedAt'>
  proof: ProofCapsule[]
  summary: string | null
  branding: ClientMomentBranding
  expiresAt: string | null
  createdAt: string
}

export function newMomentToken(): string {
  return randomBytes(18).toString('base64url')
}

export function isMomentActive(row: {
  revoked_at?: string | null
  expires_at?: string | null
}): boolean {
  if (row.revoked_at) return false
  if (row.expires_at) {
    const t = Date.parse(row.expires_at)
    if (!Number.isNaN(t) && t < Date.now()) return false
  }
  return true
}
