import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isMobileUserAgent } from '@/lib/is-mobile-user-agent'
import EnterMobileClient from './EnterMobileClient'

/**
 * Auth entry chooser.
 *
 * Mobile (≤768px): Client / Developer toggle sheet.
 * Desktop: server redirect to /login — avoids an invisible SSR shell that
 * Vercel previews and no-JS clients would otherwise capture as a blank page.
 */
export default function EnterPage() {
  const ua = headers().get('user-agent') ?? ''
  if (!isMobileUserAgent(ua)) redirect('/login')
  return <EnterMobileClient />
}
