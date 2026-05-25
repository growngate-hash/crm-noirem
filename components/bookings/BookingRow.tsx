'use client'
import StatusBadge from '@/components/ui/StatusBadge'
import { useCompany } from '@/contexts/CompanyContext'

interface BookingRowProps {
  booking: any
  onMarkComplete?: (id: string, price: number, contactId: string) => void
  onDelete?: (id: string) => void
}

export default function BookingRow({ booking, onMarkComplete, onDelete }: BookingRowProps) {
  const { timezone } = useCompany()
  const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`
  const canComplete = ['Pending', 'Confirmed', 'In Progress'].includes(booking.status)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 120px',
      gap: 8,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      alignItems: 'center',
      fontSize: 12,
    }} className="row-hover">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'linear-gradient(135deg, #c9a84c, #8b6914)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#000', flexShrink: 0,
        }}>
          {booking.contacts?.name?.slice(0, 2).toUpperCase() ?? 'NA'}
        </div>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{booking.contacts?.name ?? '—'}</div>
        </div>
      </div>

      <div style={{ color: 'var(--text2)' }}>
        {booking.vehicles ? `${booking.vehicles.make} ${booking.vehicles.model}` : '—'}
        {booking.vehicles?.license_plate && (
          <span style={{ marginLeft: 6, fontSize: 9, background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4, color: 'var(--text2)' }}>
            {booking.vehicles.license_plate}
          </span>
        )}
      </div>

      <div style={{ color: 'var(--text2)' }}>{booking.services?.name ?? '—'}</div>

      <div style={{ color: 'var(--text2)', fontSize: 11 }}>
        {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleDateString('en-AE', { timeZone: timezone, day: '2-digit', month: 'short' }) : '—'}
      </div>

      <div style={{ color: 'var(--text2)' }}>{booking.technician ?? '—'}</div>

      <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{fmt(booking.price ?? 0)}</div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <StatusBadge status={booking.status ?? 'Pending'} />
        {canComplete && onMarkComplete && (
          <button className="btn btn-cyan btn-sm" onClick={() => onMarkComplete(booking.id, booking.price ?? 0, booking.contact_id)}>
            Done
          </button>
        )}
        {onDelete && (
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(booking.id)}>✕</button>
        )}
      </div>
    </div>
  )
}
