'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/Topbar'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { CompanyProvider } from '@/contexts/CompanyContext'
import { PlanProvider } from '@/contexts/PlanContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login')
      else setReady(true)
    })
  }, [router])

  if (!ready) {
    return (
      <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: 'var(--gold)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', fontSize: 16 }}>S</div>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <CompanyProvider>
      <PlanProvider>
      <LanguageProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
          <Sidebar mobileMenuOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <TopBar onMenuOpen={() => setMobileMenuOpen(true)} />
            <div className="scroll main-content" style={{ flex: 1 }}>{children}</div>
          </div>
        </div>
      </LanguageProvider>
      </PlanProvider>
    </CompanyProvider>
  )
}
