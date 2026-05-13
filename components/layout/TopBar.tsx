'use client'
import { usePathname } from 'next/navigation'
import { Bell, Settings, Search } from 'lucide-react'

const PAGE_LABELS: Record<string, string> = {
  '/':         'Dashboard',
  '/contacts': 'Contacts',
  '/services': 'Services & Inventory',
  '/vehicles': 'Vehicles',
  '/bookings': 'Bookings',
  '/finance':  'Finance',
  '/reports':  'Reports',
  '/settings': 'Settings',
}

export default function TopBar() {
  const pathname = usePathname()
  const pageLabel = Object.entries(PAGE_LABELS).find(([key]) =>
    key === '/' ? pathname === '/' : pathname.startsWith(key)
  )?.[1] ?? 'Dashboard'

  return (
    <div style={{
      height: 52, flexShrink: 0,
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 16,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>Noirem</span>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: 'var(--text)' }}>{pageLabel}</span>
      </div>

      <div style={{ flex: 1, maxWidth: 340, position: 'relative' }}>
        <Search size={12} color="var(--text2)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input className="inp" placeholder="Search contacts, bookings..." style={{ paddingLeft: 28, fontSize: 11, height: 32, padding: '0 10px 0 28px' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#22c55e' }}>
          <span className="live-dot" />
          LIVE
        </div>

        <select className="inp" style={{ width: 'auto', height: 28, padding: '0 8px', fontSize: 10, cursor: 'pointer' }}>
          <option>EN</option><option>ES</option>
        </select>

        <select className="inp" style={{ width: 'auto', height: 28, padding: '0 8px', fontSize: 10, cursor: 'pointer' }}>
          <option>AED</option><option>USD</option>
        </select>

        <Bell size={15} color="var(--text2)" style={{ cursor: 'pointer' }} />
        <Settings size={15} color="var(--text2)" style={{ cursor: 'pointer' }} />
      </div>
    </div>
  )
}
