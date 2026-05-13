'use client'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string | number
  color: string
  icon: LucideIcon
  sub?: string
}

export default function KpiCard({ label, value, color, icon: Icon, sub }: KpiCardProps) {
  return (
    <div className="glass" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} strokeWidth={2} />
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
