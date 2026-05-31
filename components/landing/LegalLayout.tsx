'use client'
import Link from 'next/link'
import type { ReactNode } from 'react'

const S = '#0B2A4A'
const C = '#3DD9D6'
const A = '#F5B544'

interface Section {
  id: string
  title: string
  content: ReactNode
}

interface LegalLayoutProps {
  title: string
  subtitle: string
  updated: string
  sections: Section[]
}

export default function LegalLayout({ title, subtitle, updated, sections }: LegalLayoutProps) {
  return (
    <div style={{ fontFamily: 'var(--font-geist), Geist, -apple-system, sans-serif', background: '#FAFAF7', minHeight: '100vh' }}>

      {/* ── Navbar minimal ─────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #F0EFEA',
        boxShadow: '0 2px 16px rgba(11,42,74,0.05)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/saffi-logo.svg" alt="SAFFI" style={{ width: 22, height: 27 }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: S, letterSpacing: '-0.5px' }}>saffi</span>
          </Link>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 600, color: '#5A5852',
            textDecoration: 'none', padding: '6px 14px', borderRadius: 8,
            border: '1px solid #F0EFEA', transition: 'all 0.15s',
          }}>
            ← Volver al inicio
          </Link>
        </div>
      </nav>

      {/* ── Hero header ────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(160deg, ${S} 0%, #0d3660 60%, #0a2240 100%)`,
        padding: '64px 24px 56px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,217,214,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: C, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
            Legal · SAFFI ERP
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: 'white', margin: '0 0 12px', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
            {title}
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', margin: '0 0 20px', lineHeight: 1.6 }}>{subtitle}</p>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            Última actualización: {updated}
          </span>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 80px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 48, alignItems: 'start' }} className="legal-grid">

        {/* Sidebar ToC */}
        <aside style={{ position: 'sticky', top: 80 }} className="legal-toc">
          <div style={{ background: 'white', border: '1px solid #F0EFEA', borderRadius: 14, padding: '20px 0', boxShadow: '0 2px 8px rgba(11,42,74,0.04)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#A8A6A0', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '0 20px 12px', borderBottom: '1px solid #F0EFEA', marginBottom: 8 }}>
              Contenido
            </div>
            {sections.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} style={{
                display: 'block', padding: '8px 20px', fontSize: 13, fontWeight: 500,
                color: '#5A5852', textDecoration: 'none', borderLeft: `3px solid transparent`,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = S
                e.currentTarget.style.borderLeftColor = C
                e.currentTarget.style.background = '#F8FAFB'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#5A5852'
                e.currentTarget.style.borderLeftColor = 'transparent'
                e.currentTarget.style.background = 'transparent'
              }}>
                <span style={{ color: C, fontWeight: 700, marginRight: 6, fontSize: 11 }}>{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </a>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main>
          {sections.map(s => (
            <div key={s.id} id={s.id} style={{ background: 'white', border: '1px solid #F0EFEA', borderRadius: 16, padding: '32px 36px', marginBottom: 16, boxShadow: '0 2px 8px rgba(11,42,74,0.03)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: S, margin: '0 0 20px', letterSpacing: '-0.3px', paddingBottom: 16, borderBottom: '1px solid #F0EFEA' }}>
                {s.title}
              </h2>
              <div style={{ fontSize: 14, color: '#3A3836', lineHeight: 1.8 }} className="legal-body">
                {s.content}
              </div>
            </div>
          ))}

          {/* Bottom contact card */}
          <div style={{ background: `linear-gradient(135deg, ${S}, #0d3660)`, borderRadius: 16, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 6 }}>¿Tienes alguna pregunta legal?</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Nuestro equipo está disponible para ayudarte.</div>
            </div>
            <a href="mailto:legal@saffi.app" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, color: '#0B1A2A', fontWeight: 700, fontSize: 14, padding: '10px 22px', borderRadius: 8, textDecoration: 'none', boxShadow: '0 4px 12px rgba(245,181,68,0.3)', flexShrink: 0 }}>
              legal@saffi.app
            </a>
          </div>
        </main>
      </div>

      {/* ── Footer minimal ─────────────────────────────────────────────────── */}
      <footer style={{ background: '#07192E', padding: '32px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/saffi-logo-light.svg" alt="SAFFI" style={{ width: 18, height: 22 }} />
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>© 2026 SAFFI ERP. Todos los derechos reservados.</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[['Privacidad', '/privacidad'], ['Términos', '/terminos'], ['Cookies', '/cookies'], ['Seguridad', '/seguridad']].map(([label, href]) => (
              <Link key={href} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{label}</Link>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        .legal-body p { margin: 0 0 14px; }
        .legal-body p:last-child { margin-bottom: 0; }
        .legal-body h3 { font-size: 15px; font-weight: 700; color: ${S}; margin: 24px 0 10px; }
        .legal-body ul, .legal-body ol { padding-left: 20px; margin: 0 0 14px; }
        .legal-body li { margin-bottom: 6px; }
        .legal-body strong { color: ${S}; font-weight: 700; }
        .legal-body a { color: ${C}; text-decoration: none; font-weight: 600; }
        .legal-body a:hover { text-decoration: underline; }
        .legal-body .highlight { background: rgba(61,217,214,0.08); border: 1px solid rgba(61,217,214,0.2); border-radius: 8px; padding: 14px 18px; margin: 16px 0; }
        @media (max-width: 768px) {
          .legal-grid { grid-template-columns: 1fr !important; }
          .legal-toc  { position: static !important; }
        }
      `}</style>
    </div>
  )
}
