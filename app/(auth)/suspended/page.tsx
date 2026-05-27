'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SuspendedPage() {
  const router = useRouter()

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Outfit,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>

        <div style={{ fontSize: 28, fontWeight: 900, color: '#c9a84c', letterSpacing: '0.1em', marginBottom: 32 }}>SAFFI</div>

        <div style={{ background: '#141416', border: '1px solid rgba(255,79,79,0.2)', borderRadius: 16, padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8', marginBottom: 8 }}>Cuenta suspendida</div>
          <div style={{ fontSize: 14, color: '#888580', lineHeight: 1.7, marginBottom: 24 }}>
            Tu cuenta ha sido suspendida. Por favor contacta a soporte para resolver esta situación.
          </div>
          <a href="mailto:hello@saffi.app?subject=Cuenta suspendida"
            style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 8, background: '#c9a84c', color: '#0d0d0f', fontSize: 14, fontWeight: 700, textDecoration: 'none', marginBottom: 16 }}>
            Contactar soporte
          </a>
          <br/>
          <button onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: '#888580', fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit,sans-serif', textDecoration: 'underline' }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}