'use client'

type Props = {
  status: 'awaiting_confirmation' | 'confirmed' | 'rejected' | 'expired' | 'onboarded'
  devName?: string | null
  devEmail?: string | null
  onReinvite?: () => void
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; pulse?: boolean }> = {
  awaiting_confirmation: { label: 'Wartet auf Bestätigung', color: '#007AFF', bg: '#F0F4FF', pulse: true },
  confirmed: { label: 'Bestätigt', color: '#34C759', bg: '#F0FFF4' },
  rejected: { label: 'Abgelehnt', color: '#8E8E93', bg: '#F7F7F8' },
  expired: { label: 'Abgelaufen', color: '#8E8E93', bg: '#F7F7F8' },
  onboarded: { label: 'Aktiv', color: '#34C759', bg: '#F0FFF4' },
}

export default function InviteStatusPill({ status, devName, devEmail, onReinvite }: Props) {
  const config = STATUS_MAP[status] || STATUS_MAP.awaiting_confirmation

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      height: 30, padding: '0 12px', borderRadius: 15,
      background: config.bg,
      fontFamily: 'var(--font-aeonik, Aeonik, system-ui, sans-serif)',
      fontSize: 12, fontWeight: 500, color: config.color,
      letterSpacing: '0.017em',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 3, background: config.color,
        animation: config.pulse ? 'invite-pulse 2s ease-in-out infinite' : 'none',
      }} />
      <span>{devName || devEmail || '–'}</span>
      <span style={{ color: '#8E8E93' }}>·</span>
      <span>{config.label}</span>
      {status === 'rejected' && onReinvite && (
        <button
          onClick={onReinvite}
          style={{
            background: 'none', border: 'none', color: '#007AFF',
            fontSize: 12, cursor: 'pointer', padding: 0, marginLeft: 4,
          }}
        >
          Erneut einladen
        </button>
      )}
      <style>{`
        @keyframes invite-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
