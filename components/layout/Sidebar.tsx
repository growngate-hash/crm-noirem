'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Building2, TrendingUp, Calendar, DollarSign, BarChart2, Settings } from 'lucide-react'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/contacts',   label: 'Contacts',     icon: Users },
  { href: '/companies',  label: 'Companies',    icon: Building2 },
  { href: '/deals',      label: 'Deals',        icon: TrendingUp },
  { href: '/finance',    label: 'Finance',      icon: DollarSign },
  { href: '/reports',    label: 'Reports',      icon: BarChart2 },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside style={{ width:228, height:'100vh', flexShrink:0, background:'linear-gradient(180deg,#0D1117,#0B0E11)', borderRight:'1px solid rgba(212,175,55,.11)', display:'flex', flexDirection:'column', padding:'22px 14px' }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 4px', marginBottom:28 }}>
        <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#D4AF37,#8B6914)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:800, color:'#0B0E11', flexShrink:0 }}>N</div>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:'#F0EDE8', letterSpacing:.8 }}>NOIREM</div>
          <div style={{ fontSize:8, color:'#4A4A5A', letterSpacing:2, textTransform:'uppercase' }}>Dubai · Luxury Detailing</div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ display:'flex', flexDirection:'column', gap:2, flex:1 }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href))
          return (
            <Link key={href} href={href} style={{ textDecoration:'none' }}>
              <div className={`ni${active ? ' active' : ''}`}>
                <Icon size={15} color={active ? '#D4AF37' : '#8A8A9A'} strokeWidth={1.8} />
                <span>{label}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Settings + User */}
      <div style={{ borderTop:'1px solid rgba(212,175,55,.08)', paddingTop:14 }}>
        <Link href="/settings" style={{ textDecoration:'none' }}>
          <div className={`ni${path === '/settings' ? ' active' : ''}`} style={{ marginBottom:8 }}>
            <Settings size={15} color={path === '/settings' ? '#D4AF37' : '#8A8A9A'} strokeWidth={1.8} />
            <span>Settings</span>
          </div>
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, background:'rgba(255,255,255,.02)' }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#D4AF37,#8B6914)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#0B0E11', flexShrink:0 }}>N</div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'#F0EDE8' }}>Noirem Admin</div>
            <div style={{ fontSize:9, color:'#4A4A5A' }}>Ops Manager</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
