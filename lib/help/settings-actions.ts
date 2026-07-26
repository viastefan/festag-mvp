import { createClient } from '@/lib/supabase/client'

export async function replayWelcomeTour() {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      await sb.from('profiles').update({
        tour_completed_at: null,
        tour_step: 0,
      }).eq('id', user.id)
    }
  } catch { /* ignore */ }
  try {
    window.localStorage.removeItem('festag_tour_completed')
    window.localStorage.setItem('festag_onboarding_status', 'not_started')
  } catch { /* ignore */ }
  window.location.href = '/dashboard?tour=1'
}

export function openSupportEmail() {
  window.location.href = 'mailto:hi@festag.io?subject=Festag%20Support'
}
