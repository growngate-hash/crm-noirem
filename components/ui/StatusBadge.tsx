'use client'

const STATUS_CLASS: Record<string, string> = {
  Pending: 'status-pending',
  Confirmed: 'status-confirmed',
  'In Progress': 'status-inprogress',
  Completed: 'status-completed',
  Cancelled: 'status-cancelled',
  Draft: 'status-draft',
  Sent: 'status-sent',
  Paid: 'status-paid',
  Overdue: 'status-overdue',
  Standard: 'tier-standard',
  VIP: 'tier-vip',
  'Ultra-VIP': 'tier-ultravip',
}

export default function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASS[status] ?? 'status-draft'
  return (
    <span className={`badge ${cls}`}>{status}</span>
  )
}
