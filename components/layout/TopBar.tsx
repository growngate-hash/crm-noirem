'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/contacts':  'Contacts',
  '/companies': 'Companies',
  '/deals':     'Deals — Pipeline',
  '/finance':   'Finance',
  '/reports':   'Reports',
  '/settings':  'Settings & Configuration',
}

export default function TopBar() {
  const path = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [signingOut, setSigningOut] = useState(false)

  const now = new Date().toLocaleDateString('en-AE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
  const title = TITLES[path] ?? 'Noirem CRM'

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ height:56, flexShrink:0, borderBottom:'1px solid rgba(212,175,55,.07)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 26px' }}>
      <div>
        <div style={{ fontSize:17, fontWeight:700, letterSpacing:.2 }}>{title}</div>
        <div style={{ fontSize:10, color:'#8A8A9A', marginTop:1 }}>{now}</div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span className="badge" style={{ background:'rgba(212,175,55,.12)', color:'#D4AF37' }}>◆ LIVE</span>
        <div style={{ width:1, height:18, background:'rgba(212,175,55,.11)' }} />
        <div style={{ position:'relative', cursor:'pointer' }}>
          <Bell size={16} color="#8A8A9A" strokeWidth={1.8} />
          <div style={{ position:'absolute', top:-2, right:-2, width:7, height:7, borderRadius:'50%', background:'#D4AF37' }} />
        </div>
        <div style={{ width:1, height:18, background:'rgba(212,175,55,.11)' }} />
        <div style={{ fontSize:11, color:'#D4AF37', fontWeight:700 }}>AED ●</div>
        <div style={{ width:1, height:18, background:'rgba(212,175,55,.11)' }} />
        <button onClick={signOut} disabled={signingOut} title="Sign out" style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5, color:'#8A8A9A', fontSize:11, fontFamily:'Montserrat,sans-serif' }}>
          <LogOut size={14} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
