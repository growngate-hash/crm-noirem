'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const S = '#0B2A4A'
const C = '#3DD9D6'
const A = '#F5B544'

export default function LandingNavbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const navLinks = [
    { label: 'Funcionalidades', href: '#features' },
    { label: 'Precios', href: '#pricing' },
    { label: 'Cómo funciona', href: '#how' },
  ]

  const navStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    zIndex: 1000,
    height: 64,
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    background: scrolled ? 'rgba(255,255,255,0.97)' : 'white',
    backdropFilter: scrolled ? 'blur(16px)' : 'none',
    borderBottom: `1px solid ${scrolled ? '#F0EFEA' : '#F0EFEA'}`,
    transition: 'background 0.2s, box-shadow 0.2s',
    boxShadow: scrolled ? '0 2px 16px rgba(11,42,74,0.06)' : 'none',
  }

  return (
    <>
      <nav style={navStyle}>
        <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/saffi-logo.svg" alt="SAFFI" style={{ width: 28, height: 34 }} />
            <span style={{ fontSize: 20, fontWeight: 800, color: S, letterSpacing: '-0.5px', fontFamily: 'Geist, sans-serif' }}>
              saffi
            </span>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="landing-desktop-nav">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} style={{
                color: '#5A5852', fontSize: 14, fontWeight: 500,
                textDecoration: 'none', transition: 'color 0.15s',
                fontFamily: 'Geist, sans-serif',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = S)}
              onMouseLeave={e => (e.currentTarget.style.color = '#5A5852')}>
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="landing-desktop-cta">
            <Link href="/login" style={{
              color: S, fontSize: 14, fontWeight: 600,
              textDecoration: 'none', padding: '8px 16px', borderRadius: 8,
              transition: 'background 0.15s', fontFamily: 'Geist, sans-serif',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F0EFEA')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              Iniciar sesión
            </Link>
            <Link href="/register" style={{
              background: A, color: '#0B1A2A',
              fontSize: 14, fontWeight: 700,
              textDecoration: 'none', padding: '9px 20px',
              borderRadius: 8, transition: 'opacity 0.15s',
              fontFamily: 'Geist, sans-serif',
              boxShadow: '0 2px 8px rgba(245,181,68,0.35)',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              Empieza gratis
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'none', background: 'none', border: 'none',
              cursor: 'pointer', color: S, padding: 6,
            }}
            className="landing-mobile-burger"
            aria-label="Menú"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'white',
          display: 'flex', flexDirection: 'column',
          paddingTop: 64,
        }}>
          <div style={{ padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navLinks.map(link => (
              <a key={link.href} href={link.href}
                onClick={() => setOpen(false)}
                style={{
                  color: S, fontSize: 18, fontWeight: 600,
                  textDecoration: 'none', padding: '14px 0',
                  borderBottom: '1px solid #F0EFEA',
                  fontFamily: 'Geist, sans-serif',
                }}>
                {link.label}
              </a>
            ))}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link href="/login" onClick={() => setOpen(false)} style={{
                display: 'block', textAlign: 'center',
                border: `1.5px solid ${S}`, borderRadius: 10,
                padding: '13px 0', color: S, fontWeight: 700,
                fontSize: 15, textDecoration: 'none',
                fontFamily: 'Geist, sans-serif',
              }}>
                Iniciar sesión
              </Link>
              <Link href="/register" onClick={() => setOpen(false)} style={{
                display: 'block', textAlign: 'center',
                background: A, borderRadius: 10,
                padding: '13px 0', color: '#0B1A2A', fontWeight: 700,
                fontSize: 15, textDecoration: 'none',
                fontFamily: 'Geist, sans-serif',
              }}>
                Empieza gratis — 14 días
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .landing-desktop-nav { display: none !important; }
          .landing-desktop-cta { display: none !important; }
          .landing-mobile-burger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
