'use client'

import type { UserProfile } from '@/lib/hooks/useUser'
import { getInitials } from '@/lib/hooks/useUser'

type Props = {
  user: UserProfile | null
  size?: number
  ring?: boolean
}

export default function Avatar({ user, size = 36, ring = false }: Props) {
  const initials = getInitials(user)
  const sizeStyle = { width: size, height: size, fontSize: size * 0.38 }

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.full_name ?? 'Avatar'}
        style={{
          ...sizeStyle,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border: ring ? '2px solid var(--surface)' : '1px solid var(--border)',
          boxShadow: ring ? 'var(--shadow-xs)' : 'none',
        }}
      />
    )
  }

  return (
    <div style={{
      ...sizeStyle,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #F1F5F9, #E2E8F0)',
      border: ring ? '2px solid var(--surface)' : '1px solid var(--border)',
      boxShadow: ring ? 'var(--shadow-xs)' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, color: '#181D1C', flexShrink: 0,
      fontFamily: 'Aeonik, sans-serif', letterSpacing: '-0.02em',
    }}>
      {initials}
    </div>
  )
}
