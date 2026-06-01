import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sobre Nosotros — SAFFI ERP',
  description: 'Nacimos dentro de un negocio de detailing. Conocemos el car wash y detailing a domicilio por dentro.',
}

const S = '#0B2A4A'
const C = '#3DD9D6'
const A = '#F5B544'

export default function NosotrosPage() {
  const stats = [
    { v: '500+', l: 'negocios operando en la plataforma' },
    { v: '2M+',  l: 'servicios registrados' },
    { v: '12',   l: 'países con presencia' },
    { v: '98%',  l: 'de satisfacción de usuarios' },
  ]

  return (
    <div style={{ fontFamily: 'var(--font-geist), Geist, -apple-system, sans-serif', background: '#FAFAF7', minHeight: '100vh' }}>

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #F0EFEA', boxShadow: '0 2px 16px rgba(11,42,74,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/saffi-logo.svg" alt="SAFFI" style={{ width: 22, height: 27 }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: S, letterSpacing: '-0.5px' }}>saffi</span>
          </Link>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#5A5852', textDecoration: 'none', padding: '6px 14px', borderRadius: 8, border: '1px solid #F0EFEA' }}>
            ← Volver al inicio
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ background: `linear-gradient(160deg, ${S} 0%, #0d3660 60%, #0a2240 100%)`, padding: '64px 24px 56px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,217,214,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: C, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
            Empresa · SAFFI ERP
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: 'white', margin: '0 0 12px', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
            Sobre nosotros
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.6 }}>
            Nacimos dentro de un negocio de detailing. Por eso entendemos el tuyo.
          </p>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Origin */}
        <div style={{ background: 'white', border: '1px solid #F0EFEA', borderRadius: 16, padding: '32px 36px', boxShadow: '0 2px 8px rgba(11,42,74,0.03)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: S, margin: '0 0 20px', letterSpacing: '-0.3px', paddingBottom: 16, borderBottom: '1px solid #F0EFEA' }}>
            Nacimos dentro de un negocio de detailing
          </h2>
          <div style={{ fontSize: 15, color: '#3A3836', lineHeight: 1.85, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0 }}>
              SAFFI no salió de una oficina de software. Salió de la frustración real de gestionar reservas en WhatsApp, cobrar con transferencias sin control, perder clientes por citas olvidadas y no saber cuánto ganabas realmente al final del mes.
            </p>
            <p style={{ margin: 0 }}>
              Conocemos el negocio del car wash y detailing a domicilio por dentro: la logística de moverse entre citas, el inventario que se acaba a mitad de un servicio, el cliente VIP que espera trato personalizado y el técnico que necesita saber su agenda sin llamarte.
            </p>
            <p style={{ margin: 0 }}>
              Por eso construimos el único software diseñado exclusivamente para esta industria. No es un CRM genérico adaptado. No es una hoja de cálculo con stickers. Es una plataforma pensada desde cero para que operes como una empresa profesional — sin importar si eres un detailer independiente o un equipo de 20 personas.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ background: 'white', border: '1px solid #F0EFEA', borderRadius: 16, padding: '32px 36px', boxShadow: '0 2px 8px rgba(11,42,74,0.03)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: S, margin: '0 0 24px', letterSpacing: '-0.3px', paddingBottom: 16, borderBottom: '1px solid #F0EFEA' }}>
            SAFFI en números
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }} className="stats-grid">
            {stats.map(s => (
              <div key={s.v} style={{ background: '#FAFAF7', border: '1px solid #F0EFEA', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: C, letterSpacing: '-1px', flexShrink: 0 }}>{s.v}</div>
                <div style={{ fontSize: 14, color: '#5A5852', lineHeight: 1.4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Promise */}
        <div style={{ background: 'white', border: '1px solid #F0EFEA', borderRadius: 16, padding: '32px 36px', boxShadow: '0 2px 8px rgba(11,42,74,0.03)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: S, margin: '0 0 20px', letterSpacing: '-0.3px', paddingBottom: 16, borderBottom: '1px solid #F0EFEA' }}>
            Nuestra promesa
          </h2>
          <div style={{ background: 'rgba(61,217,214,0.06)', border: '1px solid rgba(61,217,214,0.2)', borderRadius: 10, padding: '18px 22px', marginBottom: 16 }}>
            <p style={{ fontSize: 15, color: S, lineHeight: 1.75, margin: 0, fontWeight: 500 }}>
              Que la tecnología trabaje para ti, no al revés. Cada función que agregamos pasa por una pregunta: ¿esto le ahorra tiempo o dinero a un detailer real? Si la respuesta es no, no entra.
            </p>
          </div>
          <p style={{ fontSize: 15, color: '#3A3836', lineHeight: 1.75, margin: 0 }}>
            Estamos construyendo el estándar operativo de la industria del detailing — y queremos que seas parte.
          </p>
        </div>

        {/* Contact CTA */}
        <div style={{ background: `linear-gradient(135deg, ${S}, #0d3660)`, borderRadius: 16, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 6 }}>¿Preguntas? ¿Ideas?</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Del otro lado hay personas, no bots.</div>
          </div>
          <a href="mailto:hola@saffi.app" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, color: '#0B1A2A', fontWeight: 700, fontSize: 14, padding: '10px 22px', borderRadius: 8, textDecoration: 'none', boxShadow: '0 4px 12px rgba(245,181,68,0.3)', flexShrink: 0 }}>
            hola@saffi.app
          </a>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#07192E', padding: '32px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/saffi-logo-light.svg" alt="SAFFI" style={{ width: 18, height: 22 }} />
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>© 2026 SAFFI ERP. Todos los derechos reservados.</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {([['Privacidad', '/privacidad'], ['Términos', '/terminos'], ['Cookies', '/cookies'], ['Seguridad', '/seguridad']] as [string, string][]).map(([label, href]) => (
              <Link key={href} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{label}</Link>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
