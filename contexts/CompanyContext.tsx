'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CompanyContextType {
  companyName: string
  companySubtitle: string
  logoUrl: string | null
  timezone: string
  currency: string
  loaded: boolean
  setCompanyName: (name: string) => void
  setCompanySubtitle: (sub: string) => void
  setLogoUrl: (url: string | null) => void
  setTimezone: (tz: string) => void
}

const CompanyContext = createContext<CompanyContextType>({
  companyName: 'SAFFI',
  companySubtitle: 'LUXURY DETAILING',
  logoUrl: null,
  timezone: 'Asia/Dubai',
  currency: 'AED',
  loaded: false,
  setCompanyName: () => {},
  setCompanySubtitle: () => {},
  setLogoUrl: () => {},
  setTimezone: () => {},
})

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyName,    setCompanyName]    = useState('SAFFI')
  const [companySubtitle, setCompanySubtitle] = useState('LUXURY DETAILING')
  const [logoUrl,        setLogoUrl]        = useState<string | null>(null)
  const [timezone,       setTimezone]       = useState('Asia/Dubai')
  const [currency,       setCurrency]       = useState('AED')
  const [loaded,         setLoaded]         = useState(false)

  useEffect(() => {
    const sb = createClient()

    async function load() {
      // Obtener usuario autenticado primero
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoaded(true); return }

      // company_settings filtrado por user_id del tenant actual
      sb.from('company_settings')
        .select('key, value')
        .eq('user_id', user.id)
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

      // business_settings — RLS ya filtra por auth.uid() correctamente
      sb.from('business_settings')
        .select('timezone, currency')
        .maybeSingle()
        .then(({ data }) => {
          if (data?.timezone) setTimezone(data.timezone)
          if (data?.currency) setCurrency(data.currency)
          setLoaded(true)
        })
    }

    load()
  }, [])

  return (
    <CompanyContext.Provider value={{
      companyName, companySubtitle, logoUrl, timezone, currency, loaded,
      setCompanyName, setCompanySubtitle, setLogoUrl, setTimezone,
    }}>
      {children}
    </CompanyContext.Provider>
  )
}

export const useCompany = () => useContext(CompanyContext)