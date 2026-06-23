import { redirect } from 'next/navigation'

/** Legacy route — canonical Benachrichtigungen is /benachrichtigungen. */
export default function MessagesRedirectPage() {
  redirect('/benachrichtigungen')
}
