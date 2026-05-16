'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CompanyContextType {
  logoUrl: string | null
  setLogoUrl: (url: string | null) => void
}

const CompanyContext = createContext<CompanyContextType>({
  logoUrl: null,
  setLogoUrl: () => {},
})

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    createClient()
      .from('company_settings')
      .select('value')
      .eq('key', 'logo_url')
      .single()
      .then(({ data }) => {
        if (data?.value) setLogoUrl(data.value)
      })
  }, [])

  return (
    <CompanyContext.Provider value={{ logoUrl, setLogoUrl }}>
      {children}
    </CompanyContext.Provider>
  )
}

export const useCompany = () => useContext(CompanyContext)
