'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      window.location.href = data.session ? '/dashboard' : '/login'
    })
  }, [])

  return null
}
