'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CompanyContextType {
  companyName: string
  companySubtitle: string
  logoUrl: string | null
  setCompanyName: (name: string) => void
  setCompanySubtitle: (sub: string) => void
  setLogoUrl: (url: string | null) => void
}

const CompanyContext = createContext<CompanyContextType>({
  companyName: 'SAFFI',
  companySubtitle: 'LUXURY DETAILING',
  logoUrl: null,
  setCompanyName: () => {},
  setCompanySubtitle: () => {},
  setLogoUrl: () => {},
})

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyName, setCompanyName] = useState('SAFFI')
  const [companySubtitle, setCompanySubtitle] = useState('LUXURY DETAILING')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    createClient()
      .from('company_settings')
      .select('key, value')
      .in('key', ['company_name', 'company_subtitle', 'logo_url'])
      .then(({ data }) => {
        data?.forEach(row => {
          if (row.key === 'company_name' && row.value)
            setCompanyName(row.value.toUpperCase())
          if (row.key === 'company_subtitle' && row.value)
            setCompanySubtitle(row.value.toUpperCase())
          if (row.key === 'logo_url' && row.value)
            setLogoUrl(row.value)
        })
      })
  }, [])

  return (
    <CompanyContext.Provider value={{
      companyName, companySubtitle, logoUrl,
      setCompanyName, setCompanySubtitle, setLogoUrl,
    }}>
      {children}
    </CompanyContext.Provider>
  )
}

export const useCompany = () => useContext(CompanyContext)
