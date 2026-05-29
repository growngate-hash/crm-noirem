'use client'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/contexts/LanguageContext'
import NotificationsPanel from '@/components/ui/NotificationsPanel'
import { useIsMobile } from '@/hooks/useIsMobile'

const PAGE_KEY: Record<string, string> = {
  '/':         'dashboard',
  '/contacts': 'contacts',
  '/services': 'servicesInventory',
  '/vehicles': 'vehicles',
  '/bookings': 'bookings',
  '/finance':  'finance',
  '/reports':  'reports',
  '/settings': 'settings',
}

const CURRENCIES = ['AED', 'USD', 'EUR']

interface TopBarProps {
  onMenuOpen: () => void
}

export default function TopBar({ onMenuOpen }: TopBarProps) {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const { lang, setLang, t } = useLanguage()
  const [currency, setCurrency] = useState('AED')
  const [showCurrency, setShowCurrency] = useState(false)
  const currRef = useRef<HTMLDivElement>(null)

  const pageKey = Object.entries(PAGE_KEY).find(([key]) =>
    key === '/' ? pathname === '/' : pathname.startsWith(key)
  )?.[1] ?? 'dashboard'

  const pageLabel = t(pageKey as TranslationKey)

  const todayStr = new Date().toLocaleDateString(lang === 'es' ? 'es-AE' : 'en-AE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (currRef.current && !currRef.current.contains(e.target as Node)) setShowCurrency(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (isMobile) {
    return (
      <div style={{ height: 52, flexShrink: 0, background: '#0B2A4A', borderBottom: '1px solid rgba(61,217,214,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <button onClick={onMenuOpen} style={{ width: 34, height: 34, background: 'transparent', border: '1px solid rgba(61,217,214,0.2)', borderRadius: 8, color: '#B8D4ED', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          ☰
        </button>
        <span style={{ fontWeight: 700, color: '#FAFAF7', fontSize: 15 }}>{pageLabel}</span>
        <NotificationsPanel />
      </div>
    )
  }

  return (
    <div style={{
      height: 64, flexShrink: 0,
      background: '#0B2A4A',
      borderBottom: '1px solid rgba(61,217,214,0.15)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16,
    }}>
      {/* Left: title + date */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FAFAF7', lineHeight: 1.2 }}>{pageLabel}</div>
        <div style={{ fontSize: 12, color: '#B8D4ED', marginTop: 2, textTransform: 'capitalize' }}>{todayStr}</div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Language toggle */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.08)',
          borderRadius: 8, padding: 3, gap: 2,
        }}>
          {(['en', 'es'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600,
                background: lang === l ? '#F5B544' : 'transparent',
                color: lang === l ? '#0B2A4A' : '#B8D4ED',
                fontFamily: 'Outfit, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Currency selector */}
        <div ref={currRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowCurrency(!showCurrency)}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
              padding: '5px 10px', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, color: '#F5B544',
              fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {currency} <span style={{ fontSize: 8 }}>▾</span>
          </button>
          {showCurrency && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, zIndex: 200,
              background: '#0B2A4A', border: '1px solid rgba(61,217,214,0.2)',
              borderRadius: 8, padding: 4, minWidth: 70,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              {CURRENCIES.map(c => (
                <button
                  key={c}
                  onClick={() => { setCurrency(c); setShowCurrency(false) }}
                  style={{
                    display: 'block', width: '100%', padding: '6px 12px',
                    background: c === currency ? 'rgba(245,181,68,0.12)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: 11, fontWeight: 600,
                    color: c === currency ? '#F5B544' : '#B8D4ED',
                    borderRadius: 6, fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification bell */}
        <NotificationsPanel />

      </div>
    </div>
  )
}
