const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  intake:   { label: 'Intake',    color: '#92400E', bg: '#FEF3C7' },
  planning: { label: 'Planning',  color: '#1D4ED8', bg: '#DBEAFE' },
  active:   { label: 'Active',    color: '#065F46', bg: '#D1FAE5' },
  done:     { label: 'Done',      color: '#374151', bg: '#F3F4F6' },
  todo:     { label: 'To Do',     color: '#6B7280', bg: '#F3F4F6' },
  doing:    { label: 'In Progress', color: '#1D4ED8', bg: '#DBEAFE' },
}

export default function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, color: '#374151', bg: '#F3F4F6' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      color: cfg.color,
      background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  )
}
