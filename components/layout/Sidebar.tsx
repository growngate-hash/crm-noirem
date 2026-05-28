'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LayoutDashboard, Users, Users2, Wrench, Car, CalendarCheck, DollarSign, BookOpen, BarChart2, Settings, LogOut, User as UserIcon, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/contexts/LanguageContext'
import { useCompany } from '@/contexts/CompanyContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const NAV: { labelKey: TranslationKey; href: string; icon: React.FC<any> }[] = [
  { labelKey: 'dashboard',         href: '/',          icon: LayoutDashboard },
  { labelKey: 'contacts',          href: '/contacts',  icon: Users },
  { labelKey: 'servicesInventory', href: '/services',  icon: Wrench },
  { labelKey: 'vehicles',          href: '/vehicles',  icon: Car },
  { labelKey: 'bookings',          href: '/bookings',  icon: CalendarCheck },
  { labelKey: 'hr',                href: '/hr',        icon: Users2 },
  { labelKey: 'finance',           href: '/finance',    icon: DollarSign },
  { labelKey: 'accounting',        href: '/accounting', icon: BookOpen },
  { labelKey: 'reports',           href: '/reports',    icon: BarChart2 },
  { labelKey: 'settings',          href: '/settings',  icon: Settings },
]

interface SidebarProps {
  mobileMenuOpen: boolean
  onClose: () => void
}

export default function Sidebar({ mobileMenuOpen, onClose }: SidebarProps) {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()
  const { companyName, companySubtitle, logoUrl } = useCompany()

  const [authUser, setAuthUser]   = useState<any>(null)
  const [dbRole,   setDbRole]     = useState<string | null>(null)
  const [showMenu, setShowMenu]   = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setAuthUser(user)
      if (user) {
        const { data } = await supabase
          .from('user_permissions')
          .select('role')
          .eq('user_id', user.id)
          .single()
        if (data?.role) {
          const r = data.role
          setDbRole(r.charAt(0).toUpperCase() + r.slice(1))
        }
      }
    }
    load()
  }, [])

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [])

  async function handleLogout() {
    onClose()
    await createClient().auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  const displayName = authUser?.user_metadata?.full_name ?? authUser?.email?.split('@')[0] ?? 'Usuario'
  const displayRole = dbRole ?? authUser?.user_metadata?.role ?? 'Admin'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <>
    {isMobile && mobileMenuOpen && (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 299 }} />
    )}
    <div style={{
      width: 200, minWidth: 200, height: '100dvh',
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      ...(isMobile && {
        position: 'fixed', top: 0, bottom: 0, left: mobileMenuOpen ? 0 : -240,
        height: '100dvh',
        width: 240, minWidth: 240, zIndex: 300,
        transition: 'left 0.25s ease',
        boxShadow: mobileMenuOpen ? '4px 0 24px rgba(0,0,0,0.5)' : 'none',
      }),
    }}>
      {/* Mobile close button */}
      {isMobile && (
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
          <X size={14} />
        </button>
      )}

      {/* Logo */}
      <div style={{ padding: '18px 16px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, background: 'var(--gold)', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, color: '#000', fontSize: 16, flexShrink: 0,
          overflow: 'hidden',
        }}>
          {logoUrl
            ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            : companyName.charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.08em' }}>{companyName}</div>
          <div style={{ fontSize: 8, color: 'var(--text2)', letterSpacing: '0.05em', marginTop: 1 }}>{companySubtitle}</div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, minHeight: 0, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV.map(({ labelKey, href, icon: Icon }) => {
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
              {t(labelKey)}
            </Link>
          )
        })}
      </nav>

      {/* Mobile-only logout button — always anchored above user pill */}
      {isMobile && (
        <div style={{
          flexShrink: 0,
          padding: '12px 14px',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg2)',
        }}>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '12px 14px', borderRadius: 10,
            background: 'transparent', border: '1px solid rgba(255,79,79,0.35)',
            color: '#ff4f4f', fontSize: 13, fontWeight: 700,
            fontFamily: 'Outfit, sans-serif', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            letterSpacing: '0.05em',
          }}>
            <LogOut size={14} /> CERRAR SESIÓN
          </button>
        </div>
      )}

      {/* User footer with dropdown */}
      <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
        {/* Dropdown menu */}
        {showMenu && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 6px)', left: 10, right: 10, zIndex: 300,
            background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, overflow: 'hidden',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
          }}>
            <Link href="/settings" onClick={() => setShowMenu(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                fontSize: 12, color: 'var(--text)', textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <UserIcon size={13} color="var(--text2)"/> {t('myProfile')}
            </Link>
            <Link href="/settings" onClick={() => setShowMenu(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                fontSize: 12, color: 'var(--text)', textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Settings size={13} color="var(--text2)"/> {t('configuration')}
            </Link>
            <button onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: '#ff4f4f', fontFamily: 'Outfit, sans-serif', textAlign: 'left',
                transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,79,79,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <LogOut size={13}/> {t('logOut')}
            </button>
          </div>
        )}

        {/* User pill */}
        <button onClick={() => setShowMenu(v => !v)}
          style={{ width: '100%', padding: '12px 14px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: 10, alignItems: 'center',
            background: showMenu ? 'rgba(255,255,255,0.02)' : 'none',
            border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #c9a84c, #8b6914)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#000',
          }}>{initials}</div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'capitalize' }}>{displayRole}</div>
          </div>
          <span style={{ fontSize: 9, color: 'var(--text2)', flexShrink: 0 }}>{showMenu ? '▴' : '▾'}</span>
        </button>
      </div>
    </div>
    </>
  )
}
