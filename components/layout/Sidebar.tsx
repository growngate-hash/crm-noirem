'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Fragment, useEffect, useRef, useState } from 'react'
import { LayoutDashboard, Users, Users2, Wrench, Car, CalendarCheck, DollarSign, BookOpen, BarChart2, Settings, LogOut, User as UserIcon, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/contexts/LanguageContext'
import { useCompany } from '@/contexts/CompanyContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const NAV: { labelKey: TranslationKey; href: string; icon: React.FC<any> }[] = [
  { labelKey: 'dashboard',         href: '/dashboard', icon: LayoutDashboard },
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
      background: '#0B2A4A',
      borderRight: '1px solid rgba(61,217,214,0.15)',
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
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: '1px solid rgba(61,217,214,0.2)', borderRadius: 6, color: '#B8D4ED', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
          <X size={14} />
        </button>
      )}

      {/* Logo */}
      <div style={{ height: 64, padding: '0 16px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid rgba(61,217,214,0.15)', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, overflow: 'hidden',
        }}>
          {logoUrl
            ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            : <svg width="22" height="36" viewBox="-25 -50 50 100"><path d="M 0 -45 C 3 -15, 7 -7, 24 0 C 7 7, 3 15, 0 45 C -3 15, -7 7, -24 0 C -7 -7, -3 -15, 0 -45 Z" fill="#FAFAF7"/><path d="M 0 -18 C 1.5 -6, 3 -2, 10 0 C 3 2, 1.5 6, 0 18 C -1.5 6, -3 2, -10 0 C -3 -2, -1.5 -6, 0 -18 Z" fill="#3DD9D6"/></svg>}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#FAFAF7', letterSpacing: '0.08em' }}>{companyName}</div>
          <div style={{ fontSize: 8, color: '#B8D4ED', letterSpacing: '0.05em', marginTop: 1 }}>{companySubtitle}</div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, minHeight: 0, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV.map(({ labelKey, href, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Fragment key={href}>
              {href === '/finance' && (
                <div style={{ borderTop: '1px solid rgba(61,217,214,0.1)', marginTop: 8, marginBottom: 8 }} />
              )}
              <Link href={href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', paddingLeft: 8, borderRadius: 8,
                fontSize: 13, letterSpacing: '0.2px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#F5B544' : '#B8D4ED',
                background: isActive ? 'rgba(245,181,68,0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #F5B544' : '3px solid transparent',
                textDecoration: 'none', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#FAFAF7' } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#B8D4ED' } }}
              >
                <Icon size={18} color={isActive ? '#F5B544' : '#B8D4ED'} strokeWidth={isActive ? 2 : 1.5} />
                {t(labelKey)}
              </Link>
            </Fragment>
          )
        })}
      </nav>

      {/* Mobile-only logout button — always anchored above user pill */}
      {isMobile && (
        <div style={{
          flexShrink: 0,
          padding: '12px 14px',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid rgba(61,217,214,0.15)',
          background: '#0B2A4A',
        }}>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '12px 14px', borderRadius: 10,
            background: 'transparent', border: '1px solid rgba(217,83,61,0.3)',
            color: '#D9533D', fontSize: 13, fontWeight: 700,
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
            background: '#0B2A4A', border: '1px solid rgba(61,217,214,0.2)',
            borderRadius: 10, overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}>
            <Link href="/settings" onClick={() => setShowMenu(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                fontSize: 12, color: '#B8D4ED', textDecoration: 'none',
                borderBottom: '1px solid rgba(61,217,214,0.1)', transition: 'all 0.1s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#FFFFFF' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#B8D4ED' }}>
              <UserIcon size={13} color="#B8D4ED"/> {t('myProfile')}
            </Link>
            <Link href="/settings" onClick={() => setShowMenu(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                fontSize: 12, color: '#B8D4ED', textDecoration: 'none',
                borderBottom: '1px solid rgba(61,217,214,0.1)', transition: 'all 0.1s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#FFFFFF' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#B8D4ED' }}>
              <Settings size={13} color="#B8D4ED"/> {t('configuration')}
            </Link>
            <button onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: '#D9533D', fontFamily: 'Outfit, sans-serif', textAlign: 'left',
                transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(217,83,61,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <LogOut size={13}/> {t('logOut')}
            </button>
          </div>
        )}

        {/* User pill */}
        <button onClick={() => setShowMenu(v => !v)}
          style={{ width: '100%', padding: '12px 14px', borderTop: '1px solid rgba(61,217,214,0.15)',
            display: 'flex', gap: 10, alignItems: 'center',
            background: showMenu ? 'rgba(255,255,255,0.05)' : 'none',
            border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #3DD9D6, #1A8A87)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff',
          }}>{initials}</div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#FAFAF7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: 9, color: '#B8D4ED', textTransform: 'capitalize' }}>{displayRole}</div>
          </div>
          <span style={{ fontSize: 9, color: '#B8D4ED', flexShrink: 0 }}>{showMenu ? '▴' : '▾'}</span>
        </button>
      </div>
    </div>
    </>
  )
}
