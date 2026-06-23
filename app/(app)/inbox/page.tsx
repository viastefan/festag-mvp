import { redirect } from 'next/navigation'

/** Legacy route — canonical Benachrichtigungen is /benachrichtigungen. */
export default function InboxRedirectPage() {
  redirect('/benachrichtigungen')
}
