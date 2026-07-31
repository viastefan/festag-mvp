import { redirect } from 'next/navigation'

/**
 * Legacy Client | Developer chooser — removed.
 * Bookmarks / PWA start_url land on unified auth.
 */
export default function LegacyEnterRedirect() {
  redirect('/login')
}
