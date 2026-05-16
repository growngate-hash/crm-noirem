'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type PermOps = { view: boolean; create?: boolean; edit?: boolean; delete?: boolean }
export type Permissions = {
  dashboard: PermOps
  contacts:  PermOps
  services:  PermOps
  vehicles:  PermOps
  bookings:  PermOps
  finance:   PermOps
  reports:   PermOps
  settings:  PermOps
}

export type UserRole = 'admin' | 'manager' | 'technician'

export interface UsePermissionsResult {
  role: UserRole
  permissions: Permissions | null
  loading: boolean
  isAdmin: boolean
  isManager: boolean
  isTechnician: boolean
  currentUserEmail: string
  can: (module: keyof Permissions, action: keyof PermOps) => boolean
}

const TECHNICIAN_DEFAULTS: Permissions = {
  dashboard: { view: true },
  contacts:  { view: false, create: false, edit: false, delete: false },
  services:  { view: false, create: false, edit: false, delete: false },
  vehicles:  { view: true,  create: false, edit: false, delete: false },
  bookings:  { view: true,  create: false, edit: false, delete: false },
  finance:   { view: false, create: false, edit: false, delete: false },
  reports:   { view: false },
  settings:  { view: false, create: false, edit: false, delete: false },
}

export function usePermissions(): UsePermissionsResult {
  const [role, setRole] = useState<UserRole>('technician')
  const [permissions, setPermissions] = useState<Permissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserEmail, setCurrentUserEmail] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await createClient().auth.getUser()
        if (!user) { setLoading(false); return }
        setCurrentUserEmail(user.email ?? '')

        const { data } = await createClient()
          .from('user_permissions')
          .select('role, permissions')
          .eq('user_id', user.id)
          .single()

        if (data) {
          setRole(data.role as UserRole)
          setPermissions(data.permissions as Permissions)
        } else {
          const metaRole = ((user.user_metadata?.role as string) ?? 'technician').toLowerCase() as UserRole
          setRole(metaRole)
          setPermissions(TECHNICIAN_DEFAULTS)
        }
      } catch {
        setPermissions(TECHNICIAN_DEFAULTS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const can = (module: keyof Permissions, action: keyof PermOps): boolean => {
    if (!permissions) return false
    const mod = permissions[module] as Record<string, boolean>
    return !!mod?.[action]
  }

  return {
    role,
    permissions,
    loading,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isTechnician: role === 'technician',
    currentUserEmail,
    can,
  }
}
