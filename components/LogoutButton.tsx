'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={logout}
      style={{
        padding: '7px 14px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      Abmelden
    </button>
  )
}
