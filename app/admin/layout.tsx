import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Admin · Saffi' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ minHeight: '100vh', background: '#0B2A4A', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <header style={{
        padding: '16px 32px',
        borderBottom: '1px solid rgba(61,217,214,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Logo */}
          <svg width="16" height="26" viewBox="-25 -50 50 100">
            <path d="M 0 -45 C 3 -15, 7 -7, 24 0 C 7 7, 3 15, 0 45 C -3 15, -7 7, -24 0 C -7 -7, -3 -15, 0 -45 Z" fill="#FAFAF7"/>
            <path d="M 0 -18 C 1.5 -6, 3 -2, 10 0 C 3 2, 1.5 6, 0 18 C -1.5 6, -3 2, -10 0 C -3 -2, -1.5 -6, 0 -18 Z" fill="#3DD9D6"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-geist-sans, sans-serif)', fontSize: 18, fontWeight: 500, color: '#FAFAF7', letterSpacing: '-0.04em' }}>
            saffi
          </span>
          <span style={{
            fontFamily: 'monospace', fontSize: 10, color: '#3DD9D6',
            letterSpacing: '1px', textTransform: 'uppercase',
            background: 'rgba(61,217,214,0.1)', padding: '3px 8px', borderRadius: 4
          }}>
            Admin
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#B8D4ED' }}>
          {user.email}
        </div>
      </header>

      {/* Contenido */}
      <main style={{ flex: 1, padding: '32px' }}>
        {children}
      </main>
    </div>
  )
}