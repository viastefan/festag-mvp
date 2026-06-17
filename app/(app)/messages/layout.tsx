import InboxShell from '@/components/inbox/InboxShell'

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <InboxShell>{children}</InboxShell>
}
