'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Plan } from '@/types'
import { hasFeature as _hasFeature } from '@/lib/plan-features'
import type { Feature } from '@/lib/plan-features'

interface PlanContextType {
  plan:       Plan
  tenantId:   string | null
  loaded:     boolean
  hasFeature: (feature: Feature) => boolean
}

const PlanContext = createContext<PlanContextType>({
  plan:       'trial',
  tenantId:   null,
  loaded:     false,
  hasFeature: () => true,
})

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan,     setPlan]     = useState<Plan>('trial')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loaded,   setLoaded]   = useState(false)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoaded(true); return }
      sb.from('tenants')
        .select('id, plan')
        .eq('owner_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.plan) setPlan(data.plan as Plan)
          if (data?.id)   setTenantId(data.id)
          setLoaded(true)
        })
    })
  }, [])

  return (
    <PlanContext.Provider value={{
      plan,
      tenantId,
      loaded,
      hasFeature: (f: Feature) => _hasFeature(plan, f),
    }}>
      {children}
    </PlanContext.Provider>
  )
}

export const usePlan = () => useContext(PlanContext)
