'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserProfile = {
  id: string
  email: string
  full_name: string | null
  role: 'client' | 'dev' | 'admin'
  phone: string | null
  company: string | null
  address_street: string | null
  address_city: string | null
  address_zip: string | null
  address_country: string | null
  age: number | null
  bio: string | null
  avatar_url: string | null
  id_verified: boolean
  id_document_url: string | null
  notif_push: boolean
  notif_email: boolean
  notif_whatsapp: boolean
  whatsapp_number: string | null
  onboarded: boolean
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setLoading(false); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single()
      if (profile) setUser({ ...profile, email: data.session.user.email ?? profile.email })
      setLoading(false)
    })
  }, [])

  const refresh = async () => {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    if (profile) setUser({ ...profile, email: authUser.email ?? profile.email })
  }

  return { user, loading, refresh }
}

export function getDisplayName(user: UserProfile | null, email?: string): string {
  if (user?.full_name && user.full_name.trim()) {
    // First name only if it contains a space
    const first = user.full_name.trim().split(/\s+/)[0]
    return first.charAt(0).toUpperCase() + first.slice(1)
  }
  const source = user?.email ?? email ?? ''
  const prefix = source.split('@')[0].split('.')[0].split(/[0-9]/)[0]
  return prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : 'Gast'
}

export function getFullDisplayName(user: UserProfile | null): string {
  if (user?.full_name && user.full_name.trim()) return user.full_name
  const source = user?.email ?? ''
  const prefix = source.split('@')[0].split('.')[0].split(/[0-9]/)[0]
  return prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : 'Gast'
}

export function getInitials(user: UserProfile | null): string {
  if (user?.full_name && user.full_name.trim()) {
    const parts = user.full_name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (user?.email ?? '??').slice(0, 2).toUpperCase()
}

export function getTimeBasedGreeting(): { short: string; full: string } {
  const h = new Date().getHours()
  if (h < 12) return {
    short: 'Guten Morgen',
    full: 'Guten Morgen — bereit, dein Projekt voranzubringen?',
  }
  if (h < 18) return {
    short: 'Willkommen zurück',
    full: 'Willkommen zurück — lass uns Fortschritt machen.',
  }
  return {
    short: 'Guten Abend',
    full: 'Guten Abend — dein Projekt wartet auf dich.',
  }
}
