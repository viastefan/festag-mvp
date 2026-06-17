import { redirect } from 'next/navigation'

/** Legacy route — canonical client inbox is /messages (Visibility Layer). */
export default function InboxRedirectPage() {
  redirect('/messages')
}
