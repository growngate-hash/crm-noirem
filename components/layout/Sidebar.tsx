'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Wrench, Car, CalendarCheck, DollarSign, BarChart2, Settings } from 'lucide-react'

const NAV = [
  { label: 'Dashboard',            href: '/',          icon: LayoutDashboard },
  { label: 'Contacts',             href: '/contacts',  icon: Users },
  { label: 'Services & Inventory', href: '/services',  icon: Wrench },
  { label: 'Vehicles',             href: '/vehicles',  icon: Car },
  { label: 'Bookings',             href: '/bookings',  icon: CalendarCheck },
  { label: 'Finance',              href: '/finance',   icon: DollarSign },
  { label: 'Reports',              href: '/reports',   icon: BarChart2 },
  { label: 'Settings',             href: '/settings',  icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div style={{
      width: 200, minWidth: 200, height: '100vh',
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '18px 16px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, background: 'var(--gold)', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, color: '#000', fontSize: 16, flexShrink: 0,
        }}>N</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.08em' }}>NOIREM</div>
          <div style={{ fontSize: 8, color: 'var(--text2)', letterSpacing: '0.05em', marginTop: 1 }}>DUBAI · LUXURY DETAILING</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV.map(({ label, href, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8,
              fontSize: 11, fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--gold)' : 'var(--text2)',
              background: isActive ? 'var(--gold-dim)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--gold-b)' : 'transparent'}`,
              textDecoration: 'none', transition: 'all 0.15s',
            }}>
              <Icon size={14} strokeWidth={isActive ? 2 : 1.5} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #c9a84c, #8b6914)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0,
        }}>AH</div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ahmed Hassan</div>
          <div style={{ fontSize: 9, color: 'var(--text2)' }}>Ops Manager</div>
        </div>
      </div>
    </div>
  )
}
